import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PrismaProductRepository } from '../../src/modules/products/repository/product.repository.js';
import {
  disconnectTestDatabase,
  resetTestDatabase,
  testPrisma,
} from '../helpers/database.js';

describe('PrismaProductRepository', () => {
  const repository = new PrismaProductRepository(testPrisma);

  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it('creates and finds a product by id', async () => {
    const created = await repository.create({
      name: 'Mechanical Keyboard',
      description: 'Mechanical keyboard for work and gaming',
      priceCents: 19_990n,
      active: true,
    });

    const found = await repository.findById(created.id);

    expect(found).toEqual(created);

    expect(found).toMatchObject({
      id: created.id,
      name: 'Mechanical Keyboard',
      description: 'Mechanical keyboard for work and gaming',
      priceCents: 19_990n,
      active: true,
    });
  });

  it('returns null when the product id does not exist', async () => {
    const product = await repository.findById(randomUUID());

    expect(product).toBeNull();
  });

  it('lists only active products when activeOnly is true', async () => {
    await repository.create({
      name: 'Active product',
      description: null,
      priceCents: 10_000n,
      active: true,
    });

    await repository.create({
      name: 'Inactive product',
      description: null,
      priceCents: 20_000n,
      active: false,
    });

    const products = await repository.list({
      activeOnly: true,
      skip: 0,
      take: 20,
    });

    const total = await repository.count(true);

    expect(products).toHaveLength(1);
    expect(products[0]?.name).toBe('Active product');
    expect(products[0]?.active).toBe(true);
    expect(total).toBe(1);
  });

  it('lists active and inactive products when activeOnly is false', async () => {
    await repository.create({
      name: 'Active product',
      description: null,
      priceCents: 10_000n,
      active: true,
    });

    await repository.create({
      name: 'Inactive product',
      description: null,
      priceCents: 20_000n,
      active: false,
    });

    const products = await repository.list({
      activeOnly: false,
      skip: 0,
      take: 20,
    });

    const total = await repository.count(false);

    expect(products).toHaveLength(2);
    expect(products.map((product) => product.active).sort()).toEqual([
      false,
      true,
    ]);
    expect(total).toBe(2);
  });

  it('applies pagination using skip and take', async () => {
    await repository.create({
      name: 'Product 1',
      description: null,
      priceCents: 1_000n,
      active: true,
    });

    await repository.create({
      name: 'Product 2',
      description: null,
      priceCents: 2_000n,
      active: true,
    });

    await repository.create({
      name: 'Product 3',
      description: null,
      priceCents: 3_000n,
      active: true,
    });

    const firstPage = await repository.list({
      activeOnly: true,
      skip: 0,
      take: 2,
    });

    const secondPage = await repository.list({
      activeOnly: true,
      skip: 2,
      take: 2,
    });

    expect(firstPage).toHaveLength(2);
    expect(secondPage).toHaveLength(1);

    const returnedIds = [
      ...firstPage.map((product) => product.id),
      ...secondPage.map((product) => product.id),
    ];

    expect(new Set(returnedIds).size).toBe(3);
  });

  it('updates only the provided product fields', async () => {
    const created = await repository.create({
      name: 'Mechanical Keyboard',
      description: 'Original description',
      priceCents: 19_990n,
      active: true,
    });

    const updated = await repository.updateById(created.id, {
      active: false,
    });

    expect(updated).toMatchObject({
      id: created.id,
      name: 'Mechanical Keyboard',
      description: 'Original description',
      priceCents: 19_990n,
      active: false,
    });
  });

  it('updates name, description and price', async () => {
    const created = await repository.create({
      name: 'Old product',
      description: 'Old description',
      priceCents: 10_000n,
      active: true,
    });

    const updated = await repository.updateById(created.id, {
      name: 'Updated product',
      description: null,
      priceCents: 15_000n,
    });

    expect(updated).toMatchObject({
      id: created.id,
      name: 'Updated product',
      description: null,
      priceCents: 15_000n,
      active: true,
    });
  });

  it('returns null when updating a product that does not exist', async () => {
    const updated = await repository.updateById(randomUUID(), {
      active: false,
    });

    expect(updated).toBeNull();
  });
});
