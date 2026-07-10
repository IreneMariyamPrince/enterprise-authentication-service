import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { UserRolesService } from './user-roles.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('user-roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users/:userId/roles')
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  @Get()
  @Permissions('roles.read')
  @ApiOperation({ summary: 'Get roles for a specific user' })
  getUserRoles(@Param('userId') userId: string) {
    return this.userRolesService.getUserRoles(userId);
  }

  @Post()
  @Permissions('roles.update')
  @ApiOperation({ summary: 'Assign a role to a user' })
  assignRole(@Param('userId') userId: string, @Body() dto: AssignRoleDto) {
    return this.userRolesService.assignRole(userId, dto);
  }

  @Delete(':roleId')
  @Permissions('roles.update')
  @ApiOperation({ summary: 'Remove a role from a user' })
  removeRole(
    @Param('userId') userId: string, 
    @Param('roleId') roleId: string,
    @CurrentUser() currentUser: any
  ) {
    return this.userRolesService.removeRole(userId, roleId, currentUser.id);
  }
}
