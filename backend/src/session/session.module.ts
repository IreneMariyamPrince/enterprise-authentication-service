import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { AdminSessionController } from './admin-session.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SessionController, AdminSessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
