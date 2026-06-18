import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import {
  qamariToGregorian,
  QAMARI_MONTHS,
  qamariToISO,
  dateToQamari,
  getCurrentQamari,
  formatCalendarParts,
  type DateFormat,
} from '@/utils/calendar';

interface QamariDatePickerProps {
  value?: string;
  onChange: (gregorianDate: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  dateFormat?: DateFormat;
  language?: 'fa' | 'ps' | 'en';
}

const QAMARI_DAYS = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];

export function QamariDatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  label,
  required,
  error,
  disabled,
  dateFormat = 'YYYY/MM/DD',
  language = 'fa',
}: QamariDatePickerProps) {
  const [open, setOpen] = useState(false);
  const currentQamari = value ? dateToQamari(value) : null;
  const todayQamari = getCurrentQamari();

  const [viewYear, setViewYear] = useState(currentQamari?.year ?? todayQamari.year);
  const [viewMonth, setViewMonth] = useState(currentQamari?.month ?? todayQamari.month);

  useEffect(() => {
    if (open) {
      const target = currentQamari ?? todayQamari;
      setViewYear(target.year);
      setViewMonth(target.month);
    }
  }, [open, value]);

  const displayValue = currentQamari
    ? formatCalendarParts(currentQamari.year, currentQamari.month, currentQamari.day, dateFormat, 'qamari', language)
    : '';

  const daysInMonth = QAMARI_DAYS[viewMonth - 1] || 30;

  const days = useMemo(() => {
    try {
      const firstDayGregorian = qamariToGregorian(viewYear, viewMonth, 1);
      const firstDayDate = new Date(firstDayGregorian.year, firstDayGregorian.month - 1, firstDayGregorian.day);
      let startDayOfWeek = (firstDayDate.getDay() + 1) % 7;

      const daysArray: (number | null)[] = [];
      for (let i = 0; i < startDayOfWeek; i++) daysArray.push(null);
      for (let day = 1; day <= daysInMonth; day++) daysArray.push(day);
      return daysArray;
    } catch {
      return [];
    }
  }, [viewYear, viewMonth, daysInMonth]);

  const handleDaySelect = (day: number) => {
    onChange(qamariToISO(viewYear, viewMonth, day));
    setOpen(false);
  };

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

  const weekDays = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'];

  const years = useMemo(() => {
    const base = currentQamari?.year ?? todayQamari.year;
    const arr = [];
    for (let y = base - 50; y <= base + 10; y++) arr.push(y);
    return arr;
  }, [currentQamari, todayQamari.year]);

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
            <Calendar className="ml-2 h-4 w-4 shrink-0" />
            <span className="truncate">{displayValue || placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setViewYear(viewYear + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToNextMonth}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex gap-2 items-center">
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                  className="border rounded px-2 py-1 text-sm bg-background max-w-[130px]"
                >
                  {QAMARI_MONTHS.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>{name}</option>
                  ))}
                </select>
                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
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
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setViewYear(viewYear - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day, idx) => (
                <div key={idx} className="text-center text-xs text-muted-foreground font-medium py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) =>
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
              )}
            </div>

            <div className="mt-3 pt-3 border-t flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                  onChange(iso);
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
