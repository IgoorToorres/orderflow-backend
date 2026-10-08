import { randomUUID } from 'node:crypto';
import { Router, type Express } from 'express';
import { beforeEach, describe, expect, it } from 'vitest';
import { withTestApp } from '../../../../tests/helpers/http.js';
import { createApp } from '../../../app.js';
import type { Product } from '../../../generated/prisma/client.js';
import { UserRole } from '../../../generated/prisma/enums.js';
import { AppError } from '../../../shared/errors/app-error.js';
import type { AuthIdentity } from '../../auth/security/token.js';
import {
  createTokenService,
  type TokenService,
} from '../../auth/security/token.js';
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from '../schema/product.schemas.js';
import type {
  ProductListResult,
  ProductService,
} from '../service/product.service.js';
import { createProductRouter } from './product.routes.js';

interface ListCall {
  identity: AuthIdentity;
  query: ListProductsQuery;
}

interface CreateCall {
  identity: AuthIdentity;
  input: CreateProductInput;
}

interface UpdateCall {
  identity: AuthIdentity;
  id: string;
  input: UpdateProductInput;
}

class StubProductService implements ProductService {
  listResult: ProductListResult;
  createdProduct: Product;
  updatedProduct: Product;
  updateError: Error | undefined;

  lastListCall: ListCall | undefined;
  lastCreateCall: CreateCall | undefined;
  lastUpdateCall: UpdateCall | undefined;

  constructor(product: Product) {
    this.listResult = {
      products: [product],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    };

    this.createdProduct = product;
    this.updatedProduct = product;
  }

  async list(
    identity: AuthIdentity,
    query: ListProductsQuery,
  ): Promise<ProductListResult> {
    this.lastListCall = {
      identity,
      query,
    };

    return this.listResult;
  }

  async create(
    identity: AuthIdentity,
    input: CreateProductInput,
  ): Promise<Product> {
    this.lastCreateCall = {
      identity,
      input,
    };

    return this.createdProduct;
  }

  async update(
    identity: AuthIdentity,
    id: string,
    input: UpdateProductInput,
  ): Promise<Product> {
    this.lastUpdateCall = {
      identity,
      id,
      input,
    };

    if (this.updateError) {
      throw this.updateError;
    }

    return this.updatedProduct;
  }
}

