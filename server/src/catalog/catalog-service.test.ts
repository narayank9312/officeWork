import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../errors';
import { FakeProductSource } from '../test/fixtures';
import { CatalogService } from './catalog-service';

const catalog = new CatalogService(new FakeProductSource());

describe('CatalogService', () => {
  it('selects exactly five featured products by rating, then review count', async () => {
    const products = await catalog.getFeaturedProducts();

    expect(products).toHaveLength(5);
    expect(products.map((product) => product.id)).toEqual([2, 1, 3, 6, 5]);
    expect(products.map((product) => product.rating.rate)).toEqual([4.8, 4.8, 4.6, 4.4, 4.4]);
  });

  it('groups three category top-rated products and additional products without overlap', async () => {
    const result = await catalog.getProductsByCategory('clothing');

    expect(result.topRated.map((product) => product.id)).toEqual([2, 1, 6]);
    expect(result.additional.map((product) => product.id)).toEqual([7]);
    expect([...result.topRated, ...result.additional]).toHaveLength(4);
  });

  it('returns sorted unique categories', async () => {
    await expect(catalog.getCategories()).resolves.toEqual(['clothing', 'electronics', 'jewelry', 'kitchen']);
  });

  it('rejects an unknown category', async () => {
    await expect(catalog.getProductsByCategory('unknown')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('searches title and description case-insensitively and trims whitespace', async () => {
    const products = await catalog.searchProducts('  CoTtOn  ');
    expect(products.map((product) => product.id)).toEqual([1, 7]);
  });

  it('searches category text and returns no unrelated products', async () => {
    const products = await catalog.searchProducts('electronics');
    expect(products.map((product) => product.id)).toEqual([3]);
  });

  it('returns no products for a term with no match', async () => {
    await expect(catalog.searchProducts('spaceship')).resolves.toEqual([]);
  });

  it('gets a product detail and rejects unknown IDs', async () => {
    await expect(catalog.getProduct(1)).resolves.toMatchObject({ title: 'Cotton Essential T-Shirt' });
    await expect(catalog.getProduct(999)).rejects.toBeInstanceOf(NotFoundError);
  });
});
