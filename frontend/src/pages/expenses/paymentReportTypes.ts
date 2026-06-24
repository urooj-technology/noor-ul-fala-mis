export type PaymentReportType = 'payroll' | 'advance' | 'expense';

export interface PaymentReportRow {
  id: string;
  payment_type: PaymentReportType;
  payment_date: string;
  payment_date_shamsi?: { formatted?: string };
  payment_date_qamari?: { formatted?: string };
  amount: number;
  currency: string;
  employee_name?: string | null;
  employee_position?: string | null;
  period_month?: number | null;
  period_year?: number | null;
  category_name?: string | null;
  user_name?: string | null;
  description?: string;
}

export interface PaymentReportSummary {
  payroll_total: number;
  advance_total: number;
  expense_total: number;
  grand_total: number;
  payroll_count?: number;
  advance_count?: number;
  expense_count?: number;
  count?: number;
}
