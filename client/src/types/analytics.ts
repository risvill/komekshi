export type AnalyticsPeriod = {
  start_date: string;
  end_date: string;
};

export type SalesSummary = {
  orders_count: number;
  total_sales: number;
  average_check: number;
  pieces_sold: number;
  portions_sold: number;
};

export type PreviousSalesSummary = {
  orders_count: number;
  total_sales: number;
  average_check: number;
};

export type SalesGrowth = {
  total_sales: number | null;
  orders_count: number | null;
  average_check: number | null;
};

export type ProductAnalytics = {
  product_id: string | null;
  name: string;
  unit: 'piece' | 'portion';
  quantity_sold: number;
  orders_count: number;
  gross_revenue: number;
  revenue: number;
};

export type UnsoldProduct = {
  product_id: string;
  name: string;
  unit: 'piece' | 'portion';
  quantity_sold: number;
  orders_count: number;
  revenue: number;
};

export type SalesDynamics = {
  date: string;
  orders_count: number;
  total_sales: number;
};

export type WeekdayAnalytics = {
  weekday: number;
  orders_count: number;
  total_sales: number;
};

export type SalesAnalytics = {
  period: AnalyticsPeriod;
  summary: SalesSummary;
  previous_period: PreviousSalesSummary;
  growth: SalesGrowth;
  products: ProductAnalytics[];
  unsold_products: UnsoldProduct[];
  dynamics: SalesDynamics[];
  weekdays: WeekdayAnalytics[];
};

export type FinancialSummary = {
  total_income: number;
  payments_count: number;
  paid_orders_count: number;
  average_daily_income: number;
};

export type PreviousFinancialSummary = {
  total_income: number;
  payments_count: number;
  average_daily_income: number;
};

export type FinancialGrowth = {
  total_income: number | null;
  payments_count: number | null;
  average_daily_income: number | null;
};

export type FinancialDynamics = {
  date: string;
  total_income: number;
  payments_count: number;
};

export type AccountAnalytics = {
  account_id: string;
  name: string;
  type: 'KASPI' | 'CASH';
  is_active: boolean;
  total_income: number;
  payments_count: number;
  percentage: number;
};

export type OutstandingPayments = {
  total_outstanding: number;
  unpaid_orders_count: number;
  completed_orders_debt: number;
  active_orders_outstanding: number;
};

export type BestIncomeDay = {
  date: string;
  total_income: number;
};

export type BestIncomeMonth = {
  month: string;
  total_income: number;
};

export type IncomeForecast = {
  current_month_income: number;
  elapsed_days: number;
  total_days: number;
  average_daily_income: number;
  predicted_income: number;
};

export type FinancialAnalytics = {
  period: AnalyticsPeriod;
  summary: FinancialSummary;
  previous_period: PreviousFinancialSummary;
  growth: FinancialGrowth;
  dynamics: FinancialDynamics[];
  accounts: AccountAnalytics[];
  outstanding: OutstandingPayments;
  best_day: BestIncomeDay | null;
  best_month: BestIncomeMonth | null;
  forecast: IncomeForecast;
};