import { apiFetch } from './api';

export type Payment = {
  id: string;
  order_id: string;
  account_id: string;
  amount: number | string;
  payment_date: string;
  created_at: string;
  account_name: string;
  account_type: 'KASPI' | 'CASH';
};

export type CreatePaymentData = {
  account_id: string;
  amount: number;
  payment_date?: string;
};

export async function getPaymentsForOrder(
  token: string,
  orderId: string
): Promise<Payment[]> {
  return apiFetch(
    `/orders/${orderId}/payments`,
    {},
    token
  );
}

export async function createPayment(
  token: string,
  orderId: string,
  payment: CreatePaymentData
): Promise<Payment> {
  return apiFetch(
    `/orders/${orderId}/payments`,
    {
      method: 'POST',
      body: JSON.stringify(payment),
    },
    token
  );
}