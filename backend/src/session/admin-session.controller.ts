import { Controller, Param, UseGuards, Delete, Get } from '@nestjs/common';
import { SessionService } from './session.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('admin-sessions')
@Controller('admin/users/:id/sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Super Admin') // Only Super Admin can inspect/revoke
@ApiBearerAuth()
export class AdminSessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  @ApiOperation({ summary: 'Admin gets all active sessions for a specific user' })
  async getUserSessions(@Param('id') targetUserId: string) {
    return this.sessionService.getActiveSessions(targetUserId);
  }

  @Delete()
  @ApiOperation({ summary: 'Admin revokes all sessions for a specific user' })
  async revokeUserSessions(@CurrentUser() admin: any, @Param('id') targetUserId: string) {
    return this.sessionService.adminRevokeAllUserSessions(admin.id, targetUserId);
  }
}
