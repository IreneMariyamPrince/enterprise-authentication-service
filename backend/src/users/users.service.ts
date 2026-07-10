import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        emailVerified: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        roles: {
          include: {
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
