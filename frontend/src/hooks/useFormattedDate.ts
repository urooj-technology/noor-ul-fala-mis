import { useCallback } from 'react';
import { useCalendar } from '@/contexts/CalendarContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDateByCalendarType } from '@/utils/calendar';

export function useFormattedDate() {
  const { calendarType, dateFormat } = useCalendar();
  const { language } = useLanguage();

  const formatDate = useCallback(
    (date?: string | Date | null, fallback = '-') => {
      if (!date) return fallback;
      return formatDateByCalendarType(date, calendarType, language as 'fa' | 'ps' | 'en', dateFormat);
    },
    [calendarType, dateFormat, language]
  );

  return { formatDate, calendarType, dateFormat };
}
