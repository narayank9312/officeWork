import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute } from '../http/async-route';
import { CatalogService } from './catalog-service';

const productIdSchema = z.coerce.number().int().positive();
const searchSchema = z.object({
  search: z.string().trim().min(1).max(100),
});

export function createCatalogRouter(catalog: CatalogService): Router {
  const router = Router();

  router.get(
    '/products/featured',
    asyncRoute(async (_request, response) => {
      const products = await catalog.getFeaturedProducts();
      response.json({ products });
    }),
  );

  router.get(
    '/products',
    asyncRoute(async (request, response) => {
      const { search } = searchSchema.parse(request.query);
      const products = await catalog.searchProducts(search);
      response.json({ products, query: search });
    }),
  );

  router.get(
    '/products/:id',
    asyncRoute(async (request, response) => {
      const id = productIdSchema.parse(request.params.id);
      const product = await catalog.getProduct(id);
      response.json({ product });
    }),
  );

  router.get(
    '/categories',
    asyncRoute(async (_request, response) => {
      const categories = await catalog.getCategories();
      response.json({ categories });
    }),
  );

  router.get(
    '/categories/:category/products',
    asyncRoute(async (request, response) => {
      const category = z.string().trim().min(1).max(100).parse(request.params.category);
      response.json(await catalog.getProductsByCategory(category));
    }),
  );

  return router;
}
