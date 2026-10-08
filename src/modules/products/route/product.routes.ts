import { Router } from 'express';
import { UserRole } from '../../../generated/prisma/enums.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { authorize } from '../../../middlewares/authorize.js';
import { validate } from '../../../middlewares/validate.js';
import type { TokenService } from '../../auth/security/token.js';
import { createProductController } from '../controller/product.controller.js';
import {
  createProductBodySchema,
  listProductsQuerySchema,
  productParamsSchema,
  updateProductBodySchema,
} from '../schema/product.schemas.js';
import type { ProductService } from '../service/product.service.js';

interface ProductRouterDependencies {
  productService: ProductService;
  tokenService: TokenService;
}

export function createProductRouter({
  productService,
  tokenService,
}: ProductRouterDependencies): Router {
  const router = Router();
  const controller = createProductController(productService);

  router.use(authenticate(tokenService));

  router.get(
    '/',
    validate({
      query: listProductsQuerySchema,
    }),
    controller.list,
  );

  router.post(
    '/',
    authorize(UserRole.ADMIN),
    validate({
      body: createProductBodySchema,
    }),
    controller.create,
  );

  router.patch(
    '/:id',
    authorize(UserRole.ADMIN),
    validate({
      params: productParamsSchema,
      body: updateProductBodySchema,
    }),
    controller.update,
  );

  return router;
}
