export type OrderItem = {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  unit: 'piece' | 'portion';
};