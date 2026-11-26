import { Product } from '@/types/product';

let selectedClientId: string | null | undefined;

let selectedProducts: Product[] | undefined;

export function setSelectedClient(
  clientId: string | null | undefined
) {
  selectedClientId = clientId;
}

export function consumeSelectedClient() {
  const value = selectedClientId;

  selectedClientId = undefined;

  return value;
}

export function setSelectedProducts(
  products: Product[]
) {
  selectedProducts = products;
}

export function consumeSelectedProducts() {
  const value = selectedProducts;

  selectedProducts = undefined;

  return value;
}