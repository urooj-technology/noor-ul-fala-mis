import { Route } from 'react-router-dom';
import CalendarSettings from '@/pages/settings/CalendarSettings';

export const settingsRoutes = (
  <>
    <Route path="/settings/calendar" element={<CalendarSettings />} />
  </>
);
