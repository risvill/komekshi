export type OrderItemFromApi = {
  id: string;
  product_id: string | null;
  name: string;
  quantity: string;
  price: string;
  unit: 'piece' | 'portion';
};

export type Order = {
  id: string;
  client_id: string | null;
  client_name: string | null;
  status: string;
  subtotal: string;
  discount_type: 'PERCENT' | 'FIXED' | null;
  discount_value: string | null;
  total: string;
  order_date: string | null;
  order_time: string | null;
  address: string | null;
  wishes: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItemFromApi[];
};