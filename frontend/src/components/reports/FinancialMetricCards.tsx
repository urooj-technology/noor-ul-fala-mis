import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber } from '@/lib/formatNumber';
import { CurrencyAmounts } from '@/types/financial-report';
import { TrendingDown, TrendingUp, Banknote, CircleDollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialMetricCardsProps {
  income: CurrencyAmounts;
  expenses: CurrencyAmounts;
  profit: CurrencyAmounts;
  cashBalance: CurrencyAmounts;
}

function MetricValue({ afn, usd, color }: { afn: number; usd: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className={cn('text-xl md:text-2xl font-bold tabular-nums', color)}>{formatNumber(afn)} AFN</div>
      <div className={cn('text-sm md:text-base font-medium tabular-nums opacity-80', color)}>{formatNumber(usd)} USD</div>
    </div>
  );
}

export function FinancialMetricCards({ income, expenses, profit, cashBalance }: FinancialMetricCardsProps) {
  const { t } = useLanguage();

  const items = [
    {
      label: t('reports.totalIncome'),
      icon: TrendingUp,
      afn: income.AFN,
      usd: income.USD,
      color: 'text-green-600',
      card: 'border-green-200/80 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-card',
      iconBg: 'bg-green-100 text-green-600 dark:bg-green-900/40',
    },
    {
      label: t('reports.totalExpenses'),
      icon: TrendingDown,
      afn: expenses.AFN,
      usd: expenses.USD,
      color: 'text-red-600',
      card: 'border-red-200/80 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-card',
      iconBg: 'bg-red-100 text-red-600 dark:bg-red-900/40',
    },
    {
      label: t('reports.netProfit'),
      icon: CircleDollarSign,
      afn: profit.AFN,
      usd: profit.USD,
      color: profit.AFN >= 0 ? 'text-purple-600' : 'text-red-600',
      card: profit.AFN >= 0
        ? 'border-purple-200/80 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-card'
        : 'border-red-200/80 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-card',
      iconBg: profit.AFN >= 0 ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/40' : 'bg-red-100 text-red-600 dark:bg-red-900/40',
    },
    {
      label: t('reports.cashBalance'),
      icon: Banknote,
      afn: cashBalance.AFN,
      usd: cashBalance.USD,
      color: cashBalance.AFN >= 0 ? 'text-blue-600' : 'text-red-600',
      card: cashBalance.AFN >= 0
        ? 'border-blue-200/80 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-card'
        : 'border-red-200/80 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-card',
      iconBg: cashBalance.AFN >= 0 ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40' : 'bg-red-100 text-red-600 dark:bg-red-900/40',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
      {items.map((item) => (
        <Card key={item.label} className={cn('rounded-2xl shadow-sm border', item.card)}>
          <CardContent className="p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-3 min-w-0">
                <p className="text-sm md:text-base font-semibold text-muted-foreground">{item.label}</p>
                <MetricValue afn={item.afn} usd={item.usd} color={item.color} />
              </div>
              <div className={cn('p-2.5 rounded-xl shrink-0', item.iconBg)}>
                <item.icon className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
