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

export interface CategoryProducts {
  category: string;
  topRated: Product[];
  additional: Product[];
}

export interface EnquiryInput {
  productId: number;
  name: string;
  email: string;
  phone?: string;
  message?: string;
}
