import { CurrencyAmounts, FinancialReport } from '@/types/financial-report';

const emptyAmounts: CurrencyAmounts = { AFN: 0, USD: 0 };

export function sumCurrencyAmounts(a?: CurrencyAmounts, b?: CurrencyAmounts): CurrencyAmounts {
  return {
    AFN: (a?.AFN || 0) + (b?.AFN || 0),
    USD: (a?.USD || 0) + (b?.USD || 0),
  };
}

export function getPayrollTotal(report?: FinancialReport | null): CurrencyAmounts {
  if (!report?.expenses) return emptyAmounts;
  if (report.expenses.payroll_total) return report.expenses.payroll_total;
  return sumCurrencyAmounts(report.expenses.payroll, report.expenses.advances);
}
