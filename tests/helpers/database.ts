import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { config } from 'dotenv';
import { z } from 'zod';

import { PrismaClient } from '../../src/generated/prisma/client.js';
import { assertSafeTestDatabase } from './database-safety.js';

config({ path: '.env.test', override: true, quiet: true });

const testEnvSchema = z.object({
  NODE_ENV: z.literal('test'),
  DATABASE_URL_TEST: z
    .string()
    .url()
    .refine((value) => value.startsWith('mysql://'), {
      message: 'must use mysql:// protocol',
    }),
});

const result = testEnvSchema.safeParse(process.env);

if (!result.success) {
  const invalidFields = [
    ...new Set(
      result.error.issues.map((issue) => issue.path.join('.') || 'environment'),
    ),
  ];

  throw new Error(
    `Invalid test environment variables: ${invalidFields.join(', ')}`,
  );
}

const connectionOptions = assertSafeTestDatabase(
  result.data.NODE_ENV,
  result.data.DATABASE_URL_TEST,
);

const adapter = new PrismaMariaDb({
  ...connectionOptions,
  allowPublicKeyRetrieval: true,
});

export const testPrisma = new PrismaClient({ adapter });

export async function resetTestDatabase(): Promise<void> {
  await testPrisma.$transaction([
    testPrisma.processedEvent.deleteMany(),
    testPrisma.outboxEvent.deleteMany(),
    testPrisma.orderItem.deleteMany(),
    testPrisma.order.deleteMany(),
    testPrisma.product.deleteMany(),
    testPrisma.user.deleteMany(),
  ]);
}

export async function disconnectTestDatabase(): Promise<void> {
  await testPrisma.$disconnect();
}
