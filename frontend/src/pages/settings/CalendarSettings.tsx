import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar, CalendarType } from '@/contexts/CalendarContext';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatToday, type DateFormat } from '@/utils/calendar';
import useUpdate from '@/api/useUpdate';

const CalendarSettings: React.FC = () => {
  const { t, language } = useLanguage();
  const { calendarType, setCalendarType, dateFormat, setDateFormat } = useCalendar();
  const { user } = useAuth();

  const { handleUpdate } = useUpdate<{ preferred_calendar: string }>({
    queryKey: ['profile'],
  });

  const calendarOptions: { value: CalendarType; label: string; description: string }[] = [
    {
      value: 'shamsi',
      label: t('common.calendar.shamsi', 'شمسی'),
      description: t('common.calendar.shamsiDescription', 'Afghanistan Shamsi (Jalali) Calendar'),
    },
    {
      value: 'qamari',
      label: t('common.calendar.qamari', 'قمری'),
      description: t('common.calendar.qamariDescription', 'Qamari (Hijri Lunar) Calendar'),
    },
  ];

  const dateFormatOptions: { value: DateFormat; label: string; example: string }[] = [
    { value: 'YYYY/MM/DD', label: t('common.calendar.formatSlash', 'YYYY/MM/DD'), example: '1404/03/27' },
    { value: 'YYYY-MM-DD', label: t('common.calendar.formatDash', 'YYYY-MM-DD'), example: '1404-03-27' },
    { value: 'DD/MM/YYYY', label: t('common.calendar.formatEuropean', 'DD/MM/YYYY'), example: '27/03/1404' },
    { value: 'month-name', label: t('common.calendar.formatMonthName', 'Day Month Year'), example: '27 حمل 1404' },
  ];

  const previewDate = formatToday(calendarType, dateFormat, language as 'fa' | 'ps' | 'en');

  const saveCalendarPreference = (type: CalendarType) => {
    setCalendarType(type);
    if (user?.token) {
      handleUpdate('', { preferred_calendar: type });
    }
  };

  const saveDateFormat = (format: DateFormat) => {
    setDateFormat(format);
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Calendar className="h-6 w-6" />
        <h1 className="text-2xl font-bold">{t('common.calendar.calendarSettings', 'Calendar Settings')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('common.calendar.calendarType', 'Select Calendar Type')}</CardTitle>
          <CardDescription>
            {t('common.calendar.calendarTypeDescription', 'Choose your preferred calendar for date pickers and displays.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {calendarOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => saveCalendarPreference(option.value)}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all',
                  calendarType === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0',
                    calendarType === option.value ? 'border-primary' : 'border-muted-foreground'
                  )}
                >
                  {calendarType === option.value && <div className="w-3 h-3 rounded-full bg-primary" />}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-base">{option.label}</div>
                  <div className="text-sm text-muted-foreground mt-1">{option.description}</div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('common.calendar.dateFormat', 'Date Format')}</CardTitle>
          <CardDescription>
            {t('common.calendar.dateFormatDescription', 'Choose how dates appear in forms, tables, and reports.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {dateFormatOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => saveDateFormat(option.value)}
                className={cn(
                  'flex flex-col items-start gap-1 p-4 rounded-lg border-2 text-left transition-all',
                  dateFormat === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                )}
              >
                <span className="font-medium text-sm">{option.label}</span>
                <span className="text-muted-foreground text-sm" dir="rtl">{option.example}</span>
              </button>
            ))}
          </div>

          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground mb-1">
              {t('common.calendar.datePreview', 'Preview — today')}
            </p>
            <p className="text-lg font-semibold" dir="rtl">{previewDate}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarSettings;
