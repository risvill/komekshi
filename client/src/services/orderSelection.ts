import { Product } from '@/types/product';

let selectedClientId: string | undefined;

let selectedProducts: Product[] = [];

export function setSelectedClient(
  clientId: string | undefined
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

  selectedProducts = [];

  return value;
}