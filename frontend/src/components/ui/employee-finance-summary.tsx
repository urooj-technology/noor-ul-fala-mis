import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

export interface EmployeeFinancialSummary {
  total_salary: number;
  payroll_paid: number;
  advance_paid: number;
  overall_paid: number;
  remaining_amount: number;
  currency?: { code: string; symbol?: string };
  month?: number;
  year?: number;
}

interface EmployeeFinanceSummaryProps {
  summary: EmployeeFinancialSummary | null;
  compact?: boolean;
}

function formatAmount(amount: number, currencyCode?: string): string {
  const formatted = Number(amount || 0).toFixed(2);
  return currencyCode ? `${formatted} ${currencyCode}` : formatted;
}

export function formatFinanceAmount(amount: number | undefined | null, currencyCode?: string): string {
  return formatAmount(Number(amount || 0), currencyCode);
}

export function EmployeeFinanceSummaryCards({ summary }: EmployeeFinanceSummaryProps) {
  const { t } = useLanguage();

  if (!summary) return null;

  const currency = summary.currency?.code || '';

  const items = [
    { label: t('employees.monthlySalary'), value: summary.total_salary, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    { label: t('employees.paidSalary'), value: summary.payroll_paid, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
    { label: t('employees.advancePaid'), value: summary.advance_paid, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
    { label: t('employees.totalPaid'), value: summary.overall_paid, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
    {
      label: t('employees.remaining'),
      value: summary.remaining_amount,
      color: summary.remaining_amount < 0 ? 'text-red-600' : 'text-purple-600',
      bg: summary.remaining_amount < 0 ? 'bg-red-50 border-red-200' : 'bg-purple-50 border-purple-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
      {items.map((item) => (
        <Card key={item.label} className={item.bg}>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-gray-600">{item.label}</div>
            <div className={`text-lg font-bold ${item.color}`}>
              {formatAmount(item.value, currency)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function EmployeeFinanceTableCell({ summary }: EmployeeFinanceSummaryProps) {
  const { t } = useLanguage();

  if (!summary) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const currency = summary.currency?.code || '';
  const paidPercent = summary.total_salary > 0
    ? Math.min(100, (summary.overall_paid / summary.total_salary) * 100)
    : 0;

  return (
    <div className="min-w-[180px] space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{t('employees.monthlySalary')}</span>
        <span className="font-bold text-blue-600">{formatAmount(summary.total_salary, currency)}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-green-500 via-orange-400 to-red-400"
          style={{ width: `${paidPercent}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('employees.paidSalary')}</span>
          <span className="font-semibold text-green-600">{Number(summary.payroll_paid).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('employees.advancePaid')}</span>
          <span className="font-semibold text-orange-600">{Number(summary.advance_paid).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('employees.totalPaid')}</span>
          <span className="font-semibold text-red-600">{Number(summary.overall_paid).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('employees.remaining')}</span>
          <span className={`font-semibold ${summary.remaining_amount < 0 ? 'text-red-600' : 'text-purple-600'}`}>
            {Number(summary.remaining_amount).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function aggregateFinanceSummaries(summaries: EmployeeFinancialSummary[]) {
  return summaries.reduce(
    (acc, s) => {
      acc.total_salary += Number(s.total_salary || 0);
      acc.payroll_paid += Number(s.payroll_paid || 0);
      acc.advance_paid += Number(s.advance_paid || 0);
      acc.overall_paid += Number(s.overall_paid || 0);
      acc.remaining_amount += Number(s.remaining_amount || 0);
      return acc;
    },
    { total_salary: 0, payroll_paid: 0, advance_paid: 0, overall_paid: 0, remaining_amount: 0 }
  );
}
