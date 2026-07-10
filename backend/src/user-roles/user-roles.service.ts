import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssignRoleDto } from './dto/assign-role.dto';

@Injectable()
export class UserRolesService {
  constructor(private prisma: PrismaService) {}

  async getUserRoles(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { role: true }
        }
      }
    });

    if (!user) throw new NotFoundException('User not found');
    return user.roles.map(ur => ur.role);
  }

  async assignRole(userId: string, dto: AssignRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.userRole.upsert({
      where: {
        userId_roleId: { userId, roleId: dto.roleId }
      },
      update: {},
      create: { userId, roleId: dto.roleId }
    });

    return { success: true, message: 'Role assigned to user' };
  }

  async removeRole(userId: string, roleId: string, currentUserId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    if (userId === currentUserId && role.name === 'Super Admin') {
      throw new BadRequestException('You cannot remove the Super Admin role from yourself');
    }

    try {
      await this.prisma.userRole.delete({
        where: {
          userId_roleId: { userId, roleId }
        }
      });
    } catch {
      // Ignore if it doesn't exist
    }

    return { success: true, message: 'Role removed from user' };
  }
}
