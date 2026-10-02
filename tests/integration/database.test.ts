import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  disconnectTestDatabase,
  resetTestDatabase,
  testPrisma,
} from '../helpers/database.js';

describe('test database', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it('creates and reads a user in the isolated database', async () => {
    const createdUser = await testPrisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'test-password-hash',
      },
    });

    const foundUser = await testPrisma.user.findUnique({
      where: { email: createdUser.email },
    });

    expect(foundUser).toMatchObject({
      id: createdUser.id,
      name: 'Test User',
      email: 'test@example.com',
      role: 'CUSTOMER',
    });
  });
});
