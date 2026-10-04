import { apiFetch } from './api';

export type AccountType = 'KASPI' | 'CASH';

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  balance: number | string;
};

export type CreateAccountData = {
  name: string;
  type: AccountType;
};

export type UpdateAccountData = {
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

export async function updateAccount(
  token: string,
  accountId: string,
  account: UpdateAccountData
): Promise<Account> {
  return apiFetch(
    `/accounts/${accountId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(account),
    },
    token
  );
}

export async function deleteAccount(
  token: string,
  accountId: string,
  targetAccountId?: string
): Promise<void> {
  await apiFetch(
    `/accounts/${accountId}`,
    {
      method: 'DELETE',
      body: JSON.stringify({
        target_account_id: targetAccountId,
      }),
    },
    token
  );
}