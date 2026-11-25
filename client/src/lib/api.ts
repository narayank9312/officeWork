import { CategoryProducts, EnquiryInput, Product } from '../types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string; code?: string };
    } | null;
    throw new ApiError(
      body?.error?.message ?? 'The request could not be completed. Please try again.',
      response.status,
      body?.error?.code ?? 'REQUEST_FAILED',
    );
  }

  return (await response.json()) as T;
}

export const catalogApi = {
  async getFeaturedProducts(signal?: AbortSignal): Promise<Product[]> {
    const data = await request<{ products: Product[] }>('/products/featured', { signal });
    return data.products;
  },

  async getCategories(signal?: AbortSignal): Promise<string[]> {
    const data = await request<{ categories: string[] }>('/categories', { signal });
    return data.categories;
  },

  async getCategoryProducts(category: string, signal?: AbortSignal): Promise<CategoryProducts> {
    return request<CategoryProducts>(`/categories/${encodeURIComponent(category)}/products`, { signal });
  },

  async searchProducts(query: string, signal?: AbortSignal): Promise<Product[]> {
    const data = await request<{ products: Product[] }>(`/products?search=${encodeURIComponent(query)}`, { signal });
    return data.products;
  },

  async getProduct(id: string, signal?: AbortSignal): Promise<Product> {
    const data = await request<{ product: Product }>(`/products/${encodeURIComponent(id)}`, { signal });
    return data.product;
  },

  async submitEnquiry(enquiry: EnquiryInput): Promise<{ message: string }> {
    return request<{ message: string }>('/enquiries', {
      method: 'POST',
      body: JSON.stringify(enquiry),
    });
  },
};
