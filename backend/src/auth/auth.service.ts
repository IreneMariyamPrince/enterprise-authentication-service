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
import { UAParser } from 'ua-parser-js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService, 
    private jwtService: JwtService,
    private mailService: MailService
  ) {}

  async register(dto: RegisterDto, userAgent?: string, ipAddress?: string) {
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

    return this.generateTokens(user.id, userAgent, ipAddress);
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
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

    console.log('[AUDIT] User logged in', { userId: user.id, email: user.email, ipAddress });

    return this.generateTokens(user.id, userAgent, ipAddress);
  }

  async logout(userId: string, sessionId: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() }
    });

    console.log('[AUDIT] User logged out', { userId, sessionId });

    return { success: true };
  }

  async refresh(userId: string, refreshToken: string, sessionId: string, userAgent?: string, ipAddress?: string) {
    // Delete globally expired sessions automatically
    await this.prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });

    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
      throw new UnauthorizedException('Invalid session');
    }

    if (session.revokedAt) {
      throw new UnauthorizedException('Session has been revoked');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session has expired');
    }

    const isValid = await argon2.verify(session.refreshTokenHash, refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Update lastActiveAt
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() }
    });

    // Instead of reusing the old refresh token, we generate new tokens and create a new session
    // and revoke the old one (Refresh Token Rotation). Or we could just issue a new access token.
    // The requirements say: "Update lastActiveAt. Reject revoked sessions. Reject expired sessions."
    // Let's generate a new Access Token and return the existing Refresh Token, keeping the session active.

    const userWithRoles = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } }
      }
    });

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
      email: userWithRoles?.email,
      roles,
      permissions: Array.from(permissions),
      sessionId
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'your-access-token-secret-key',
      expiresIn: (process.env.JWT_ACCESS_EXPIRATION || '15m') as any,
    });

    return {
      accessToken,
      refreshToken, // Returning the same refresh token
    };
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
    await this.prisma.session.updateMany({ 
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    console.log('[AUDIT] User reset password (all sessions revoked)', { userId: record.userId });

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

  private async generateTokens(userId: string, userAgent?: string, ipAddress?: string) {
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

    // Parse User Agent
    const parser = new UAParser(userAgent || '');
    const browser = parser.getBrowser().name || 'Unknown Browser';
    const os = parser.getOS().name || 'Unknown OS';
    const deviceName = parser.getDevice().model ? `${parser.getDevice().model} (${os})` : `${os} on ${browser}`;

    // Generate Session ID upfront
    const sessionId = crypto.randomUUID();

    const payload = {
      sub: userId,
      email: userEmail,
      roles,
      permissions: Array.from(permissions),
      sessionId
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
        { sub: userId, sessionId }, // Include sessionId in refresh token to bind it
        {
          secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret-key',
          expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '30d') as any,
        },
      ),
    ]);

    const refreshTokenHash = await argon2.hash(refreshToken);
    
    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        refreshTokenHash,
        deviceName,
        browser,
        os,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
