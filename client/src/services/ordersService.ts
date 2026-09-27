import { apiFetch } from './api';
import { Order } from '@/types/order';

export type CreateOrderItemData = {
  product_id?: string;
  name: string;
  quantity: number;
  price: number;
  unit: 'piece' | 'portion';
};

export type CreateOrderData = {
  client_id?: string;
  discount_type?: 'PERCENT' | 'FIXED';
  discount_value?: number;
  order_date?: string;
  order_time?: string;
  address?: string;
  wishes?: string;
  items: CreateOrderItemData[];
};

export async function getOrders(token: string): Promise<Order[]> {
  return apiFetch('/orders', {}, token);
}

export async function createOrder(
  token: string,
  order: CreateOrderData
): Promise<Order> {
  return apiFetch(
    '/orders',
    {
      method: 'POST',
      body: JSON.stringify(order),
    },
    token
  );
}
export async function updateOrderStatus(
token: string,
orderId: string,
status: string
): Promise<Order> {
return apiFetch(
'/orders/' + orderId + '/status',
{
method: 'PATCH',
body: JSON.stringify({ status }),
},
token
);
}