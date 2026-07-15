import { Controller, Get, Post, Param, UseGuards, Delete } from '@nestjs/common';
import { SessionService } from './session.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditCategory, AuditStatus } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('sessions')
@Controller('sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all active sessions for current user' })
  async getActiveSessions(@CurrentUser() user: any) {
    const sessions = await this.sessionService.getActiveSessions(user.id);
    return sessions.map(s => ({ ...s, isCurrent: s.id === user.sessionId }));
  }

  @Get('history')
  @ApiOperation({ summary: 'Get session history (revoked/expired) for current user' })
  async getSessionHistory(@CurrentUser() user: any) {
    return this.sessionService.getSessionHistory(user.id);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current session details' })
  async getCurrentSession(@CurrentUser() user: any) {
    const session = await this.sessionService.getCurrentSession(user.sessionId);
    return { ...session, isCurrent: true };
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.sessionService.revokeSession(user.id, id);

    this.auditService.audit({
      actorId: user.id,
      sessionId: id,
      action: AuditAction.SESSION_REVOKED,
      category: AuditCategory.SESSION,
      status: AuditStatus.SUCCESS,
      resourceId: id
    });

    return result;
  }

  @Post('revoke-all')
  @ApiOperation({ summary: 'Logout from all devices' })
  async revokeAllSessions(@CurrentUser() user: any) {
    const result = await this.sessionService.revokeAllSessions(user.id, user.sessionId);

    this.auditService.audit({
      actorId: user.id,
      action: AuditAction.SESSION_REVOKED_ALL,
      category: AuditCategory.SESSION,
      status: AuditStatus.SUCCESS,
      metadata: { retainedSessionId: user.sessionId }
    });

    return result;
  }
}
