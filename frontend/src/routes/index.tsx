import { Route } from 'react-router-dom';
import { Dashboard } from '@/pages/Dashboard';
import { Settings } from '@/pages/settings/Settings';
import { Profile } from '@/pages/profile/Profile';
import { BackupList } from '@/pages/settings/backup/BackupList';
import NotFound from '@/pages/NotFound';

// Import only required route modules
import { employeeRoutes } from './employeeRoutes';
import { payrollRoutes } from './payrollRoutes';
import { expenseRoutes } from './expenseRoutes';
import { advanceRoutes } from './advanceRoutes';
import { userRoutes } from './userRoutes';
import { settingsRoutes } from './settingsRoutes';
import { activityLogRoutes } from './activityLogRoutes';
import { accountingRoutes } from './accountingRoutes';
import { studentRoutes } from './studentRoutes';
import { studentPaymentRoutes } from './studentPaymentRoutes';
import { shopRentalRoutes } from './shopRentalRoutes';
import { otherIncomeRoutes } from './otherIncomeRoutes';
import { reportsRoutes } from './reportsRoutes';
import { equipmentRoutes } from './equipmentRoutes';
import { guardRoute } from '@/lib/route-guards';

export const appRoutes = (
  <>
    {/* Dashboard */}
    <Route index element={guardRoute(<Dashboard />, { module: 'dashboard', fallbackPath: '/profile' })} />
    
    {/* Financial Management */}
    {expenseRoutes}
    
    {/* Human Resources */}
    {employeeRoutes}
    {payrollRoutes}
    {advanceRoutes}
    
    {/* User Management */}
    {userRoutes}
    
    {/* Activity Logs */}
    {activityLogRoutes}
    
    {/* Accounting */}
    {accountingRoutes}
    
    {/* Student Management */}
    {studentRoutes}
    {studentPaymentRoutes}
    
    {/* Shop Rental */}
    {shopRentalRoutes}
    
    {/* Other Income */}
    {otherIncomeRoutes}
    
    {/* Reports */}
    {reportsRoutes}

    {/* Equipment / Warehouse */}
    {equipmentRoutes}
    
    {/* Settings */}
    <Route path="settings" element={guardRoute(<Settings />, { permission: 'manage_settings' })} />
    <Route path="backups" element={guardRoute(<BackupList />, { adminOnly: true })} />
    {settingsRoutes}
    
    {/* Other Routes */}
    <Route path="profile" element={<Profile />} />
    <Route path="*" element={<NotFound />} />
  </>
);