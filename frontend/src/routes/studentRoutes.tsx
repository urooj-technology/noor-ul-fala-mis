import { Route } from 'react-router-dom';
import StudentList from '@/pages/students/StudentList';
import AddStudent from '@/pages/students/AddStudent';
import EditStudent from '@/pages/students/EditStudent';
import StudentDetails from '@/pages/students/StudentDetails';
import BulkChangeClassLevel from '@/pages/students/BulkChangeClassLevel';
import FeeTypeList from '@/pages/students/FeeTypeList';
import AddFeeType from '@/pages/students/AddFeeType';
// Student invoices and periodic invoice generation removed — handled via assignments/payments
import StudentFeeAssignmentList from '@/pages/students/StudentFeeAssignmentList';
import AddStudentFeeAssignment from '@/pages/students/AddStudentFeeAssignment';
import EditStudentFeeAssignment from '@/pages/students/EditStudentFeeAssignment';

export const studentRoutes = (
  <>
    {/* Students */}
    <Route path="students" element={<StudentList />} />
    <Route path="students/add" element={<AddStudent />} />
    <Route path="students/:id" element={<StudentDetails />} />
    <Route path="students/:id/edit" element={<EditStudent />} />
    <Route path="students/bulk-change-class" element={<BulkChangeClassLevel />} />

    {/* Fee Types */}
    <Route path="fee-types" element={<FeeTypeList />} />
    <Route path="fee-types/add" element={<AddFeeType />} />
    <Route path="fee-types/:id/edit" element={<AddFeeType />} />

    {/* Class Fees removed - managed via Student Fee Assignments */}

    {/* Student Fee Assignments */}
    <Route path="student-fee-assignments" element={<StudentFeeAssignmentList />} />
    <Route path="student-fee-assignments/add" element={<AddStudentFeeAssignment />} />
    <Route path="student-fee-assignments/:id/edit" element={<EditStudentFeeAssignment />} />

    {/* Student invoices removed — use Student Fee Assignments and Student Payments for tracking */}

    {/* Payment Plans removed - use `payment_plan` on assignments */}
  </>
);
