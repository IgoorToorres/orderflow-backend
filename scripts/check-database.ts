import { prisma } from '../src/lib/prisma.js';

async function main(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
  console.log('Database connection OK');
}

main()
  .catch(() => {
    console.error('Database connection failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
