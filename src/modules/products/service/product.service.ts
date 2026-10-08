import type { Product } from '../../../generated/prisma/client.js';
import { UserRole } from '../../../generated/prisma/enums.js';
import type { AuthIdentity } from '../../auth/security/token.js';
import { AppError } from '../../../shared/errors/app-error.js';
import type {
  CreateProductData,
  ProductRepository,
  UpdateProductData,
} from '../repository/product.repository.js';
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from '../schema/product.schemas.js';

export interface ProductListResult {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductService {
  list(
    identity: AuthIdentity,
    query: ListProductsQuery,
  ): Promise<ProductListResult>;

  create(identity: AuthIdentity, input: CreateProductInput): Promise<Product>;

  update(
    identity: AuthIdentity,
    id: string,
    input: UpdateProductInput,
  ): Promise<Product>;
}

function assertAdmin(identity: AuthIdentity): void {
  if (identity.role !== UserRole.ADMIN) {
    throw new AppError({
      statusCode: 403,
      code: 'FORBIDDEN',
      publicMessage: 'You do not have permission to access this resource',
    });
  }
}

function toBigIntPrice(priceCents: number): bigint {
  if (!Number.isSafeInteger(priceCents) || priceCents <= 0) {
    throw new AppError({
      statusCode: 400,
      code: 'INVALID_PRODUCT_PRICE',
      publicMessage: 'Product price must be a positive integer',
    });
  }

  return BigInt(priceCents);
}

export function createProductService(
  repository: ProductRepository,
): ProductService {
  return {
    async list(identity, query) {
      const activeOnly = identity.role === UserRole.CUSTOMER;
      const skip = (query.page - 1) * query.limit;

      const [products, total] = await Promise.all([
        repository.list({
          activeOnly,
          skip,
          take: query.limit,
        }),
        repository.count(activeOnly),
      ]);

      return {
        products,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    },

    async create(identity, input) {
      assertAdmin(identity);

      const data: CreateProductData = {
        name: input.name.trim(),
        description: input.description ?? null,
        priceCents: toBigIntPrice(input.priceCents),
        active: input.active,
      };

      return repository.create(data);
    },

    async update(identity, id, input) {
      assertAdmin(identity);

      const data: UpdateProductData = {};

      if (input.name !== undefined) {
        data.name = input.name.trim();
      }

      if (input.description !== undefined) {
        data.description = input.description;
      }

      if (input.priceCents !== undefined) {
        data.priceCents = toBigIntPrice(input.priceCents);
      }

      if (input.active !== undefined) {
        data.active = input.active;
      }

      const product = await repository.updateById(id, data);

      if (!product) {
        throw new AppError({
          statusCode: 404,
          code: 'PRODUCT_NOT_FOUND',
          publicMessage: 'Product not found',
        });
      }

      return product;
    },
  };
}
