import { argon2id, hash } from 'argon2';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { config } from 'dotenv';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';

import { PrismaClient } from '../src/generated/prisma/client.js';
import { parseDatabaseUrl } from '../src/lib/database-url.js';

export interface SeedInput {
  adminEmail: string;
  adminPassword: string;
}

const products = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Mechanical Keyboard',
    description: 'Mechanical keyboard for work and gaming',
    priceCents: 19_990n,
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Ergonomic Mouse',
    description: 'Wireless ergonomic mouse',
    priceCents: 9_990n,
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    name: '27-inch Monitor',
    description: '27-inch monitor with IPS panel',
    priceCents: 119_990n,
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    name: 'USB Headset',
    description: 'USB headset with integrated microphone',
    priceCents: 15_990n,
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    name: 'Notebook Stand',
    description: 'Adjustable aluminium notebook stand',
    priceCents: 12_990n,
  },
] as const;

export async function seedDatabase(
  client: PrismaClient,
  input: SeedInput,
): Promise<void> {
  const adminEmail = input.adminEmail.trim().toLowerCase();
  const passwordHash = await hash(input.adminPassword, { type: argon2id });

  await client.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'OrderFlow Admin',
      passwordHash,
      role: 'ADMIN',
    },
    create: {
      name: 'OrderFlow Admin',
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
    },
  });

  await Promise.all(
    products.map((product) =>
      client.product.upsert({
        where: { id: product.id },
        update: {
          name: product.name,
          description: product.description,
          priceCents: product.priceCents,
          active: true,
        },
        create: {
          ...product,
          active: true,
        },
      }),
    ),
  );
}

const seedEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => value.startsWith('mysql://')),
  SEED_ADMIN_EMAIL: z.string().email(),
  SEED_ADMIN_PASSWORD: z.string().min(12),
});

async function main(): Promise<void> {
  config({ quiet: true });

  const result = seedEnvSchema.safeParse(process.env);

  if (!result.success) {
    const invalidFields = [
      ...new Set(
        result.error.issues.map(
          (issue) => issue.path.join('.') || 'environment',
        ),
      ),
    ];

    throw new Error(
      `Invalid seed environment variables: ${invalidFields.join(', ')}`,
    );
  }

  const adapter = new PrismaMariaDb({
    ...parseDatabaseUrl(result.data.DATABASE_URL),
    allowPublicKeyRetrieval: true,
  });
  const client = new PrismaClient({ adapter });

  try {
    await seedDatabase(client, {
      adminEmail: result.data.SEED_ADMIN_EMAIL,
      adminPassword: result.data.SEED_ADMIN_PASSWORD,
    });
    console.log('Database seed completed');
  } finally {
    await client.$disconnect();
  }
}

const entryPoint = process.argv[1];

if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  main().catch(() => {
    console.error('Database seed failed');
    process.exitCode = 1;
  });
}
