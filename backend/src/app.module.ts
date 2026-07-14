import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { UserRolesModule } from './user-roles/user-roles.module';
import { UsersModule } from './users/users.module';
import { SessionModule } from './session/session.module';
import { MfaModule } from './mfa/mfa.module';

@Module({
  imports: [PrismaModule, MailModule, AuthModule, RolesModule, PermissionsModule, UserRolesModule, UsersModule, SessionModule, MfaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
