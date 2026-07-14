import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditStatus, AuditCategory, AuditAction } from '@prisma/client';

export interface AuditEventDto {
  requestId?: string;
  actorId?: string;
  targetUserId?: string;
  sessionId?: string;
  organizationId?: string;
  action: AuditAction;
  category: AuditCategory;
  resource?: string;
  resourceId?: string;
  status: AuditStatus;
  ipAddress?: string;
  country?: string;
  city?: string;
  browser?: string;
  os?: string;
  userAgent?: string;
  metadata?: any;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records an audit event asynchronously so it does not block the main request thread.
   */
  audit(event: AuditEventDto): void {
    // Fire and forget promise to not block the main execution thread
    this.saveAuditLog(event).catch(err => {
      this.logger.error(`Failed to save audit log: ${err.message}`, err.stack);
    });
  }

  private async saveAuditLog(event: AuditEventDto): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        requestId: event.requestId,
        actorId: event.actorId,
        targetUserId: event.targetUserId,
        sessionId: event.sessionId,
        organizationId: event.organizationId,
        action: event.action,
        category: event.category,
        resource: event.resource,
        resourceId: event.resourceId,
        status: event.status,
        ipAddress: event.ipAddress,
        country: event.country,
        city: event.city,
        browser: event.browser,
        os: event.os,
        userAgent: event.userAgent,
        metadata: event.metadata ? JSON.parse(JSON.stringify(event.metadata)) : undefined, // Standardize JSON
      },
    });
  }

  async findAll(query: any) {
    const { 
      page = 1, 
      limit = 20, 
      action, 
      actorId, 
      targetUserId, 
      category, 
      status, 
      startDate, 
      endDate,
      ipAddress,
      browser,
      os,
      sessionId
    } = query;

    const where: any = {};
    if (action) where.action = action;
    if (actorId) where.actorId = actorId;
    if (targetUserId) where.targetUserId = targetUserId;
    if (category) where.category = category;
    if (status) where.status = status;
    if (ipAddress) where.ipAddress = { contains: ipAddress };
    if (browser) where.browser = { contains: browser };
    if (os) where.os = { contains: os };
    if (sessionId) where.sessionId = sessionId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, firstName: true, lastName: true, email: true } },
          targetUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        }
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    };
  }

  async findOne(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, email: true } },
        targetUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        session: true
      }
    });
  }
}