describe('product routes', () => {
  let app: Express;
  let tokenService: TokenService;
  let productService: StubProductService;
  let adminToken: string;
  let customerToken: string;
  let product: Product;

  beforeEach(async () => {
    const now = new Date('2026-10-07T12:00:00.000Z');

    product = {
      id: randomUUID(),
      name: 'Mechanical Keyboard',
      description: 'Mechanical keyboard for work and gaming',
      priceCents: 19_990n,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    productService = new StubProductService(product);

    tokenService = createTokenService({
      secret: 'a'.repeat(64),
      expiresInSeconds: 900,
    });

    adminToken = await tokenService.issueAccessToken({
      userId: randomUUID(),
      role: UserRole.ADMIN,
    });

    customerToken = await tokenService.issueAccessToken({
      userId: randomUUID(),
      role: UserRole.CUSTOMER,
    });

    const apiRouter = Router();

    apiRouter.use(
      '/products',
      createProductRouter({
        productService,
        tokenService,
      }),
    );

    app = createApp(apiRouter);
  });

  it('returns 401 when the access token is missing', async () => {
    const response = await withTestApp(app, async (client) =>
      client.get('/api/v1/products'),
    );

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
      },
    });

    expect(productService.lastListCall).toBeUndefined();
  });

  it('returns 200 and serializes BigInt when listing products', async () => {
    const response = await withTestApp(app, async (client) =>
      client
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${customerToken}`),
    );

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      products: [
        {
          id: product.id,
          name: 'Mechanical Keyboard',
          description: 'Mechanical keyboard for work and gaming',
          priceCents: 19_990,
          active: true,
          createdAt: '2026-10-07T12:00:00.000Z',
          updatedAt: '2026-10-07T12:00:00.000Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });

    expect(productService.lastListCall).toMatchObject({
      identity: {
        role: UserRole.CUSTOMER,
      },
      query: {
        page: 1,
        limit: 20,
      },
    });
  });

  it('passes explicit pagination to the service', async () => {
    const response = await withTestApp(app, async (client) =>
      client
        .get('/api/v1/products?page=2&limit=10')
        .set('Authorization', `Bearer ${adminToken}`),
    );

    expect(response.status).toBe(200);

    expect(productService.lastListCall).toMatchObject({
      identity: {
        role: UserRole.ADMIN,
      },
      query: {
        page: 2,
        limit: 10,
      },
    });
  });

  it('returns 400 when the pagination limit exceeds 100', async () => {
    const response = await withTestApp(app, async (client) =>
      client
        .get('/api/v1/products?page=1&limit=101')
        .set('Authorization', `Bearer ${customerToken}`),
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(productService.lastListCall).toBeUndefined();
  });

  it('returns 403 when a customer tries to create a product', async () => {
    const response = await withTestApp(app, async (client) =>
      client
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Mechanical Keyboard',
          priceCents: 19_990,
        }),
    );

    expect(response.status).toBe(403);

    expect(response.body).toEqual({
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this resource',
      },
    });

    expect(productService.lastCreateCall).toBeUndefined();
  });

  it('returns 400 when an admin sends an invalid price', async () => {
    const response = await withTestApp(app, async (client) =>
      client
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Mechanical Keyboard',
          priceCents: 0,
        }),
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(productService.lastCreateCall).toBeUndefined();
  });

  it('returns 201 when an admin creates a product', async () => {
    const response = await withTestApp(app, async (client) =>
      client
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Mechanical Keyboard',
          description: 'Mechanical keyboard for work and gaming',
          priceCents: 19_990,
        }),
    );

    expect(response.status).toBe(201);

    expect(response.body.product).toEqual({
      id: product.id,
      name: 'Mechanical Keyboard',
      description: 'Mechanical keyboard for work and gaming',
      priceCents: 19_990,
      active: true,
      createdAt: '2026-10-07T12:00:00.000Z',
      updatedAt: '2026-10-07T12:00:00.000Z',
    });

    expect(productService.lastCreateCall).toMatchObject({
      identity: {
        role: UserRole.ADMIN,
      },
      input: {
        name: 'Mechanical Keyboard',
        description: 'Mechanical keyboard for work and gaming',
        priceCents: 19_990,
        active: true,
      },
    });
  });

  it('returns 200 when an admin performs a partial patch', async () => {
    productService.updatedProduct = {
      ...product,
      active: false,
      updatedAt: new Date('2026-10-07T13:00:00.000Z'),
    };

    const response = await withTestApp(app, async (client) =>
      client
        .patch(`/api/v1/products/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          active: false,
        }),
    );

    expect(response.status).toBe(200);

    expect(response.body.product).toEqual({
      id: product.id,
      name: 'Mechanical Keyboard',
      description: 'Mechanical keyboard for work and gaming',
      priceCents: 19_990,
      active: false,
      createdAt: '2026-10-07T12:00:00.000Z',
      updatedAt: '2026-10-07T13:00:00.000Z',
    });

    expect(productService.lastUpdateCall).toMatchObject({
      identity: {
        role: UserRole.ADMIN,
      },
      id: product.id,
      input: {
        active: false,
      },
    });
  });

  it('returns 400 when the product UUID is invalid', async () => {
    const response = await withTestApp(app, async (client) =>
      client
        .patch('/api/v1/products/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          active: false,
        }),
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(productService.lastUpdateCall).toBeUndefined();
  });

  it('returns 400 when the patch body is empty', async () => {
    const response = await withTestApp(app, async (client) =>
      client
        .patch(`/api/v1/products/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}),
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(productService.lastUpdateCall).toBeUndefined();
  });

  it('returns 404 when the product does not exist', async () => {
    const unknownProductId = randomUUID();

    productService.updateError = new AppError({
      statusCode: 404,
      code: 'PRODUCT_NOT_FOUND',
      publicMessage: 'Product not found',
    });

    const response = await withTestApp(app, async (client) =>
      client
        .patch(`/api/v1/products/${unknownProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          active: false,
        }),
    );

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      error: {
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found',
      },
    });
  });
});
