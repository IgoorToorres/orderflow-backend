import type { Product } from '../../../generated/prisma/client.js';

export interface ProductResponse {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export function serializeProduct(product: Product): ProductResponse {
  const priceCents = Number(product.priceCents);

  if (!Number.isSafeInteger(priceCents)) {
    throw new Error('Product price exceeds the safe JSON integer range');
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    priceCents,
    active: product.active,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
