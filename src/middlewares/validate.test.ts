import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { errorHandler } from './error-handler.js';
import { validate } from './validate.js';

function createValidationApp() {
  const app = express();

  app.use(express.json());

  app.post(
    '/users/:userId',
    validate({
      body: z.object({
        email: z.string().email(),
      }),
      params: z.object({
        userId: z.string().uuid(),
      }),
      query: z.object({
        page: z.coerce.number().int().positive(),
      }),
    }),
    (_request, response) => {
      response.status(200).json(response.locals.validated);
    },
  );

  app.use(errorHandler);

  return app;
}

describe('validate', () => {
  it('returns all validation errors using sanitized field names', async () => {
    const response = await request(createValidationApp())
      .post('/users/not-a-uuid')
      .query({ page: '0' })
      .send({ email: 'secret-invalid-email' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
      },
    });

    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'body.email',
        }),
        expect.objectContaining({
          field: 'params.userId',
        }),
        expect.objectContaining({
          field: 'query.page',
        }),
      ]),
    );

    expect(JSON.stringify(response.body)).not.toContain('secret-invalid-email');
  });

  it('makes parsed and coerced data available to the controller', async () => {
    const response = await request(createValidationApp())
      .post('/users/550e8400-e29b-41d4-a716-446655440000')
      .query({ page: '2' })
      .send({ email: 'customer@example.com' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      body: {
        email: 'customer@example.com',
      },
      params: {
        userId: '550e8400-e29b-41d4-a716-446655440000',
      },
      query: {
        page: 2,
      },
    });
  });
});
