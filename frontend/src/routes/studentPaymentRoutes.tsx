import { Route } from 'react-router-dom';
import StudentPaymentList from '@/pages/student-payments/StudentPaymentList';
import AddStudentPayment from '@/pages/student-payments/AddStudentPayment';
import EditStudentPayment from '@/pages/student-payments/EditStudentPayment';
import ExportStudentPayments from '@/pages/student-payments/ExportStudentPayments';

export const studentPaymentRoutes = (
  <>
    <Route path="student-payments" element={<StudentPaymentList />} />
    <Route path="student-payments/add" element={<AddStudentPayment />} />
    <Route path="student-payments/:id/edit" element={<EditStudentPayment />} />
    {/* Allocation to invoices removed (invoices deprecated) */}
    <Route path="student-payments/export" element={<ExportStudentPayments />} />
  </>
);
