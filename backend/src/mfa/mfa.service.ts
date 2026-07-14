import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

@Injectable()
export class MfaService {
  private encryptionKey: Buffer;

  constructor(private prisma: PrismaService) {
    const keyString = process.env.MFA_ENCRYPTION_KEY || 'default-secret-key-must-be-32-chars';
    this.encryptionKey = crypto.scryptSync(keyString, 'salt', 32);
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${encrypted}:${authTag}`;
  }

  private decrypt(text: string): string {
    const [ivHex, encryptedHex, authTagHex] = text.split(':');
    if (!ivHex || !encryptedHex || !authTagHex) throw new Error('Invalid encrypted format');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private async generateRecoveryCodes(): Promise<{ plain: string[], hashed: string[] }> {
    const plain = [];
    const hashed = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 chars
      plain.push(code);
      hashed.push(await argon2.hash(code));
    }
    return { plain, hashed };
  }

  private checkLockout(mfa: any) {
    if (mfa.lockedUntil && mfa.lockedUntil > new Date()) {
      throw new ForbiddenException(`MFA is locked due to too many failed attempts. Try again after ${mfa.lockedUntil.toLocaleString()}`);
    }
  }

  private async handleFailedAttempt(mfa: any) {
    const failedAttempts = mfa.failedAttempts + 1;
    let lockedUntil = null;
    if (failedAttempts >= 5) {
      lockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    }
    await this.prisma.userMfa.update({
      where: { id: mfa.id },
      data: { failedAttempts, lockedUntil }
    });
    if (lockedUntil) {
      throw new ForbiddenException(`MFA locked for 10 minutes due to 5 failed attempts.`);
    } else {
      throw new UnauthorizedException('Invalid MFA code');
    }
  }

  async getMfaStatus(userId: string) {
    let mfa = await this.prisma.userMfa.findUnique({ where: { userId } });
    if (!mfa) {
      mfa = await this.prisma.userMfa.create({ data: { userId } });
    }
    return {
      enabled: mfa.enabled,
      emailOtpEnabled: mfa.emailOtpEnabled,
      lastVerifiedAt: mfa.lastVerifiedAt,
      failedAttempts: mfa.failedAttempts,
      lockedUntil: mfa.lockedUntil,
    };
  }

  async setupMfa(userId: string, email: string) {
    let mfa = await this.prisma.userMfa.findUnique({ where: { userId } });
    if (!mfa) {
      mfa = await this.prisma.userMfa.create({ data: { userId } });
    }
    if (mfa.enabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: 'AuthSphere',
      label: email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret
    });

    const otpauthUrl = totp.toString();
    const qrCode = await QRCode.toDataURL(otpauthUrl);
    const encryptedSecret = this.encrypt(secret.base32);

    await this.prisma.userMfa.update({
      where: { id: mfa.id },
      data: { encryptedSecret }
    });

    return { secret: secret.base32, qrCode, otpauthUrl };
  }

  async enableMfa(userId: string, code: string) {
    const mfa = await this.prisma.userMfa.findUnique({ where: { userId } });
    if (!mfa || !mfa.encryptedSecret) {
      throw new BadRequestException('MFA setup not initiated');
    }
    if (mfa.enabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    this.checkLockout(mfa);

    const secretStr = this.decrypt(mfa.encryptedSecret);
    const totp = new OTPAuth.TOTP({
      issuer: 'AuthSphere',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretStr)
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      await this.handleFailedAttempt(mfa);
    }

    const recovery = await this.generateRecoveryCodes();

    await this.prisma.userMfa.update({
      where: { id: mfa.id },
      data: { 
        enabled: true, 
        backupCodesHash: recovery.hashed,
        failedAttempts: 0,
        lockedUntil: null,
        lastVerifiedAt: new Date()
      }
    });

    console.log('[AUDIT] MFA_ENABLED', { userId });

    return { recoveryCodes: recovery.plain };
  }

  async verifyMfa(userId: string, code: string) {
    const mfa = await this.prisma.userMfa.findUnique({ where: { userId } });
    if (!mfa || !mfa.enabled || !mfa.encryptedSecret) {
      throw new BadRequestException('MFA is not enabled');
    }

    this.checkLockout(mfa);

    const secretStr = this.decrypt(mfa.encryptedSecret);
    const totp = new OTPAuth.TOTP({
      issuer: 'AuthSphere',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretStr)
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      await this.handleFailedAttempt(mfa);
    }

    await this.prisma.userMfa.update({
      where: { id: mfa.id },
      data: { failedAttempts: 0, lockedUntil: null, lastVerifiedAt: new Date() }
    });

    console.log('[AUDIT] MFA_VERIFIED', { userId });
    return true;
  }

  async disableMfa(userId: string) {
    const mfa = await this.prisma.userMfa.findUnique({ where: { userId } });
    if (!mfa || !mfa.enabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    await this.prisma.userMfa.update({
      where: { id: mfa.id },
      data: { 
        enabled: false, 
        encryptedSecret: null, 
        backupCodesHash: Prisma.DbNull,
        failedAttempts: 0,
        lockedUntil: null
      }
    });

    console.log('[AUDIT] MFA_DISABLED', { userId });
    return { success: true };
  }

  async useRecoveryCode(userId: string, code: string) {
    const mfa = await this.prisma.userMfa.findUnique({ where: { userId } });
    if (!mfa || !mfa.enabled || !mfa.backupCodesHash) {
      throw new BadRequestException('MFA or recovery codes not available');
    }

    this.checkLockout(mfa);

    const hashedCodes = mfa.backupCodesHash as string[];
    let validCodeIndex = -1;

    for (let i = 0; i < hashedCodes.length; i++) {
      if (await argon2.verify(hashedCodes[i], code)) {
        validCodeIndex = i;
        break;
      }
    }

    if (validCodeIndex === -1) {
      await this.handleFailedAttempt(mfa);
    }

    // Remove the used code
    hashedCodes.splice(validCodeIndex, 1);

    await this.prisma.userMfa.update({
      where: { id: mfa.id },
      data: { 
        backupCodesHash: hashedCodes,
        failedAttempts: 0, 
        lockedUntil: null, 
        lastVerifiedAt: new Date() 
      }
    });

    console.log('[AUDIT] RECOVERY_CODE_USED', { userId, remaining: hashedCodes.length });
    return true;
  }

  async regenerateRecoveryCodes(userId: string) {
    const mfa = await this.prisma.userMfa.findUnique({ where: { userId } });
    if (!mfa || !mfa.enabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    // Password confirmation should have been done in controller before calling this
    const recovery = await this.generateRecoveryCodes();
    
    await this.prisma.userMfa.update({
      where: { id: mfa.id },
      data: { backupCodesHash: recovery.hashed }
    });

    console.log('[AUDIT] RECOVERY_CODES_REGENERATED', { userId });
    return { recoveryCodes: recovery.plain };
  }

  async getRecoveryCodesStatus(userId: string) {
    const mfa = await this.prisma.userMfa.findUnique({ where: { userId } });
    if (!mfa || !mfa.enabled) {
      throw new BadRequestException('MFA is not enabled');
    }
    const hashedCodes = (mfa.backupCodesHash as string[]) || [];
    return { remaining: hashedCodes.length };
  }

  // Admin function
  async adminResetMfa(targetUserId: string) {
    const mfa = await this.prisma.userMfa.findUnique({ where: { userId: targetUserId } });
    if (!mfa) return { success: true };
    
    await this.prisma.userMfa.update({
      where: { id: mfa.id },
      data: {
        enabled: false,
        encryptedSecret: null,
        backupCodesHash: Prisma.DbNull,
        failedAttempts: 0,
        lockedUntil: null
      }
    });

    console.log('[AUDIT] MFA_DISABLED by Admin', { targetUserId });
    return { success: true };
  }
}
