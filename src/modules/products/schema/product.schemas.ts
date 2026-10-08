import { z } from 'zod';

export const productPriceCentsSchema = z
  .number()
  .int('priceCents must be an integer')
  .positive('priceCents must be greater than zero')
  .max(
    Number.MAX_SAFE_INTEGER,
    'priceCents exceeds the maximum supported value',
  );

const productNameSchema = z.string().trim().min(2).max(150);

const productDescriptionSchema = z.string().trim().max(2_000).nullable();

export const createProductBodySchema = z
  .object({
    name: productNameSchema,
    description: productDescriptionSchema.optional(),
    priceCents: productPriceCentsSchema,
    active: z.boolean().optional().default(true),
  })
  .strict();

export const updateProductBodySchema = z
  .object({
    name: productNameSchema.optional(),
    description: productDescriptionSchema.optional(),
    priceCents: productPriceCentsSchema.optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided',
  });

export const productParamsSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export const listProductsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type CreateProductInput = z.infer<typeof createProductBodySchema>;
export type UpdateProductInput = z.infer<typeof updateProductBodySchema>;
export type ProductParams = z.infer<typeof productParamsSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
