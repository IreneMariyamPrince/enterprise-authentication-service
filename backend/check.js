const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@authsphere.dev' } });
  console.log('USER FROM DB:', user);
}
main().catch(console.error).finally(() => prisma.$disconnect());
