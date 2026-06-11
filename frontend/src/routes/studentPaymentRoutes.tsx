import { Route } from 'react-router-dom';
import StudentPaymentList from '@/pages/student-payments/StudentPaymentList';
import AddStudentPaymentNew from '@/pages/student-payments/AddStudentPaymentNew';
import EditStudentPayment from '@/pages/student-payments/EditStudentPayment';
import ExportStudentPayments from '@/pages/student-payments/ExportStudentPayments';
import StudentPaymentFlow from '@/pages/student-payments/StudentPaymentFlow';

export const studentPaymentRoutes = (
  <>
    <Route path="student-payments" element={<StudentPaymentList />} />
    <Route path="student-payments/add" element={<AddStudentPaymentNew />} />
    <Route path="student-payments/flow" element={<StudentPaymentFlow />} />
    <Route path="student-payments/:id/edit" element={<EditStudentPayment />} />
    {/* Allocation to invoices removed (invoices deprecated) */}
    <Route path="student-payments/export" element={<ExportStudentPayments />} />
  </>
);
