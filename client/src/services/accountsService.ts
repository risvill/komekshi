import { apiFetch } from './api';

export type AccountType = 'KASPI' | 'CASH';

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateAccountData = {
  name: string;
  type: AccountType;
};

export async function getAccounts(
  token: string
): Promise<Account[]> {
  return apiFetch('/accounts', {}, token);
}

export async function createAccount(
  token: string,
  account: CreateAccountData
): Promise<Account> {
  return apiFetch(
    '/accounts',
    {
      method: 'POST',
      body: JSON.stringify(account),
    },
    token
  );
}