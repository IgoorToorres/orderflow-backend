import { Router } from 'express';
import { createAuthRouter } from '../modules/auth/route/auth.routes.js';
import type { AuthService } from '../modules/auth/service/auth.service.js';

interface ApiRouterDependencies {
  authService: AuthService;
}

export function createApiRouter({
  authService,
}: ApiRouterDependencies): Router {
  const router = Router();

  router.use('/auth', createAuthRouter(authService));

  return router;
}
