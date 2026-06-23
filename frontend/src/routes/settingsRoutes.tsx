import { Route } from 'react-router-dom';
import CalendarSettings from '@/pages/settings/CalendarSettings';
import DeletedItemsList from '@/pages/settings/DeletedItemsList';
import { guardRoute } from '@/lib/route-guards';

export const settingsRoutes = (
  <>
    <Route path="/settings/calendar" element={guardRoute(<CalendarSettings />, { permission: 'manage_settings' })} />
    <Route path="/settings/deleted" element={guardRoute(<DeletedItemsList />, { permission: 'manage_settings' })} />
  </>
);
