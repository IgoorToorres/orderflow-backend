import { Router } from 'express';
import { validate } from '../../../middlewares/validate.js';
import { createAuthController } from '../controller/auth.controller.js';
import { loginBodySchema, registerBodySchema } from '../schema/auth.schemas.js';
import type { AuthService } from '../service/auth.service.js';

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();
  const controller = createAuthController(authService);

  router.post(
    '/register',
    validate({
      body: registerBodySchema,
    }),
    controller.register,
  );

  router.post(
    '/login',
    validate({
      body: loginBodySchema,
    }),
    controller.login,
  );

  return router;
}
