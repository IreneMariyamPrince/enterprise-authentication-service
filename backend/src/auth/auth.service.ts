import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService, 
    private jwtService: JwtService,
    private mailService: MailService
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) {
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash,
      },
    });

    const userRole = await this.prisma.role.findUnique({ where: { name: 'User' } });
    if (userRole) {
      await this.prisma.userRole.create({
        data: { userId: user.id, roleId: userRole.id }
      });
    }

    const verifyToken = await this.createHashedTokenRecord(user.id, 'VERIFICATION');
    await this.mailService.sendVerificationEmail(user, verifyToken);

    return this.generateTokens(user.id);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    const passwordMatches = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user.id);
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
    return { success: true };
  }

  async refresh(userId: string, refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });

    const tokens = await this.prisma.refreshToken.findMany({ where: { userId, isRevoked: false } });
    let validTokenFound = false;
    for (const token of tokens) {
      if (await argon2.verify(token.hashedToken, refreshToken)) {
        validTokenFound = true;
        break;
      }
    }
    
    if (!validTokenFound) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.generateTokens(userId);
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const { tokenId, rawSecret } = this.parseToken(dto.token);

    const record = await this.prisma.verificationToken.findUnique({ where: { id: tokenId } });
    if (!record) throw new BadRequestException('Invalid or expired token');

    if (record.expiresAt < new Date()) {
      await this.prisma.verificationToken.delete({ where: { id: tokenId } });
      throw new BadRequestException('Token has expired');
    }

    const isValid = await argon2.verify(record.hashedToken, rawSecret);
    if (!isValid) throw new BadRequestException('Invalid token');

    await this.prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    });

    await this.prisma.verificationToken.deleteMany({ where: { userId: record.userId } });

    return { success: true, message: 'Email successfully verified' };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return { success: true }; 

    if (user.emailVerified) throw new BadRequestException('Email is already verified');

    await this.prisma.verificationToken.deleteMany({ where: { userId: user.id } });

    const verifyToken = await this.createHashedTokenRecord(user.id, 'VERIFICATION');
    await this.mailService.sendVerificationEmail(user, verifyToken);

    return { success: true, message: 'If the email exists, a verification link has been sent' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return { success: true, message: 'If the email exists, a reset link has been sent' };

    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const resetToken = await this.createHashedTokenRecord(user.id, 'RESET');
    await this.mailService.sendPasswordResetEmail(user, resetToken);

    return { success: true, message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { tokenId, rawSecret } = this.parseToken(dto.token);

    const record = await this.prisma.passwordResetToken.findUnique({ where: { id: tokenId } });
    if (!record) throw new BadRequestException('Invalid or expired token');

    if (record.expiresAt < new Date()) {
      await this.prisma.passwordResetToken.delete({ where: { id: tokenId } });
      throw new BadRequestException('Token has expired');
    }

    const isValid = await argon2.verify(record.hashedToken, rawSecret);
    if (!isValid) throw new BadRequestException('Invalid token');

    const passwordHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });

    await this.prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } });
    await this.prisma.refreshToken.deleteMany({ where: { userId: record.userId } });

    return { success: true, message: 'Password successfully reset' };
  }

  async getPermissions(userId: string) {
    const userWithRoles = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true }
                }
              }
            }
          }
        }
      }
    });

    if (!userWithRoles) throw new NotFoundException('User not found');

    const permissions = new Set<string>();
    for (const userRole of userWithRoles.roles) {
      for (const rolePerm of userRole.role.permissions) {
        permissions.add(rolePerm.permission.name);
      }
    }

    return Array.from(permissions);
  }

  private parseToken(base64Token: string) {
    try {
      const decoded = Buffer.from(base64Token, 'base64url').toString('utf8');
      const [tokenId, rawSecret] = decoded.split(':');
      if (!tokenId || !rawSecret) throw new Error();
      return { tokenId, rawSecret };
    } catch {
      throw new BadRequestException('Invalid token format');
    }
  }

  private async createHashedTokenRecord(userId: string, type: 'VERIFICATION' | 'RESET') {
    const rawSecret = crypto.randomBytes(32).toString('hex');
    const hashedToken = await argon2.hash(rawSecret);
    const expiresAt = type === 'VERIFICATION' 
        ? new Date(Date.now() + 24 * 60 * 60 * 1000) 
        : new Date(Date.now() + 15 * 60 * 1000);
    
    let tokenId;
    if (type === 'VERIFICATION') {
      const record = await this.prisma.verificationToken.create({
        data: { hashedToken, userId, expiresAt }
      });
      tokenId = record.id;
    } else {
      const record = await this.prisma.passwordResetToken.create({
        data: { hashedToken, userId, expiresAt }
      });
      tokenId = record.id;
    }

    return Buffer.from(`${tokenId}:${rawSecret}`).toString('base64url');
  }

  private async generateTokens(userId: string) {
    const userWithRoles = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true }
                }
              }
            }
          }
        }
      }
    });

    const userEmail = userWithRoles?.email || '';
    const roles = userWithRoles?.roles.map(ur => ur.role.name) || [];
    const permissions = new Set<string>();
    
    if (userWithRoles) {
      for (const userRole of userWithRoles.roles) {
        for (const rolePerm of userRole.role.permissions) {
          permissions.add(rolePerm.permission.name);
        }
      }
    }

    const payload = {
      sub: userId,
      email: userEmail,
      roles,
      permissions: Array.from(permissions)
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        payload,
        {
          secret: process.env.JWT_ACCESS_SECRET || 'your-access-token-secret-key',
          expiresIn: (process.env.JWT_ACCESS_EXPIRATION || '15m') as any,
        },
      ),
      this.jwtService.signAsync(
        { sub: userId }, // Keep refresh token simple
        {
          secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret-key',
          expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '30d') as any,
        },
      ),
    ]);

    const hashedRefreshToken = await argon2.hash(refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        hashedToken: hashedRefreshToken,
        userId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
