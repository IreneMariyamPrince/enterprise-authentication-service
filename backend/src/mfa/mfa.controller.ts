import { Controller, Get, Post, Body, UseGuards, Req, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { MfaService } from './mfa.service';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtMfaGuard } from '../auth/guards/jwt-mfa.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EnableMfaDto } from './dto/enable-mfa.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { DisableMfaDto } from './dto/disable-mfa.dto';
import { RecoveryCodeDto } from './dto/recovery-code.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import * as argon2 from 'argon2';

@ApiTags('mfa')
@Controller('mfa')
export class MfaController {
  constructor(
    private readonly mfaService: MfaService,
    private readonly authService: AuthService,
    private readonly prisma: PrismaService
  ) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current MFA status' })
  async getStatus(@CurrentUser() user: any) {
    return this.mfaService.getMfaStatus(user.id);
  }

  @Post('setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate MFA setup (returns QR code)' })
  async setup(@CurrentUser() user: any) {
    return this.mfaService.setupMfa(user.id, user.email);
  }

  @Post('enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable MFA with TOTP code' })
  async enable(@CurrentUser() user: any, @Body() dto: EnableMfaDto) {
    return this.mfaService.enableMfa(user.id, dto.code);
  }

  @Post('disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable MFA (requires password)' })
  async disable(@CurrentUser() user: any, @Body() dto: DisableMfaDto) {
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) throw new UnauthorizedException('User not found');
    const passwordMatches = await argon2.verify(dbUser.passwordHash, dto.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid password');
    }
    return this.mfaService.disableMfa(user.id);
  }

  @Get('recovery-codes/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get remaining recovery codes count' })
  async getRecoveryCodesStatus(@CurrentUser() user: any) {
    return this.mfaService.getRecoveryCodesStatus(user.id);
  }

  @Post('regenerate-backup-codes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate recovery codes (requires password)' })
  async regenerateBackupCodes(@CurrentUser() user: any, @Body() dto: DisableMfaDto) {
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) throw new UnauthorizedException('User not found');
    const passwordMatches = await argon2.verify(dbUser.passwordHash, dto.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid password');
    }
    return this.mfaService.regenerateRecoveryCodes(user.id);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtMfaGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify TOTP during login flow' })
  async verify(@CurrentUser() user: any, @Body() dto: VerifyMfaDto, @Req() req: Request) {
    try {
      await this.mfaService.verifyMfa(user.id, dto.code);
    } catch (err) {
      console.log('[AUDIT] MFA_LOGIN_FAILURE', { userId: user.id });
      throw err;
    }
    const userAgent = req.headers['user-agent'] as string;
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.authService.completeMfaLogin(user.id, userAgent, ipAddress);
  }

  @Post('recovery')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtMfaGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify recovery code during login flow' })
  async recovery(@CurrentUser() user: any, @Body() dto: RecoveryCodeDto, @Req() req: Request) {
    try {
      await this.mfaService.useRecoveryCode(user.id, dto.code);
    } catch (err) {
      console.log('[AUDIT] MFA_LOGIN_FAILURE', { userId: user.id });
      throw err;
    }
    const userAgent = req.headers['user-agent'] as string;
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.authService.completeMfaLogin(user.id, userAgent, ipAddress);
  }
}
