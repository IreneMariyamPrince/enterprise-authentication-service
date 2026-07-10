import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

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

    return this.generateTokens(user.id);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
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

  private async generateTokens(userId: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId },
        {
          secret: process.env.JWT_ACCESS_SECRET || 'your-access-token-secret-key',
          expiresIn: (process.env.JWT_ACCESS_EXPIRATION || '15m') as any,
        },
      ),
      this.jwtService.signAsync(
        { sub: userId },
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
