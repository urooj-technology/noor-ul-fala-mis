export interface CurrencyAmounts {
  AFN: number;
  USD: number;
}

export interface FinancialReport {
  period: string;
  date_range: { start: string | null; end: string | null };
  generated_at?: string;
  income: {
    student: CurrencyAmounts;
    student_payments: CurrencyAmounts;
    rental: CurrencyAmounts;
    rental_income: CurrencyAmounts;
    other: CurrencyAmounts;
    other_income: CurrencyAmounts;
    total: CurrencyAmounts;
  };
  expenses: {
    payroll: CurrencyAmounts;
    general: CurrencyAmounts;
    general_expenses: CurrencyAmounts;
    advances: CurrencyAmounts;
    total: CurrencyAmounts;
    breakdown?: {
      payroll: CurrencyAmounts;
      general_expenses: CurrencyAmounts;
      advances: CurrencyAmounts;
    };
  };
  cash_outflows: {
    advances: CurrencyAmounts;
    total: CurrencyAmounts;
  };
  profit: CurrencyAmounts;
  net_cash_position: CurrencyAmounts;
  income_breakdown?: Array<{ category: string; name: string; currency: string; amount: number }>;
  expense_breakdown?: Array<{ category: string; name: string; currency: string; amount: number }>;
  cash_outflow_breakdown?: Array<{ category: string; name: string; currency: string; amount: number }>;
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type ReportTab = 'overview' | 'payroll' | 'students' | 'rental' | 'accounting';
