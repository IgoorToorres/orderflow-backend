import { verify } from 'argon2';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';

import { seedDatabase } from '../../prisma/seed.js';
import {
  disconnectTestDatabase,
  resetTestDatabase,
  testPrisma,
} from '../helpers/database.js';

describe('database seed', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it('is idempotent and hashes the admin password', async () => {
    const input = {
      adminEmail: 'admin@example.com',
      adminPassword: 'test-admin-password',
    };

    await seedDatabase(testPrisma, input);
    await seedDatabase(testPrisma, input);

    const admin = await testPrisma.user.findUniqueOrThrow({
      where: { email: input.adminEmail },
    });

    expect(admin.role).toBe('ADMIN');
    expect(admin.passwordHash).not.toBe(input.adminPassword);
    await expect(verify(admin.passwordHash, input.adminPassword)).resolves.toBe(
      true,
    );
    await expect(testPrisma.user.count()).resolves.toBe(1);
    await expect(testPrisma.product.count()).resolves.toBe(5);
  });
});
