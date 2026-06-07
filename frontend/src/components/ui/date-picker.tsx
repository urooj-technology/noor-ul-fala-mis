import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ShamsiDatePicker } from './shamsi-datepicker';
import { QamariDatePicker } from './qamari-datepicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DatePickerProps {
  value?: string; // ISO date string (YYYY-MM-DD)
  onChange: (gregorianDate: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  calendarType?: 'shamsi' | 'qamari' | 'gregorian';
}

/**
 * Unified DatePicker component that respects user's calendar preference
 * Stores dates in Gregorian (ISO format) in the database
 * Displays in user's preferred calendar format
 */
export function DatePicker({
  value,
  onChange,
  placeholder,
  label,
  required,
  error,
  disabled,
  calendarType = 'shamsi',
}: DatePickerProps) {
  // Use Shamsi by default for Afghanistan
  if (calendarType === 'shamsi') {
    return (
      <ShamsiDatePicker
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        label={label}
        required={required}
        error={error}
        disabled={disabled}
      />
    );
  }

  if (calendarType === 'qamari') {
    return (
      <QamariDatePicker
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        label={label}
        required={required}
        error={error}
        disabled={disabled}
      />
    );
  }

  // Gregorian (fallback)
  return (
    <div className="space-y-2">
      {label && (
        <Label className="font-semibold">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-10"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/**
 * Display a date in multiple calendar formats
 */
export function DateDisplay({ 
  gregorianDate, 
  showGregorian = true,
  showShamsi = true,
  showQamari = true,
}: { 
  gregorianDate?: string | null;
  showGregorian?: boolean;
  showShamsi?: boolean;
  showQamari?: boolean;
}) {
  const { language } = useLanguage();

  if (!gregorianDate) return null;

  // Parse the date
  const date = new Date(gregorianDate);
  if (isNaN(date.getTime())) return null;

  // Convert to Shamsi
  let shamsiStr = '';
  if (showShamsi) {
    const shamsiData = gregorianDate ? {
      year: 0, month: 0, day: 0, formatted: ''
    } : null;
    // We'll use the utility
    import('@/utils/calendar').then(({ dateToShamsi }) => {
      const result = dateToShamsi(gregorianDate);
      if (result) {
        shamsiStr = result.formatted;
      }
    });
  }

  return (
    <div className="space-y-1">
      {showShamsi && (
        <div className="text-sm" dir="rtl">
          <span className="text-muted-foreground">شمسی: </span>
          <span className="font-medium">{shamsiStr}</span>
        </div>
      )}
      {showGregorian && (
        <div className="text-sm text-muted-foreground">
          {new Date(gregorianDate).toLocaleDateString('en-US')}
        </div>
      )}
    </div>
  );
}
