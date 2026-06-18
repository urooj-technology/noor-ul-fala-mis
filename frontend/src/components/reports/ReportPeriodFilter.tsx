import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker-calendar';
import { useLanguage } from '@/contexts/LanguageContext';
import { ReportPeriod } from '@/types/financial-report';
import { RefreshCw, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportPeriodFilterProps {
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  onPeriodChange: (period: ReportPeriod) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export function ReportPeriodFilter({
  period,
  startDate,
  endDate,
  onPeriodChange,
  onStartDateChange,
  onEndDateChange,
  onRefresh,
  loading,
}: ReportPeriodFilterProps) {
  const { t } = useLanguage();

  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground">
        <CalendarRange className="h-4 w-4" />
        {t('reports.period')}
      </div>
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="space-y-1.5">
          <Select value={period} onValueChange={(v) => onPeriodChange(v as ReportPeriod)}>
            <SelectTrigger className="w-full sm:w-40 h-10 text-sm font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">{t('reports.daily')}</SelectItem>
              <SelectItem value="weekly">{t('reports.weekly')}</SelectItem>
              <SelectItem value="monthly">{t('reports.monthly')}</SelectItem>
              <SelectItem value="yearly">{t('reports.yearly')}</SelectItem>
              <SelectItem value="custom">{t('reports.custom')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {period === 'custom' && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t('reports.startDate')}</label>
              <DatePicker value={startDate} onChange={onStartDateChange} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t('reports.endDate')}</label>
              <DatePicker value={endDate} onChange={onEndDateChange} />
            </div>
          </>
        )}

        {onRefresh && (
          <Button variant="outline" onClick={onRefresh} disabled={loading} className="h-10 px-4">
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            {t('reports.refresh')}
          </Button>
        )}
      </div>
    </div>
  );
}
