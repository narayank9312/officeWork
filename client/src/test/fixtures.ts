import { Product } from '../types';

function product(id: number, title: string, category: string, rate: number): Product {
  return {
    id,
    title,
    category,
    price: 10 + id * 5,
    description: `Description for ${title}.`,
    image: `https://images.example.test/${id}.jpg`,
    rating: { rate, count: id * 10 },
  };
}

export const cottonShirt = product(1, 'Cotton Essential T-Shirt', 'clothing', 4.8);
export const leatherBag = product(2, 'Leather Weekend Bag', 'clothing', 4.8);
export const headphones = product(3, 'Studio Headphones', 'electronics', 4.6);
export const ring = product(5, 'Silver Ring', 'jewelry', 4.4);
export const backpack = product(6, 'Canvas Backpack', 'clothing', 4.4);
export const overshirt = product(7, 'Linen Overshirt', 'clothing', 3.9);
export const featuredProducts = [leatherBag, cottonShirt, headphones, ring, backpack];
