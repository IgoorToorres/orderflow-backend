import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import { beforeEach, describe, expect, it } from 'vitest';
import { withTestApp } from '../../../../tests/helpers/http.js';
import { createApp } from '../../../app.js';
import type { User } from '../../../generated/prisma/client.js';
import { UserRole } from '../../../generated/prisma/enums.js';
import { createApiRouter } from '../../../routes/index.js';
import type {
  CreateCustomerInput,
  UserRepository,
} from '../repository/auth.repository.js';
import { passwordHasher } from '../security/password.js';
import { createTokenService, type TokenService } from '../security/token.js';
import { createAuthService } from '../service/auth.service.js';

class InMemoryUserRepository implements UserRepository {
  readonly users: User[] = [];

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async createCustomer(input: CreateCustomerInput): Promise<User> {
    const now = new Date();
    const user: User = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      role: UserRole.CUSTOMER,
      createdAt: now,
      updatedAt: now,
    };

    this.users.push(user);
    return user;
  }
}

describe('auth routes', () => {
  let app: Express;
  let repository: InMemoryUserRepository;
  let tokenService: TokenService;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
    tokenService = createTokenService({
      secret: 'a'.repeat(64),
      expiresInSeconds: 900,
    });

    const authService = createAuthService({
      userRepository: repository,
      passwordHasher,
      tokenService,
    });

    app = createApp(createApiRouter({ authService }));
  });

  it('registers a normalized customer without exposing passwordHash', async () => {
    const response = await withTestApp(app, async (client) =>
      client.post('/api/v1/auth/register').send({
        name: '  Igor Torres  ',
        email: '  IGOR@EXAMPLE.COM  ',
        password: 'strong-password-123',
      }),
    );

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      name: 'Igor Torres',
      email: 'igor@example.com',
      role: UserRole.CUSTOMER,
    });
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(repository.users).toHaveLength(1);
    expect(repository.users[0]?.passwordHash).not.toContain(
      'strong-password-123',
    );
  });

  it('rejects an attempt to register an admin', async () => {
    const response = await withTestApp(app, async (client) =>
      client.post('/api/v1/auth/register').send({
        name: 'Attacker',
        email: 'attacker@example.com',
        password: 'strong-password-123',
        role: UserRole.ADMIN,
      }),
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(repository.users).toHaveLength(0);
  });

  it('returns 409 when the email is already registered', async () => {
    const registration = {
      name: 'Igor Torres',
      email: 'igor@example.com',
      password: 'strong-password-123',
    };

    const responses = await withTestApp(app, async (client) => {
      await client.post('/api/v1/auth/register').send(registration);

      return client.post('/api/v1/auth/register').send(registration);
    });

    expect(responses.status).toBe(409);
    expect(responses.body).toEqual({
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Email already registered',
      },
    });
  });

  it('logs in and returns a valid short-lived access token', async () => {
    const response = await withTestApp(app, async (client) => {
      await client.post('/api/v1/auth/register').send({
        name: 'Igor Torres',
        email: 'igor@example.com',
        password: 'strong-password-123',
      });

      return client.post('/api/v1/auth/login').send({
        email: 'igor@example.com',
        password: 'strong-password-123',
      });
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 900,
      accessToken: expect.any(String),
    });

    await expect(
      tokenService.verifyAccessToken(response.body.accessToken as string),
    ).resolves.toMatchObject({
      role: UserRole.CUSTOMER,
    });
  });

  it('uses the same response for an unknown user and a wrong password', async () => {
    const { wrongPassword, unknownUser } = await withTestApp(
      app,
      async (client) => {
        await client.post('/api/v1/auth/register').send({
          name: 'Igor Torres',
          email: 'igor@example.com',
          password: 'strong-password-123',
        });

        const wrongPassword = await client.post('/api/v1/auth/login').send({
          email: 'igor@example.com',
          password: 'wrong-password',
        });

        const unknownUser = await client.post('/api/v1/auth/login').send({
          email: 'unknown@example.com',
          password: 'wrong-password',
        });

        return { wrongPassword, unknownUser };
      },
    );

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body).toEqual({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    });
    expect(unknownUser.body).toEqual(wrongPassword.body);
  });
});
