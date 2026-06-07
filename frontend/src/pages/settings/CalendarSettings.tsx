import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar, CalendarType } from '@/contexts/CalendarContext';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const CalendarSettings: React.FC = () => {
  const { t } = useLanguage();
  const { calendarType, setCalendarType } = useCalendar();

  const calendarOptions: { value: CalendarType; label: string; description: string }[] = [
    { 
      value: 'shamsi', 
      label: t('common.calendar.shamsi', 'شمسی'), 
      description: t('common.calendar.shamsiDescription', 'Afghanistan Shamsi (Jalali) Calendar - Afghanistan solar calendar with Dari/Pashto month names')
    },
    { 
      value: 'qamari', 
      label: t('common.calendar.qamari', 'قمری'), 
      description: t('common.calendar.qamariDescription', 'Qamari (Hijri Lunar) Calendar - Islamic lunar calendar with Arabic month names')
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Calendar className="h-6 w-6" />
        <h1 className="text-2xl font-bold">{t('calendar.calendarSettings', 'Calendar Settings')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('common.calendar.calendarType', 'Select Calendar Type')}</CardTitle>
          <CardDescription>
            {t('common.calendar.calendarTypeDescription', 'Choose your preferred calendar system for displaying dates throughout the application.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {calendarOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setCalendarType(option.value)}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all",
                  calendarType === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-accent"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5",
                  calendarType === option.value
                    ? "border-primary"
                    : "border-muted-foreground"
                )}>
                  {calendarType === option.value && (
                    <div className="w-3 h-3 rounded-full bg-primary" />
                  )}
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
    </div>
  );
};

export default CalendarSettings;
