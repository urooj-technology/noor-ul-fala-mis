import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendar } from '@/contexts/CalendarContext';
import useFetchObject from '@/api/useFetchObject';

/**
 * Syncs calendar type from user profile on login.
 */
export function CalendarSync() {
  const { user, isAuthenticated } = useAuth();
  const { setCalendarType } = useCalendar();

  const { data: profile } = useFetchObject<{ preferred_calendar?: string }>({
    queryKey: ['profile-calendar'],
    endpoint: 'profile',
    enabled: isAuthenticated,
  });

  useEffect(() => {
    const preferred = profile?.preferred_calendar;
    if (preferred === 'shamsi' || preferred === 'qamari') {
      setCalendarType(preferred);
    }
  }, [profile?.preferred_calendar, setCalendarType]);

  useEffect(() => {
    if (user && (user as { preferred_calendar?: string }).preferred_calendar) {
      const preferred = (user as { preferred_calendar?: string }).preferred_calendar;
      if (preferred === 'shamsi' || preferred === 'qamari') {
        setCalendarType(preferred);
      }
    }
  }, [user, setCalendarType]);

  return null;
}
