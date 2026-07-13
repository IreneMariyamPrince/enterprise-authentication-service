import { Module, forwardRef } from '@nestjs/common';
import { MfaService } from './mfa.service';
import { MfaController } from './mfa.controller';
import { AdminMfaController } from './admin-mfa.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [MfaController, AdminMfaController],
  providers: [MfaService],
  exports: [MfaService],
})
export class MfaModule {}
