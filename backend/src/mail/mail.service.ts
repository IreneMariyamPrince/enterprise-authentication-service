import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { User } from '@prisma/client';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendVerificationEmail(user: User, token: string) {
    const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Welcome to AuthSphere! Confirm your Email',
      template: './verification',
      context: {
        name: user.firstName,
        url,
      },
    });
  }

  async sendPasswordResetEmail(user: User, token: string) {
    const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Reset your password - AuthSphere',
      template: './reset-password',
      context: {
        name: user.firstName,
        url,
      },
    });
  }
}
