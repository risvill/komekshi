import { apiFetch } from './api';
import { Client } from '@/types/client';

type CreateClientData = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
};

export type ClientOrderItem = {
  id: string;
  name: string;
  quantity: string;
  price: string;
  unit: 'piece' | 'portion';
};

export type ClientOrder = {
  id: string;
  status: string;
  total: string;
  order_date: string | null;
  order_time: string | null;
  address: string | null;
  created_at: string;
  items: ClientOrderItem[];
};

export type ClientDetails = {
  client: Client;
  orders: ClientOrder[];
  latest_address: string | null;
};

export async function getClients(
  token: string
): Promise<Client[]> {
  return apiFetch('/clients', {}, token);
}

export async function createClient(
  token: string,
  client: CreateClientData
): Promise<Client> {
  return apiFetch(
    '/clients',
    {
      method: 'POST',
      body: JSON.stringify(client),
    },
    token
  );
}

export async function getClientDetails(
  token: string,
  clientId: string
): Promise<ClientDetails> {
  return apiFetch(
    `/clients/${clientId}`,
    {},
    token
  );
}

export async function updateClient(
  token: string,
  clientId: string,
  client: {
    name: string;
    phone?: string;
  }
): Promise<Client> {
  return apiFetch(
    `/clients/${clientId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(client),
    },
    token
  );
}