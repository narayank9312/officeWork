import { z } from 'zod';
import { AppConfig } from '../config';
import { CatalogueUnavailableError } from '../errors';
import { Product, ProductSource } from './product';

const productSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  price: z.number().nonnegative(),
  description: z.string(),
  category: z.string().min(1),
  image: z.string().url(),
  rating: z.object({
    rate: z.number().nonnegative(),
    count: z.number().int().nonnegative(),
  }),
});

const productsSchema = z.array(productSchema);

export class FakeStoreProductSource implements ProductSource {
  private cachedProducts: Product[] | undefined;
  private cacheExpiresAt = 0;
  private pendingRequest: Promise<Product[]> | undefined;

  constructor(
    private readonly config: Pick<AppConfig, 'FAKE_STORE_API_URL' | 'PRODUCT_CACHE_TTL_MS' | 'UPSTREAM_TIMEOUT_MS'>,
  ) {}

  async listProducts(): Promise<Product[]> {
    if (this.cachedProducts && Date.now() < this.cacheExpiresAt) {
      return this.cachedProducts;
    }

    if (!this.pendingRequest) {
      this.pendingRequest = this.fetchProducts();
    }

    try {
      const products = await this.pendingRequest;
      this.cachedProducts = products;
      this.cacheExpiresAt = Date.now() + this.config.PRODUCT_CACHE_TTL_MS;
      return products;
    } finally {
      this.pendingRequest = undefined;
    }
  }

  async getProductById(id: number): Promise<Product | null> {
    const products = await this.listProducts();
    return products.find((product) => product.id === id) ?? null;
  }

  private async fetchProducts(): Promise<Product[]> {
    try {
      const response = await fetch(`${this.config.FAKE_STORE_API_URL.replace(/\/$/, '')}/products`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.config.UPSTREAM_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`Unexpected upstream status ${response.status}`);
      }

      const products = productsSchema.parse(await response.json());
      return products;
    } catch (error) {
      throw new CatalogueUnavailableError({ cause: error });
    }
  }
}
