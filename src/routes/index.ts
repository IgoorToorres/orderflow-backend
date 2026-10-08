import { Router } from 'express';
import { createAuthRouter } from '../modules/auth/route/auth.routes.js';
import type { TokenService } from '../modules/auth/security/token.js';
import type { AuthService } from '../modules/auth/service/auth.service.js';
import { createProductRouter } from '../modules/products/route/product.routes.js';
import type { ProductService } from '../modules/products/service/product.service.js';

interface ApiRouterDependencies {
  authService: AuthService;
  productService: ProductService;
  tokenService: TokenService;
}

export function createApiRouter({
  authService,
  productService,
  tokenService,
}: ApiRouterDependencies): Router {
  const router = Router();

  router.use('/auth', createAuthRouter(authService));

  router.use(
    '/products',
    createProductRouter({
      productService,
      tokenService,
    }),
  );

  return router;
}
