import type { RequestHandler } from 'express';
import type { LoginInput, RegisterInput } from '../schema/auth.schemas.js';
import type { AuthService } from '../service/auth.service.js';

export interface AuthController {
  register: RequestHandler;
  login: RequestHandler;
}

export function createAuthController(authService: AuthService): AuthController {
  return {
    async register(_request, response) {
      const { body } = response.locals.validated as {
        body: RegisterInput;
      };

      const user = await authService.register(body);

      response.status(201).json({ user });
    },

    async login(_request, response) {
      const { body } = response.locals.validated as {
        body: LoginInput;
      };

      const result = await authService.login(body);

      response.status(200).json(result);
    },
  };
}
