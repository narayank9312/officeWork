import { Product, ProductSource } from '../catalog/product';

const definitions: Array<[number, string, number, string, string, number, number]> = [
  [1, 'Cotton Essential T-Shirt', 25, 'A soft everyday staple.', 'clothing', 4.8, 100],
  [2, 'Leather Weekend Bag', 120, 'Roomy enough for a short escape.', 'clothing', 4.8, 200],
  [3, 'Studio Headphones', 90, 'Rich sound for focused listening.', 'electronics', 4.6, 50],
  [4, 'Cast Iron Pan', 45, 'A durable kitchen workhorse.', 'kitchen', 4.1, 20],
  [5, 'Silver Ring', 55, 'A simple band with a bright finish.', 'jewelry', 4.4, 80],
  [6, 'Canvas Backpack', 60, 'Carry the essentials in comfort.', 'clothing', 4.4, 300],
  [7, 'Linen Overshirt', 75, 'Woven with a cotton blend for warmer days.', 'clothing', 3.9, 30],
];

export const testProducts: Product[] = definitions.map(
  ([id, title, price, description, category, rate, count]) => ({
    id,
    title,
    price,
    description,
    category,
    image: `https://images.example.test/${id}.jpg`,
    rating: { rate, count },
  }),
);

export class FakeProductSource implements ProductSource {
  constructor(readonly products: Product[] = testProducts) {}

  async listProducts(): Promise<Product[]> {
    return this.products;
  }

  async getProductById(id: number): Promise<Product | null> {
    return this.products.find((product) => product.id === id) ?? null;
  }
}
