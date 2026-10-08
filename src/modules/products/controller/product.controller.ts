import type { RequestHandler } from 'express';
import type {
  CreateProductInput,
  ListProductsQuery,
  ProductParams,
  UpdateProductInput,
} from '../schema/product.schemas.js';
import { serializeProduct } from '../serializer/product.serializer.js';
import type { ProductService } from '../service/product.service.js';

export interface ProductController {
  list: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
}

export function createProductController(
  productService: ProductService,
): ProductController {
  return {
    async list(request, response) {
      const { query } = response.locals.validated as {
        query: ListProductsQuery;
      };

      const result = await productService.list(request.auth!, query);

      response.status(200).json({
        products: result.products.map(serializeProduct),
        pagination: result.pagination,
      });
    },

    async create(request, response) {
      const { body } = response.locals.validated as {
        body: CreateProductInput;
      };

      const product = await productService.create(request.auth!, body);

      response.status(201).json({
        product: serializeProduct(product),
      });
    },

    async update(request, response) {
      const { params, body } = response.locals.validated as {
        params: ProductParams;
        body: UpdateProductInput;
      };

      const product = await productService.update(
        request.auth!,
        params.id,
        body,
      );

      response.status(200).json({
        product: serializeProduct(product),
      });
    },
  };
}
