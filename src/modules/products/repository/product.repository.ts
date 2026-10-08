import {
  Prisma,
  type PrismaClient,
  type Product,
} from '../../../generated/prisma/client.js';

export interface CreateProductData {
  name: string;
  description: string | null;
  priceCents: bigint;
  active: boolean;
}

export interface UpdateProductData {
  name?: string;
  description?: string | null;
  priceCents?: bigint;
  active?: boolean;
}

export interface ListProductsOptions {
  activeOnly: boolean;
  skip: number;
  take: number;
}

export interface ProductRepository {
  list(options: ListProductsOptions): Promise<Product[]>;
  count(activeOnly: boolean): Promise<number>;
  findById(id: string): Promise<Product | null>;
  create(input: CreateProductData): Promise<Product>;
  updateById(id: string, input: UpdateProductData): Promise<Product | null>;
}

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly client: PrismaClient) {}

  list(options: ListProductsOptions): Promise<Product[]> {
    return this.client.product.findMany({
      ...(options.activeOnly
        ? {
            where: {
              active: true,
            },
          }
        : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: options.skip,
      take: options.take,
    });
  }

  count(activeOnly: boolean): Promise<number> {
    return this.client.product.count({
      ...(activeOnly
        ? {
            where: {
              active: true,
            },
          }
        : {}),
    });
  }

  findById(id: string): Promise<Product | null> {
    return this.client.product.findUnique({
      where: { id },
    });
  }

  create(input: CreateProductData): Promise<Product> {
    return this.client.product.create({
      data: input,
    });
  }

  async updateById(
    id: string,
    input: UpdateProductData,
  ): Promise<Product | null> {
    try {
      return await this.client.product.update({
        where: { id },
        data: input,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return null;
      }

      throw error;
    }
  }
}
