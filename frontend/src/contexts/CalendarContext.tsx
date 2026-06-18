import React, { createContext, useContext, useState, useCallback } from "react";
import type { DateFormat } from "@/utils/calendar";

export type CalendarType = "shamsi" | "qamari";

interface CalendarContextType {
  calendarType: CalendarType;
  setCalendarType: (type: CalendarType) => void;
  dateFormat: DateFormat;
  setDateFormat: (format: DateFormat) => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error("useCalendar must be used within a CalendarProvider");
  }
  return context;
};

const VALID_CALENDAR_TYPES: CalendarType[] = ["shamsi", "qamari"];
const VALID_DATE_FORMATS: DateFormat[] = ["YYYY/MM/DD", "YYYY-MM-DD", "DD/MM/YYYY", "month-name"];

function readCalendarType(): CalendarType {
  const saved = localStorage.getItem("calendar_type");
  if (saved === "gregorian" || !saved) return "shamsi";
  return VALID_CALENDAR_TYPES.includes(saved as CalendarType) ? (saved as CalendarType) : "shamsi";
}

function readDateFormat(): DateFormat {
  const saved = localStorage.getItem("date_format");
  return VALID_DATE_FORMATS.includes(saved as DateFormat) ? (saved as DateFormat) : "YYYY/MM/DD";
}

interface CalendarProviderProps {
  children: React.ReactNode;
}

export const CalendarProvider = ({ children }: CalendarProviderProps) => {
  const [calendarType, setCalendarTypeState] = useState<CalendarType>(readCalendarType);
  const [dateFormat, setDateFormatState] = useState<DateFormat>(readDateFormat);

  const setCalendarType = useCallback((type: CalendarType) => {
    setCalendarTypeState(type);
    localStorage.setItem("calendar_type", type);
  }, []);

  const setDateFormat = useCallback((format: DateFormat) => {
    setDateFormatState(format);
    localStorage.setItem("date_format", format);
  }, []);

  return (
    <CalendarContext.Provider value={{ calendarType, setCalendarType, dateFormat, setDateFormat }}>
      {children}
    </CalendarContext.Provider>
  );
};

export function applyUserCalendarPreference(preferredCalendar?: string | null) {
  if (!preferredCalendar || preferredCalendar === "gregorian") return;
  if (VALID_CALENDAR_TYPES.includes(preferredCalendar as CalendarType)) {
    localStorage.setItem("calendar_type", preferredCalendar);
  }
}
