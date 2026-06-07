// contexts/calendar-context.tsx
import React, { createContext, useContext, useState, useEffect } from "react";

export type CalendarType = "shamsi" | "qamari";

interface CalendarContextType {
  calendarType: CalendarType;
  setCalendarType: (type: CalendarType) => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error("useCalendar must be used within a CalendarProvider");
  }
  return context;
};

interface CalendarProviderProps {
  children: React.ReactNode;
}

export const CalendarProvider = ({ children }: CalendarProviderProps) => {
  const [calendarType, setCalendarTypeState] = useState<CalendarType>(() => {
    const saved = localStorage.getItem("calendar_type");
    // If saved value is gregorian or not set, default to shamsi
    if (saved === "gregorian" || !saved) {
      return "shamsi";
    }
    return saved as CalendarType;
  });

  const setCalendarType = (type: CalendarType) => {
    setCalendarTypeState(type);
    localStorage.setItem("calendar_type", type);
  };

  return (
    <CalendarContext.Provider value={{ calendarType, setCalendarType }}>
      {children}
    </CalendarContext.Provider>
  );
};
