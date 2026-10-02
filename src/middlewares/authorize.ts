import type { RequestHandler } from 'express';
import type { UserRole } from '../generated/prisma/enums.js';
import { AppError } from '../shared/errors/app-error.js';

export function authorize(...allowedRoles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth) {
      next(
        new AppError({
          statusCode: 401,
          code: 'AUTHENTICATION_REQUIRED',
          publicMessage: 'Authentication required',
        }),
      );
      return;
    }

    if (!allowedRoles.includes(request.auth.role)) {
      next(
        new AppError({
          statusCode: 403,
          code: 'FORBIDDEN',
          publicMessage: 'You do not have permission to access this resource',
        }),
      );
      return;
    }

    next();
  };
}
