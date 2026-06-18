import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/formatNumber';

interface ReportPageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function ReportPageHeader({ icon: Icon, title, subtitle, actions, className }: ReportPageHeaderProps) {
  return (
    <div className={cn('rounded-2xl border bg-card shadow-sm p-5 md:p-6', className)}>
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
        <div className="flex items-start gap-4 min-w-0">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm md:text-base text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

interface ReportSectionTitleProps {
  children: ReactNode;
  className?: string;
}

export function ReportSectionTitle({ children, className }: ReportSectionTitleProps) {
  return (
    <h2 className={cn('text-lg md:text-xl font-semibold tracking-tight text-foreground', className)}>
      {children}
    </h2>
  );
}

interface ReportEmptyStateProps {
  message: string;
}

export function ReportEmptyState({ message }: ReportEmptyStateProps) {
  return (
    <div className="rounded-2xl border bg-card shadow-sm py-20 px-6 text-center">
      <p className="text-base text-muted-foreground">{message}</p>
    </div>
  );
}

interface FinancialSummaryBarProps {
  profitLabel: string;
  profitAfn: number;
  profitUsd: number;
  netCashLabel: string;
  netCashAfn: number;
  netCashUsd: number;
}

export function FinancialSummaryBar({
  profitLabel,
  profitAfn,
  profitUsd,
  netCashLabel,
  netCashAfn,
  netCashUsd,
}: FinancialSummaryBarProps) {
  return (
    <div className="rounded-2xl border bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 shadow-sm p-5 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{profitLabel}</p>
          <p className={cn('text-xl md:text-2xl font-bold', profitAfn >= 0 ? 'text-green-600' : 'text-red-600')}>
            {formatNumber(profitAfn)} AFN
            <span className="text-base font-semibold text-muted-foreground ml-2">
              / {formatNumber(profitUsd)} USD
            </span>
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{netCashLabel}</p>
          <p className={cn('text-xl md:text-2xl font-bold', netCashAfn >= 0 ? 'text-purple-600' : 'text-red-600')}>
            {formatNumber(netCashAfn)} AFN
            <span className="text-base font-semibold text-muted-foreground ml-2">
              / {formatNumber(netCashUsd)} USD
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
