import { Route } from 'react-router-dom';
import ActivityLogList from '@/pages/activity-logs/ActivityLogList';
import { guardRoute } from '@/lib/route-guards';

export const activityLogRoutes = (
  <>
    <Route path="/activity-logs" element={guardRoute(<ActivityLogList />, { module: 'activity_logs' })} />
  </>
);
