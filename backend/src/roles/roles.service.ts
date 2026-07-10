import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRoleDto) {
    const exists = await this.prisma.role.findUnique({ where: { name: dto.name } });
    if (exists) throw new BadRequestException('Role already exists');

    return this.prisma.role.create({ data: dto });
  }

  async findAll() {
    return this.prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } }
      },
      orderBy: { level: 'desc' }
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } }
      }
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.findOne(id);
    if (role.isSystem && dto.name && dto.name !== role.name) {
      throw new BadRequestException('Cannot rename a system role');
    }
    return this.prisma.role.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const role = await this.findOne(id);
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }
    return this.prisma.role.delete({ where: { id } });
  }

  async assignPermission(roleId: string, dto: AssignPermissionDto) {
    const role = await this.findOne(roleId);
    
    // Using upsert to prevent duplicate assignments throwing Prisma errors
    await this.prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId, permissionId: dto.permissionId }
      },
      update: {},
      create: { roleId, permissionId: dto.permissionId },
    });

    return { success: true, message: 'Permission assigned to role' };
  }

  async removePermission(roleId: string, permissionId: string) {
    const role = await this.findOne(roleId);
    if (role.name === 'Super Admin') {
      throw new BadRequestException('Cannot remove permissions from Super Admin');
    }
    
    try {
      await this.prisma.rolePermission.delete({
        where: {
          roleId_permissionId: { roleId, permissionId }
        }
      });
    } catch {
      // Ignore if it doesn't exist
    }

    return { success: true, message: 'Permission removed from role' };
  }
}
