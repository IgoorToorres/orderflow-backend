import express, { type RequestHandler } from 'express';
import { describe, expect, it } from 'vitest';
import { withTestApp } from '../../tests/helpers/http.js';
import { errorHandler } from './error-handler.js';
import { AppError } from '../shared/errors/app-error.js';
import { Prisma } from '../generated/prisma/client.js';

function createTestApp(handler: RequestHandler) {
  const app = express();

  app.get('/test', handler);
  app.use(errorHandler);

  return app;
}

describe('errorHandler', () => {
  it('returns the status and public data from AppError', async () => {
    const unsafeDetails = [
      {
        field: 'email',
        message: 'Email is already in use',
        received: 'secret@example.com',
      },
    ];

    const app = createTestApp(() => {
      throw new AppError({
        statusCode: 409,
        code: 'EMAIL_ALREADY_EXISTS',
        publicMessage: 'Email is already in use',
        details: unsafeDetails,
      });
    });

    const response = await withTestApp(app, async (client) =>
      client.get('/test'),
    );

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Email is already in use',
        details: [
          {
            field: 'email',
            message: 'Email is already in use',
          },
        ],
      },
    });

    expect(JSON.stringify(response.body)).not.toContain('secret@example.com');
    expect(response.body.error).not.toHaveProperty('stack');
  });

  it('maps Prisma unique conflicts to status 409', async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed for secret@example.com',
      {
        code: 'P2002',
        clientVersion: '7.10.0',
      },
    );

    const app = createTestApp(() => {
      throw prismaError;
    });

    const response = await withTestApp(app, async (client) =>
      client.get('/test'),
    );

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: 'RESOURCE_CONFLICT',
        message: 'Resource already exists',
      },
    });

    expect(JSON.stringify(response.body)).not.toContain('secret@example.com');
  });

  it('returns a sanitized 500 for unexpected errors', async () => {
    const app = createTestApp(() => {
      throw new Error('DATABASE_URL=mysql://user:password@localhost/db');
    });

    const response = await withTestApp(app, async (client) =>
      client.get('/test'),
    );

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    });

    const serializedBody = JSON.stringify(response.body);

    expect(serializedBody).not.toContain('DATABASE_URL');
    expect(serializedBody).not.toContain('password');
    expect(response.body.error).not.toHaveProperty('stack');
  });
});
