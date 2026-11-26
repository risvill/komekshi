import { apiFetch } from './api';

import {
  SalesAnalytics,
  FinancialAnalytics,
} from '@/types/analytics';

export async function getSalesAnalytics(
  token: string,
  startDate: string,
  endDate: string
): Promise<SalesAnalytics> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });

  return apiFetch(
    `/analytics/sales?${params.toString()}`,
    {},
    token
  );
}

export async function getFinancialAnalytics(
  token: string,
  startDate: string,
  endDate: string
): Promise<FinancialAnalytics> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });

  return apiFetch(
    `/analytics/financial?${params.toString()}`,
    {},
    token
  );
}