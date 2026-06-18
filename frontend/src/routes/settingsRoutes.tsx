import { Route } from 'react-router-dom';
import CalendarSettings from '@/pages/settings/CalendarSettings';
import DeletedItemsList from '@/pages/settings/DeletedItemsList';

export const settingsRoutes = (
  <>
    <Route path="/settings/calendar" element={<CalendarSettings />} />
    <Route path="/settings/deleted" element={<DeletedItemsList />} />
  </>
);
