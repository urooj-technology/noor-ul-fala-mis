import { Route } from 'react-router-dom';
import EmployeeList from '@/pages/employees/EmployeeList';
import AddEmployee from '@/pages/employees/AddEmployee';
import EditEmployee from '@/pages/employees/EditEmployee';
import EmployeeDetails from '@/pages/employees/EmployeeDetails';
import { guardRoute } from '@/lib/route-guards';

export const employeeRoutes = (
  <>
    <Route path="employees" element={guardRoute(<EmployeeList />, { module: 'employees' })} />
    <Route path="employees/add" element={guardRoute(<AddEmployee />, { module: 'employees', action: 'create' })} />
    <Route path="employees/:id" element={guardRoute(<EmployeeDetails />, { module: 'employees' })} />
    <Route path="employees/:id/edit" element={guardRoute(<EditEmployee />, { module: 'employees', action: 'edit' })} />
  </>
);
