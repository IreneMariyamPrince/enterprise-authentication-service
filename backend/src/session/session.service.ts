import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  async getActiveSessions(userId: string) {
    // Clean up expired ones first optionally, or just filter
    return this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        deviceName: true,
        browser: true,
        os: true,
        ipAddress: true,
        lastActiveAt: true,
        createdAt: true,
      }
    });
  }

  async getSessionHistory(userId: string) {
    return this.prisma.session.findMany({
      where: {
        userId,
        OR: [
          { revokedAt: { not: null } },
          { expiresAt: { lt: new Date() } }
        ]
      },
      orderBy: { lastActiveAt: 'desc' },
      take: 20, // Limit history
      select: {
        id: true,
        deviceName: true,
        browser: true,
        os: true,
        ipAddress: true,
        lastActiveAt: true,
        createdAt: true,
        revokedAt: true,
        expiresAt: true,
      }
    });
  }

  async getCurrentSession(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        deviceName: true,
        browser: true,
        os: true,
        ipAddress: true,
        lastActiveAt: true,
        createdAt: true,
      }
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async revokeSession(userId: string, targetSessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: targetSessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException('You can only revoke your own sessions');

    await this.prisma.session.update({
      where: { id: targetSessionId },
      data: { revokedAt: new Date() }
    });

    console.log('[AUDIT] User revoked session', { userId, targetSessionId });
    return { success: true, message: 'Session revoked successfully' };
  }

  async revokeAllSessions(userId: string, currentSessionId: string) {
    await this.prisma.session.updateMany({
      where: { 
        userId, 
        revokedAt: null,
        // Optional: keep current session active? User requested POST /sessions/revoke-all logs out from every device.
        // If we log out from every device, we include currentSessionId. 
      },
      data: { revokedAt: new Date() }
    });

    console.log('[AUDIT] User revoked all sessions', { userId });
    return { success: true, message: 'All sessions revoked successfully' };
  }

  async adminRevokeAllUserSessions(adminId: string, targetUserId: string) {
    await this.prisma.session.updateMany({
      where: { userId: targetUserId, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    console.log('[AUDIT] Admin revoked all sessions for user', { adminId, targetUserId });
    return { success: true, message: 'User sessions revoked successfully' };
  }
}
