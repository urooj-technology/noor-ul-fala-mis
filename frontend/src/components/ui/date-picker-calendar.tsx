import React from 'react';
import { ShamsiDatePicker } from './shamsi-datepicker';
import { QamariDatePicker } from './qamari-datepicker';
import { useCalendar } from '@/contexts/CalendarContext';
import { formatDateByCalendarType } from '@/utils/calendar';
import { useLanguage } from '@/contexts/LanguageContext';

interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

/**
 * Unified DatePicker — uses Shamsi or Qamari based on user calendar settings.
 * Always stores Gregorian ISO (YYYY-MM-DD) for the API.
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder,
  required,
  error,
  disabled,
}) => {
  const { calendarType, dateFormat } = useCalendar();
  const { language } = useLanguage();

  const commonProps = {
    value,
    onChange,
    label,
    placeholder,
    required,
    error,
    disabled,
    dateFormat,
    language: language as 'fa' | 'ps' | 'en',
  };

  if (calendarType === 'qamari') {
    return <QamariDatePicker {...commonProps} />;
  }

  return <ShamsiDatePicker {...commonProps} />;
};

interface DateDisplayProps {
  date?: string | null;
  className?: string;
}

/** Display a stored ISO date in the user's preferred calendar format. */
export function DateDisplay({ date, className }: DateDisplayProps) {
  const { calendarType, dateFormat } = useCalendar();
  const { language } = useLanguage();

  if (!date) return null;

  return (
    <span className={className} dir="rtl">
      {formatDateByCalendarType(date, calendarType, language as 'fa' | 'ps' | 'en', dateFormat)}
    </span>
  );
}

export default DatePicker;
