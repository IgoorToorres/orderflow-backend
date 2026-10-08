import { describe, expect, it } from 'vitest';
import {
  createProductBodySchema,
  listProductsQuerySchema,
  productParamsSchema,
  updateProductBodySchema,
} from './product.schemas.js';

describe('product schemas', () => {
  it('accepts a valid product', () => {
    const result = createProductBodySchema.safeParse({
      name: 'Mechanical Keyboard',
      description: 'Mechanical keyboard with RGB',
      priceCents: 19_990,
      active: true,
    });

    expect(result.success).toBe(true);
  });

  it.each([0, -1, 10.5])('rejects invalid priceCents: %s', (priceCents) => {
    const result = createProductBodySchema.safeParse({
      name: 'Mechanical Keyboard',
      priceCents,
    });

    expect(result.success).toBe(false);
  });

  it('rejects an empty patch', () => {
    const result = updateProductBodySchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('accepts a partial patch', () => {
    const result = updateProductBodySchema.safeParse({
      active: false,
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid product UUID', () => {
    const result = productParamsSchema.safeParse({
      id: 'invalid-id',
    });

    expect(result.success).toBe(false);
  });

  it('applies pagination defaults', () => {
    const result = listProductsQuerySchema.parse({});

    expect(result).toEqual({
      page: 1,
      limit: 20,
    });
  });

  it('rejects a limit greater than 100', () => {
    const result = listProductsQuerySchema.safeParse({
      page: '1',
      limit: '101',
    });

    expect(result.success).toBe(false);
  });
});
