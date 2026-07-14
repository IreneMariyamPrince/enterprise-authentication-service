import { Controller, Get, Param, Query, UseGuards, Res } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Get all audit logs (Super Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  findAll(@Query() query: any) {
    return this.auditService.findAll(query);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get audit logs for the current user' })
  findMyLogs(@CurrentUser() user: any, @Query() query: any) {
    query.actorId = user.id;
    return this.auditService.findAll(query);
  }

  @Get('export')
  @UseGuards(RolesGuard)
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Export audit logs to CSV' })
  async exportCsv(@Query() query: any, @Res() res: Response) {
    // Retrieve up to 10,000 records for export to avoid memory issues
    query.limit = 10000;
    query.page = 1;
    const result = await this.auditService.findAll(query);
    
    // Simple CSV formatter
    const logs = result.data;
    if (!logs.length) {
      return res.status(404).send('No records found for export');
    }

    const headers = [
      'ID', 'Date', 'Action', 'Category', 'Status', 'Actor ID', 'Actor Email', 
      'Target User ID', 'Target Email', 'IP Address', 'Browser', 'OS'
    ];

    const rows = logs.map(log => [
      log.id,
      log.createdAt.toISOString(),
      log.action,
      log.category,
      log.status,
      log.actorId || '',
      log.actor?.email || '',
      log.targetUserId || '',
      log.targetUser?.email || '',
      log.ipAddress || '',
      log.browser || '',
      log.os || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    res.header('Content-Type', 'text/csv');
    res.attachment(`audit-logs-export-${new Date().toISOString()}.csv`);
    return res.send(csvContent);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Get a specific audit log by ID' })
  findOne(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }
}
