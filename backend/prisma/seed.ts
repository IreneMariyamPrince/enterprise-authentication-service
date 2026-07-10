import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/auth_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const permissions = [
  'users.read', 'users.create', 'users.update', 'users.delete',
  'roles.read', 'roles.create', 'roles.update', 'roles.delete',
  'permissions.read',
  'sessions.read', 'sessions.revoke',
  'organizations.read', 'organizations.create', 'organizations.update', 'organizations.delete',
  'audit.read',
  'apikeys.read', 'apikeys.create', 'apikeys.delete'
];

const roles = [
  { name: 'Super Admin', level: 100, isSystem: true, description: 'Unrestricted access to the entire system' },
  { name: 'Admin', level: 80, isSystem: true, description: 'Administrative access for managing organizations and users' },
  { name: 'Manager', level: 60, isSystem: true, description: 'Managerial access for day-to-day operations' },
  { name: 'User', level: 20, isSystem: true, description: 'Standard authenticated user' },
  { name: 'Viewer', level: 10, isSystem: true, description: 'Read-only access' },
];

async function main() {
  console.log('Seeding database...');

  // 1. Seed Permissions
  for (const permName of permissions) {
    await prisma.permission.upsert({
      where: { name: permName },
      update: {},
      create: { name: permName, description: `Permission to ${permName}` },
    });
  }
  console.log('Permissions seeded.');

  // 2. Seed Roles
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { level: role.level, isSystem: role.isSystem },
      create: role,
    });
  }
  console.log('Roles seeded.');

  // 3. Assign all permissions to Super Admin
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });
  const allPerms = await prisma.permission.findMany();
  
  if (superAdminRole) {
    for (const perm of allPerms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id }
        },
        update: {},
        create: { roleId: superAdminRole.id, permissionId: perm.id },
      });
    }
    console.log('Super Admin permissions assigned.');
  }

  // 4. Seed default Super Admin account
  const adminEmail = 'admin@authsphere.dev';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const passwordHash = await argon2.hash(adminPassword);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash: passwordHash,
      emailVerified: true,
    },
  });

  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: adminUser.id, roleId: superAdminRole.id }
      },
      update: {},
      create: { userId: adminUser.id, roleId: superAdminRole.id },
    });
  }

  console.log('Super Admin user seeded: admin@authsphere.dev');
  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
