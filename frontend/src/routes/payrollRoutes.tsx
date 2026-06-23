import { Route } from 'react-router-dom';
import PayrollList from '@/pages/payroll/PayrollList';
import AddPayroll from '@/pages/payroll/AddPayroll';
import EditPayroll from '@/pages/payroll/EditPayroll';
import PayrollDetails from '@/pages/payroll/PayrollDetails';
import { guardRoute } from '@/lib/route-guards';

export const payrollRoutes = (
  <>
    <Route path="payroll" element={guardRoute(<PayrollList />, { module: 'payroll' })} />
    <Route path="payroll/add" element={guardRoute(<AddPayroll />, { module: 'payroll', action: 'create' })} />
    <Route path="payroll/:id" element={guardRoute(<PayrollDetails />, { module: 'payroll' })} />
    <Route path="payroll/:id/edit" element={guardRoute(<EditPayroll />, { module: 'payroll', action: 'edit' })} />
  </>
);
