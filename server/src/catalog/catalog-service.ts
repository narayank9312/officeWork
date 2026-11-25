import { NotFoundError } from '../errors';
import { byRatingThenPopularity, Product, ProductSource } from './product';

export interface CategoryProducts {
  category: string;
  topRated: Product[];
  additional: Product[];
}

export class CatalogService {
  constructor(
    private readonly source: ProductSource,
    private readonly featuredCount = 5,
    private readonly categoryTopRatedCount = 3,
  ) {}

  async getFeaturedProducts(): Promise<Product[]> {
    const products = await this.source.listProducts();
    return [...products].sort(byRatingThenPopularity).slice(0, this.featuredCount);
  }

  async getCategories(): Promise<string[]> {
    const products = await this.source.listProducts();
    return [...new Set(products.map((product) => product.category))].sort((a, b) => a.localeCompare(b));
  }

  async getProductsByCategory(category: string): Promise<CategoryProducts> {
    const products = (await this.source.listProducts())
      .filter((product) => product.category === category)
      .sort(byRatingThenPopularity);

    if (products.length === 0) {
      throw new NotFoundError('Category not found');
    }

    return {
      category,
      topRated: products.slice(0, this.categoryTopRatedCount),
      additional: products.slice(this.categoryTopRatedCount),
    };
  }

  async searchProducts(term: string): Promise<Product[]> {
    const query = term.trim().toLocaleLowerCase();
    const products = await this.source.listProducts();

    return products.filter((product) =>
      [product.title, product.description, product.category].some((text) =>
        text.toLocaleLowerCase().includes(query),
      ),
    );
  }

  async getProduct(id: number): Promise<Product> {
    const product = await this.source.getProductById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return product;
  }
}
