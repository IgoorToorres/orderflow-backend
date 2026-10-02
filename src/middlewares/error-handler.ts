import type { ErrorRequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { AppError, type AppErrorDetail } from '../shared/errors/app-error.js';

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: readonly AppErrorDetail[];
  };
}

function sendError(
  response: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: readonly AppErrorDetail[],
): void {
  const body: ErrorResponseBody = {
    error: {
      code,
      message,
    },
  };

  if (details !== undefined) {
    body.error.details = details;
  }

  response.status(statusCode).json(body);
}

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  next,
) => {
  void next;

  if (error instanceof AppError) {
    sendError(
      response,
      error.statusCode,
      error.code,
      error.publicMessage,
      error.details,
    );
    return;
  }

  if (error instanceof ZodError) {
    const details: AppErrorDetail[] = error.issues.map((issue) => ({
      field:
        issue.path.length > 0 ? issue.path.map(String).join('.') : 'request',
      message: issue.message,
    }));

    sendError(response, 400, 'VALIDATION_ERROR', 'Invalid request', details);
    return;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    sendError(response, 409, 'RESOURCE_CONFLICT', 'Resource already exists');
    return;
  }

  sendError(response, 500, 'INTERNAL_SERVER_ERROR', 'Internal server error');
};
