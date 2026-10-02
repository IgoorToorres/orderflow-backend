import { Router } from 'express';
import { describe, expect, it } from 'vitest';
import { withTestApp } from '../../tests/helpers/http.js';
import { createApp } from '../app.js';
import { UserRole } from '../generated/prisma/enums.js';
import { createTokenService } from '../modules/auth/security/token.js';
import { authenticate } from './authenticate.js';
import { authorize } from './authorize.js';

const userId = '550e8400-e29b-41d4-a716-446655440000';
const secret = 'a'.repeat(64);

function createProtectedApp() {
  const tokenService = createTokenService({
    secret,
    expiresInSeconds: 900,
  });
  const router = Router();

  router.get('/profile', authenticate(tokenService), (request, response) => {
    response.status(200).json({ auth: request.auth });
  });

  router.get(
    '/admin',
    authenticate(tokenService),
    authorize(UserRole.ADMIN),
    (_request, response) => {
      response.status(200).json({ status: 'allowed' });
    },
  );

  return {
    app: createApp(router),
    tokenService,
  };
}

describe('authentication middlewares', () => {
  it('rejects a request without a Bearer token', async () => {
    const { app } = createProtectedApp();

    const response = await withTestApp(app, async (client) =>
      client.get('/api/v1/profile'),
    );

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
      },
    });
  });

  it('rejects a token signed with another secret', async () => {
    const { app } = createProtectedApp();
    const foreignTokenService = createTokenService({
      secret: 'b'.repeat(64),
      expiresInSeconds: 900,
    });
    const token = await foreignTokenService.issueAccessToken({
      userId,
      role: UserRole.CUSTOMER,
    });

    const response = await withTestApp(app, async (client) =>
      client.get('/api/v1/profile').set('Authorization', `Bearer ${token}`),
    );

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_ACCESS_TOKEN');
  });

  it('rejects an expired token', async () => {
    const { app, tokenService } = createProtectedApp();
    const token = await tokenService.issueAccessToken(
      {
        userId,
        role: UserRole.CUSTOMER,
      },
      new Date('2000-01-01T00:00:00.000Z'),
    );

    const response = await withTestApp(app, async (client) =>
      client.get('/api/v1/profile').set('Authorization', `Bearer ${token}`),
    );

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_ACCESS_TOKEN');
  });

  it('stores the verified identity in request.auth', async () => {
    const { app, tokenService } = createProtectedApp();
    const token = await tokenService.issueAccessToken({
      userId,
      role: UserRole.CUSTOMER,
    });

    const response = await withTestApp(app, async (client) =>
      client.get('/api/v1/profile').set('Authorization', `Bearer ${token}`),
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      auth: {
        userId,
        role: UserRole.CUSTOMER,
      },
    });
  });

  it('returns 403 when a customer accesses an admin route', async () => {
    const { app, tokenService } = createProtectedApp();
    const token = await tokenService.issueAccessToken({
      userId,
      role: UserRole.CUSTOMER,
    });

    const response = await withTestApp(app, async (client) =>
      client.get('/api/v1/admin').set('Authorization', `Bearer ${token}`),
    );

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this resource',
      },
    });
  });

  it('allows an admin to access an admin route', async () => {
    const { app, tokenService } = createProtectedApp();
    const token = await tokenService.issueAccessToken({
      userId,
      role: UserRole.ADMIN,
    });

    const response = await withTestApp(app, async (client) =>
      client.get('/api/v1/admin').set('Authorization', `Bearer ${token}`),
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'allowed' });
  });
});
