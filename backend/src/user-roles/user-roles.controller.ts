import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { UserRolesService } from './user-roles.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditCategory, AuditStatus } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('user-roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users/:userId/roles')
export class UserRolesController {
  constructor(
    private readonly userRolesService: UserRolesService,
    private readonly auditService: AuditService
  ) {}

  @Get()
  @Permissions('roles.read')
  @ApiOperation({ summary: 'Get roles for a specific user' })
  getUserRoles(@Param('userId') userId: string) {
    return this.userRolesService.getUserRoles(userId);
  }

  @Post()
  @Permissions('roles.update')
  @ApiOperation({ summary: 'Assign a role to a user' })
  async assignRole(@Param('userId') userId: string, @Body() dto: AssignRoleDto, @CurrentUser() currentUser: any) {
    const result = await this.userRolesService.assignRole(userId, dto);
    
    this.auditService.audit({
      actorId: currentUser.id,
      targetUserId: userId,
      action: AuditAction.ROLE_ASSIGNED,
      category: AuditCategory.USER,
      status: AuditStatus.SUCCESS,
      metadata: { roleId: dto.roleId }
    });

    return result;
  }

  @Delete(':roleId')
  @Permissions('roles.update')
  @ApiOperation({ summary: 'Remove a role from a user' })
  removeRole(
    @Param('userId') userId: string, 
    @Param('roleId') roleId: string,
    @CurrentUser() currentUser: any
  ) {
    const result = this.userRolesService.removeRole(userId, roleId, currentUser.id);
    
    this.auditService.audit({
      actorId: currentUser.id,
      targetUserId: userId,
      action: AuditAction.ROLE_REMOVED,
      category: AuditCategory.USER,
      status: AuditStatus.SUCCESS,
      metadata: { roleId }
    });

    return result;
  }
}
