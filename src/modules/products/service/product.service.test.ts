import { randomUUID } from 'node:crypto';
import type { Product } from '../../../generated/prisma/client.js';
import { UserRole } from '../../../generated/prisma/enums.js';
import type {
  CreateProductData,
  ListProductsOptions,
  ProductRepository,
  UpdateProductData,
} from '../repository/product.repository.js';
import { createProductService } from './product.service.js';
import { beforeEach, describe, expect, it } from 'vitest';

class InMemoryProductRepository implements ProductRepository {
  products: Product[] = [];
  lastUpdate: UpdateProductData | undefined;

  async list(options: ListProductsOptions): Promise<Product[]> {
    const products = options.activeOnly
      ? this.products.filter((product) => product.active)
      : this.products;

    return products.slice(options.skip, options.skip + options.take);
  }

  async count(activeOnly: boolean): Promise<number> {
    return activeOnly
      ? this.products.filter((product) => product.active).length
      : this.products.length;
  }

  async findById(id: string): Promise<Product | null> {
    return this.products.find((product) => product.id === id) ?? null;
  }

  async create(input: CreateProductData): Promise<Product> {
    const now = new Date();

    const product: Product = {
      id: randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    this.products.push(product);

    return product;
  }

  async updateById(
    id: string,
    input: UpdateProductData,
  ): Promise<Product | null> {
    this.lastUpdate = input;

    const product = await this.findById(id);

    if (!product) {
      return null;
    }

    Object.assign(product, input, {
      updatedAt: new Date(),
    });

    return product;
  }
}

describe('ProductService', () => {
  let repository: InMemoryProductRepository;
  let service: ReturnType<typeof createProductService>;

  const admin = {
    userId: randomUUID(),
    role: UserRole.ADMIN,
  };

  const customer = {
    userId: randomUUID(),
    role: UserRole.CUSTOMER,
  };

  beforeEach(() => {
    repository = new InMemoryProductRepository();
    service = createProductService(repository);
  });

  it('rejects an invalid product price', async () => {
    await expect(
      service.create(admin, {
        name: 'Invalid product',
        priceCents: 0,
        active: true,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_PRODUCT_PRICE',
    });
  });

  it('does not allow a customer to create products', async () => {
    await expect(
      service.create(customer, {
        name: 'Keyboard',
        priceCents: 19_990,
        active: true,
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('updates only the fields present in a partial patch', async () => {
    const product = await repository.create({
      name: 'Keyboard',
      description: 'Original description',
      priceCents: 19_990n,
      active: true,
    });

    const updated = await service.update(admin, product.id, {
      active: false,
    });

    expect(updated.name).toBe('Keyboard');
    expect(updated.description).toBe('Original description');
    expect(updated.priceCents).toBe(19_990n);
    expect(updated.active).toBe(false);

    expect(repository.lastUpdate).toEqual({
      active: false,
    });
  });

  it('returns 404 when updating an unknown product', async () => {
    await expect(
      service.update(admin, randomUUID(), {
        active: false,
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'PRODUCT_NOT_FOUND',
    });
  });

  it('shows only active products to customers', async () => {
    await repository.create({
      name: 'Active product',
      description: null,
      priceCents: 1_000n,
      active: true,
    });

    await repository.create({
      name: 'Inactive product',
      description: null,
      priceCents: 2_000n,
      active: false,
    });

    const result = await service.list(customer, {
      page: 1,
      limit: 20,
    });

    expect(result.products).toHaveLength(1);
    expect(result.products[0]?.name).toBe('Active product');
  });
});
