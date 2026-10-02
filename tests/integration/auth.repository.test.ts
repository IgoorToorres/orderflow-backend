import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PrismaUserRepository } from '../../src/modules/auth/repository/auth.repository.js';
import {
  disconnectTestDatabase,
  resetTestDatabase,
  testPrisma,
} from '../helpers/database.js';

describe('PrismaUserRepository', () => {
  const repository = new PrismaUserRepository(testPrisma);

  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it('creates and finds a customer', async () => {
    const created = await repository.createCustomer({
      name: 'Test Customer',
      email: 'customer@example.com',
      passwordHash: 'test-password-hash',
    });

    const byEmail = await repository.findByEmail('customer@example.com');

    const byId = await repository.findById(created.id);

    expect(created.role).toBe('CUSTOMER');
    expect(byEmail?.id).toBe(created.id);
    expect(byId?.email).toBe('customer@example.com');
  });

  it('translates duplicate email into a 409 AppError', async () => {
    const input = {
      name: 'Test Customer',
      email: 'customer@example.com',
      passwordHash: 'test-password-hash',
    };

    await repository.createCustomer(input);

    await expect(repository.createCustomer(input)).rejects.toMatchObject({
      statusCode: 409,
      code: 'EMAIL_ALREADY_EXISTS',
      publicMessage: 'Email already registered',
    });
  });
});
