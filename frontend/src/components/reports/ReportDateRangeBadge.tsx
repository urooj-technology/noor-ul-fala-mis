import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { formatDateByCalendarType } from '@/utils/calendar';

interface ReportDateRangeBadgeProps {
  dateRange?: { start: string | null; end: string | null } | null;
  period?: string;
}

export function ReportDateRangeBadge({ dateRange, period }: ReportDateRangeBadgeProps) {
  const { t, language } = useLanguage();
  const { calendarType, dateFormat } = useCalendar();

  if (!dateRange) return null;

  const formatDate = (iso: string) =>
    formatDateByCalendarType(iso, calendarType, language as 'fa' | 'ps' | 'en', dateFormat);

  const label = dateRange.start && dateRange.end
    ? `${formatDate(dateRange.start)} → ${formatDate(dateRange.end)}`
    : dateRange.start
      ? `${t('reports.startDate')}: ${formatDate(dateRange.start)}`
      : dateRange.end
        ? `${t('reports.endDate')}: ${formatDate(dateRange.end)}`
        : t('reports.allTime');

  const periodLabels: Record<string, string> = {
    daily: t('reports.daily'),
    weekly: t('reports.weekly'),
    monthly: t('reports.monthly'),
    yearly: t('reports.yearly'),
    custom: t('reports.custom'),
  };
  const periodLabel = period ? periodLabels[period] || period : '';

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="text-sm font-medium px-3 py-1.5 rounded-lg gap-1.5">
        <Calendar className="h-3.5 w-3.5 shrink-0" />
        {periodLabel && <span>{periodLabel}:</span>}
        <span className="font-semibold" dir="rtl">{label}</span>
      </Badge>
    </div>
  );
}
