
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

export type UpdateProductData = CreateProductData;

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

export async function updateProduct(
  token: string,
  productId: Product['id'],
  product: UpdateProductData
): Promise<Product> {
  return apiFetch(
    `/products/${productId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(product),
    },
    token
  );
}

export async function deleteProduct(
  token: string,
  productId: Product['id']
): Promise<void> {
  await apiFetch(
    `/products/${productId}`,
    {
      method: 'DELETE',
    },
    token
  );
}
