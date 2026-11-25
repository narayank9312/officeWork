export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: {
    rate: number;
    count: number;
  };
}

/** External catalogue implementations are replaceable without changing HTTP routes or the UI. */
export interface ProductSource {
  listProducts(): Promise<Product[]>;
  getProductById(id: number): Promise<Product | null>;
}

export function byRatingThenPopularity(a: Product, b: Product): number {
  return b.rating.rate - a.rating.rate || b.rating.count - a.rating.count || a.id - b.id;
}
