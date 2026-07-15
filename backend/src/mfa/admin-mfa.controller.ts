import { Controller, Post, Param, UseGuards, Get } from '@nestjs/common';
import { MfaService } from './mfa.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('admin-mfa')
@Controller('admin/users/:id/mfa')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Super Admin')
@ApiBearerAuth()
export class AdminMfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Get()
  @ApiOperation({ summary: 'Admin view of user MFA status' })
  async getUserMfaStatus(@Param('id') targetUserId: string) {
    return this.mfaService.getMfaStatus(targetUserId);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Admin force-disables MFA for a user' })
  async resetUserMfa(@Param('id') targetUserId: string) {
    return this.mfaService.adminResetMfa(targetUserId);
  }
}
