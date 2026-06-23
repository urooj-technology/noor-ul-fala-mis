import { Route } from 'react-router-dom';
import StudentPaymentList from '@/pages/student-payments/StudentPaymentList';
import AddStudentPayment from '@/pages/student-payments/AddStudentPayment';
import EditStudentPayment from '@/pages/student-payments/EditStudentPayment';
import { guardRoute } from '@/lib/route-guards';

export const studentPaymentRoutes = (
  <>
    <Route path="student-payments" element={guardRoute(<StudentPaymentList />, { module: 'student_payments' })} />
    <Route path="student-payments/add" element={guardRoute(<AddStudentPayment />, { module: 'student_payments', action: 'create' })} />
    <Route path="student-payments/:id/edit" element={guardRoute(<EditStudentPayment />, { module: 'student_payments', action: 'edit' })} />
  </>
);
