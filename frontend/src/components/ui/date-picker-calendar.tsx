import React from 'react';
import { ShamsiDatePicker } from './shamsi-datepicker';
import { QamariDatePicker } from './qamari-datepicker';
import { useCalendar } from '@/contexts/CalendarContext';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Unified DatePicker component that automatically uses the selected calendar type
 * from user settings (Shamsi or Qamari)
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder,
  disabled,
}) => {
  const { calendarType } = useCalendar();

  if (calendarType === 'qamari') {
    return (
      <QamariDatePicker
        value={value}
        onChange={onChange}
        label={label}
        placeholder={placeholder}
        disabled={disabled}
      />
    );
  }

  return (
    <ShamsiDatePicker
      value={value}
      onChange={onChange}
      label={label}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
};

export default DatePicker;
