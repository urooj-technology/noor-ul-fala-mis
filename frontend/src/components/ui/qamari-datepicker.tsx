import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  gregorianToQamari,
  qamariToGregorian,
  QAMARI_MONTHS,
  qamariToISO,
  dateToQamari,
} from '@/utils/calendar';

interface QamariDatePickerProps {
  value?: string; // ISO date string (YYYY-MM-DD)
  onChange: (gregorianDate: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

// Days in each Qamari month (approximate - actual depends on moon sighting)
const QAMARI_DAYS = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];

export function QamariDatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  label,
  required,
  error,
  disabled,
}: QamariDatePickerProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

   // Parse current value to Qamari
   const currentQamari = useMemo(() => {
     if (!value) return null;
     const result = dateToQamari(value);
     return result;
   }, [value]);

  // Display value
  const displayValue = currentQamari
    ? `${currentQamari.year}/${String(currentQamari.month).padStart(2, '0')}/${String(currentQamari.day).padStart(2, '0')}`
    : '';

  // Calendar state
  const [viewYear, setViewYear] = useState(currentQamari?.year || 1446);
  const [viewMonth, setViewMonth] = useState(currentQamari?.month || 1);

  // Get days in month (simplified - in reality, this depends on moon sighting)
  const daysInMonth = QAMARI_DAYS[viewMonth - 1] || 30;

  // Generate days array
  const days = useMemo(() => {
    // Get first day of month in Gregorian to find week day
    try {
      const firstDayGregorian = qamariToGregorian(viewYear, viewMonth, 1);
      const firstDayDate = new Date(firstDayGregorian.year, firstDayGregorian.month - 1, firstDayGregorian.day);
      let startDayOfWeek = firstDayDate.getDay(); // 0 = Sunday
      // Adjust for Saturday start (Islamic week starts on Saturday)
      startDayOfWeek = (startDayOfWeek + 1) % 7; // Now 0 = Saturday

      const daysArray = [];
      for (let i = 0; i < startDayOfWeek; i++) {
        daysArray.push(null); // Empty cells
      }
      for (let day = 1; day <= daysInMonth; day++) {
        daysArray.push(day);
      }
      return daysArray;
    } catch {
      return [];
    }
  }, [viewYear, viewMonth, daysInMonth]);

   // Handle day selection
   const handleDaySelect = (day: number) => {
     try {
       const isoDate = qamariToISO(viewYear, viewMonth, day);
       onChange(isoDate);
       setOpen(false);
     } catch (error) {
       console.error('Error in handleDaySelect:', error);
     }
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

  // Week day names (Saturday first) - Arabic for Qamari
  const weekDays = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج']; // السبت، الأحد، الاثنين، الثلاثاء، الأربعاء، الخميس، الجمعة

  // Quick year selector
  const years = useMemo(() => {
    const currentYear = currentQamari?.year || 1446;
    const arr = [];
    for (let y = currentYear - 50; y <= currentYear + 10; y++) {
      arr.push(y);
    }
    return arr;
  }, [currentQamari]);

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
                  className="border rounded px-2 py-1 text-sm bg-background text-xs"
                >
                  {QAMARI_MONTHS.map((name, idx) => (
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
                day !== null ? (
                  <Button
                    key={idx}
                    type="button"
                    variant={
                      currentQamari?.year === viewYear &&
                      currentQamari?.month === viewMonth &&
                      currentQamari?.day === day
                        ? 'default'
                        : 'ghost'
                    }
                    size="sm"
                    className="aspect-square w-full h-full p-0 font-normal"
                    onClick={() => handleDaySelect(day)}
                  >
                    {day}
                  </Button>
                ) : (
                  <div key={idx} className="aspect-square" />
                )
              ))}
            </div>

            {/* Today button */}
            <div className="mt-3 pt-3 border-t flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const today = new Date();
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
