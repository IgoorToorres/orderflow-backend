import type { RequestHandler } from 'express';
import type { TokenService } from '../modules/auth/security/token.js';
import { AppError } from '../shared/errors/app-error.js';

function authenticationRequired(): AppError {
  return new AppError({
    statusCode: 401,
    code: 'AUTHENTICATION_REQUIRED',
    publicMessage: 'Authentication required',
  });
}

function invalidAccessToken(): AppError {
  return new AppError({
    statusCode: 401,
    code: 'INVALID_ACCESS_TOKEN',
    publicMessage: 'Invalid or expired access token',
  });
}

export function authenticate(tokenService: TokenService): RequestHandler {
  return async (request, _response, next) => {
    const authorization = request.header('authorization');

    if (!authorization) {
      next(authenticationRequired());
      return;
    }

    const parts = authorization.trim().split(/\s+/);
    const [scheme, token] = parts;

    if (parts.length !== 2 || scheme?.toLowerCase() !== 'bearer' || !token) {
      next(authenticationRequired());
      return;
    }

    const identity = await tokenService.verifyAccessToken(token);

    if (!identity) {
      next(invalidAccessToken());
      return;
    }

    request.auth = identity;
    next();
  };
}
