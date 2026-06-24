import { SHAMSI_MONTHS_DARI, SHAMSI_MONTHS_PASHTO } from '@/utils/calendar';

export interface PeriodSummary {
  total_salary?: number;
  payroll_paid?: number;
  advance_paid?: number;
  overall_paid?: number;
  remaining_amount?: number;
}

export function formatMoney(value: string | number | undefined | null, currency = '') {
  const num = typeof value === 'string' ? parseFloat(value) || 0 : Number(value ?? 0);
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(num);
  return currency ? `${formatted} ${currency}` : formatted;
}

export function getShamsiMonthLabel(month: number | string, language: 'fa' | 'ps' = 'fa') {
  const index = typeof month === 'string' ? parseInt(month, 10) - 1 : month - 1;
  const names = language === 'ps' ? SHAMSI_MONTHS_PASHTO : SHAMSI_MONTHS_DARI;
  return names[index] || String(month);
}

export function buildShamsiMonthOptions(language: 'fa' | 'ps' = 'fa') {
  const names = language === 'ps' ? SHAMSI_MONTHS_PASHTO : SHAMSI_MONTHS_DARI;
  return names.map((label, index) => ({
    value: String(index + 1),
    label,
  }));
}

export function sumPageAmounts<T>(items: T[], getAmount: (item: T) => number) {
  return items.reduce((sum, item) => sum + getAmount(item), 0);
}
