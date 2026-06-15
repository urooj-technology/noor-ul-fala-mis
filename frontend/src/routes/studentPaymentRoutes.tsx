import { Route } from 'react-router-dom';
import StudentPaymentList from '@/pages/student-payments/StudentPaymentList';
import AddStudentPayment from '@/pages/student-payments/AddStudentPayment';
import EditStudentPayment from '@/pages/student-payments/EditStudentPayment';

export const studentPaymentRoutes = (
  <>
    <Route path="student-payments" element={<StudentPaymentList />} />
    <Route path="student-payments/add" element={<AddStudentPayment />} />
    <Route path="student-payments/:id/edit" element={<EditStudentPayment />} />
  </>
);
