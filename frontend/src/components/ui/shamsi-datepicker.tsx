import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  gregorianToShamsi,
  shamsiToGregorian,
  getShamsiDaysInMonth,
  SHAMSI_MONTHS_DARI,
  SHAMSI_MONTHS_PASHTO,
  shamsiToISO,
  dateToShamsi,
} from '@/utils/calendar';

interface ShamsiDatePickerProps {
  value?: string; // ISO date string (YYYY-MM-DD)
  onChange: (gregorianDate: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

export function ShamsiDatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  label,
  required,
  error,
  disabled,
}: ShamsiDatePickerProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

  // Get month names based on language
  const monthNames = language === 'ps' ? SHAMSI_MONTHS_PASHTO : SHAMSI_MONTHS_DARI;

  // Parse current value to Shamsi
  const currentShamsi = useMemo(() => {
    if (!value) return null;
    return dateToShamsi(value);
  }, [value]);

  // Display value
  const displayValue = currentShamsi
    ? `${currentShamsi.year}/${String(currentShamsi.month).padStart(2, '0')}/${String(currentShamsi.day).padStart(2, '0')}`
    : '';

  // Calendar state
  const [viewYear, setViewYear] = useState(currentShamsi?.year || 1403);
  const [viewMonth, setViewMonth] = useState(currentShamsi?.month || 1);

  // Get days in month
  const daysInMonth = getShamsiDaysInMonth(viewYear, viewMonth);

  // Generate days array
  const days = useMemo(() => {
    // Get first day of month in Gregorian to find week day
    const firstDayGregorian = shamsiToGregorian(viewYear, viewMonth, 1);
    const firstDayDate = new Date(firstDayGregorian.year, firstDayGregorian.month - 1, firstDayGregorian.day);
    let startDayOfWeek = firstDayDate.getDay(); // 0 = Sunday
    // Adjust for Saturday start (Afghanistan week starts on Saturday)
    startDayOfWeek = (startDayOfWeek + 1) % 7; // Now 0 = Saturday

    const daysArray = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      daysArray.push(null); // Empty cells
    }
    for (let day = 1; day <= daysInMonth; day++) {
      daysArray.push(day);
    }
    return daysArray;
  }, [viewYear, viewMonth, daysInMonth]);

  // Handle day selection
  const handleDaySelect = (day: number) => {
    const isoDate = shamsiToISO(viewYear, viewMonth, day);
    onChange(isoDate);
    setOpen(false);
  };

  // Navigate months
  const goToPrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Navigate years
  const goToPrevYear = () => setViewYear(viewYear - 1);
  const goToNextYear = () => setViewYear(viewYear + 1);

  // Week day names (Saturday first)
  const weekDays = language === 'ps' 
    ? ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] // Pashto abbreviations
    : ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']; // Dari abbreviations (شنبه، یکشنبه، دوشنبه، سه‌شنبه، چهارشنبه، پنجشنبه، جمعه)

  // Quick year selector
  const years = useMemo(() => {
    const currentYear = currentShamsi?.year || 1403;
    const arr = [];
    for (let y = currentYear - 50; y <= currentYear + 10; y++) {
      arr.push(y);
    }
    return arr;
  }, [currentShamsi]);

  return (
    <div className="space-y-2">
      {label && (
        <Label className="font-semibold">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`w-full justify-start text-right font-normal h-10 ${!displayValue ? 'text-muted-foreground' : ''}`}
            disabled={disabled}
          >
            <Calendar className="ml-2 h-4 w-4" />
            {displayValue || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToNextYear}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToNextMonth}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="flex gap-2 items-center">
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(parseInt(e.target.value))}
                  className="border rounded px-2 py-1 text-sm bg-background"
                >
                  {monthNames.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>{name}</option>
                  ))}
                </select>
                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(parseInt(e.target.value))}
                  className="border rounded px-2 py-1 text-sm bg-background w-20"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToPrevMonth}>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToPrevYear}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Week days */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day, idx) => (
                <div key={idx} className="text-center text-xs text-muted-foreground font-medium py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => (
                <div key={idx} className="aspect-square">
                  {day !== null && (
                    <Button
                      variant={
                        currentShamsi?.year === viewYear &&
                        currentShamsi?.month === viewMonth &&
                        currentShamsi?.day === day
                          ? 'default'
                          : 'ghost'
                      }
                      size="sm"
                      className="w-full h-full p-0 font-normal"
                      onClick={() => handleDaySelect(day)}
                    >
                      {day}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Today button */}
            <div className="mt-3 pt-3 border-t flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const shamsi = gregorianToShamsi(today.getFullYear(), today.getMonth() + 1, today.getDate());
                  onChange(today.toISOString().split('T')[0]);
                  setOpen(false);
                }}
              >
                {language === 'ps' ? 'نننه نیټه' : 'تاریخ امروز'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { onChange(''); setOpen(false); }}>
                {language === 'ps' ? 'پاکول' : 'پاک کردن'}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
