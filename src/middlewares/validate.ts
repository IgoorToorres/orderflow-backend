import type { RequestHandler } from 'express';
import { z } from 'zod';

export interface ValidationSchemas {
  body?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
}

export function validate(schemas: ValidationSchemas): RequestHandler {
  const requestSchema = z.object({
    body: schemas.body ?? z.unknown(),
    params: schemas.params ?? z.unknown(),
    query: schemas.query ?? z.unknown(),
  });

  return (request, response, next) => {
    const result = requestSchema.safeParse({
      body: request.body,
      params: request.params,
      query: request.query,
    });

    if (!result.success) {
      next(result.error);
      return;
    }

    response.locals.validated = result.data;
    next();
  };
}
