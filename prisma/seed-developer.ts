import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.DEV_EMAIL || 'dev@optiview.ma';
  const password = process.env.DEV_PASSWORD || 'ChangeMe123!';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Developer account already exists:', email);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const dev = await prisma.user.create({
    data: {
      name: 'Developer',
      email,
      passwordHash,
      role: 'DEVELOPER',
      shopId: null,
    },
  });

  console.log('Developer account created:');
  console.log('  Email:', dev.email);
  console.log('  Password:', password);
  console.log('  (Change the password after first login)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
