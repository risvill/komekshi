import { apiFetch } from './api';
import { Product } from '@/types/product';

export async function getProducts(token: string): Promise<Product[]> {
  return apiFetch('/products', {}, token);
}

export type CreateProductData = {
  name: string;
  price: number;
  unit: 'piece' | 'portion';
  pieces_per_portion?: number;
};

export async function createProduct(
  token: string,
  product: CreateProductData
): Promise<Product> {
  return apiFetch(
    '/products',
    {
      method: 'POST',
      body: JSON.stringify(product),
    },
    token
  );
}