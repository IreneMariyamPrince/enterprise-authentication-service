import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditCategory, AuditStatus } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('roles')
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly auditService: AuditService
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Create a new role (Super Admin only)' })
  async create(@Body() createRoleDto: CreateRoleDto, @CurrentUser() user: any) {
    const role = await this.rolesService.create(createRoleDto);
    
    this.auditService.audit({
      actorId: user.id,
      action: AuditAction.ROLE_CREATED,
      category: AuditCategory.ROLE,
      status: AuditStatus.SUCCESS,
      metadata: { roleName: role.name }
    });

    return role;
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('roles.read')
  @ApiOperation({ summary: 'Get all roles' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('roles.read')
  @ApiOperation({ summary: 'Get a specific role by ID' })
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('roles.update')
  @ApiOperation({ summary: 'Update a role' })
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto, @CurrentUser() user: any) {
    const role = await this.rolesService.update(id, updateRoleDto);
    
    this.auditService.audit({
      actorId: user.id,
      action: AuditAction.ROLE_UPDATED,
      category: AuditCategory.ROLE,
      status: AuditStatus.SUCCESS,
      resourceId: id,
      metadata: { updates: updateRoleDto }
    });

    return role;
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Delete a role (Super Admin only)' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const result = await this.rolesService.remove(id);

    this.auditService.audit({
      actorId: user.id,
      action: AuditAction.ROLE_DELETED,
      category: AuditCategory.ROLE,
      status: AuditStatus.SUCCESS,
      resourceId: id
    });

    return result;
  }

  @Post(':id/permissions')
  @UseGuards(RolesGuard)
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Assign a permission to a role' })
  async assignPermission(@Param('id') id: string, @Body() dto: AssignPermissionDto, @CurrentUser() user: any) {
    const result = await this.rolesService.assignPermission(id, dto);

    this.auditService.audit({
      actorId: user.id,
      action: AuditAction.PERMISSION_ASSIGNED,
      category: AuditCategory.PERMISSION,
      status: AuditStatus.SUCCESS,
      resourceId: id,
      metadata: { permissionId: dto.permissionId }
    });

    return result;
  }

  @Delete(':id/permissions/:permissionId')
  @UseGuards(RolesGuard)
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Remove a permission from a role' })
  async removePermission(@Param('id') id: string, @Param('permissionId') permissionId: string, @CurrentUser() user: any) {
    const result = await this.rolesService.removePermission(id, permissionId);

    this.auditService.audit({
      actorId: user.id,
      action: AuditAction.PERMISSION_REMOVED,
      category: AuditCategory.PERMISSION,
      status: AuditStatus.SUCCESS,
      resourceId: id,
      metadata: { permissionId }
    });

    return result;
  }
}
