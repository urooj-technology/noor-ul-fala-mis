import { Route } from 'react-router-dom';
import StudentList from '@/pages/students/StudentList';
import AddStudent from '@/pages/students/AddStudent';
import EditStudent from '@/pages/students/EditStudent';
import StudentDetails from '@/pages/students/StudentDetails';
import BulkChangeClassLevel from '@/pages/students/BulkChangeClassLevel';
import FeeTypeList from '@/pages/students/FeeTypeList';
import AddFeeType from '@/pages/students/AddFeeType';
import StudentFeeAssignmentList from '@/pages/students/StudentFeeAssignmentList';
import AddStudentFeeAssignment from '@/pages/students/AddStudentFeeAssignment';
import EditStudentFeeAssignment from '@/pages/students/EditStudentFeeAssignment';
import { guardRoute } from '@/lib/route-guards';

export const studentRoutes = (
  <>
    <Route path="students" element={guardRoute(<StudentList />, { module: 'students' })} />
    <Route path="students/add" element={guardRoute(<AddStudent />, { module: 'students', action: 'create' })} />
    <Route path="students/:id" element={guardRoute(<StudentDetails />, { module: 'students' })} />
    <Route path="students/:id/edit" element={guardRoute(<EditStudent />, { module: 'students', action: 'edit' })} />
    <Route path="students/bulk-change-class" element={guardRoute(<BulkChangeClassLevel />, { module: 'students', action: 'edit' })} />

    <Route path="fee-types" element={guardRoute(<FeeTypeList />, { module: 'students' })} />
    <Route path="fee-types/add" element={guardRoute(<AddFeeType />, { module: 'students', action: 'create' })} />
    <Route path="fee-types/:id/edit" element={guardRoute(<AddFeeType />, { module: 'students', action: 'edit' })} />

    <Route path="student-fee-assignments" element={guardRoute(<StudentFeeAssignmentList />, { module: 'students' })} />
    <Route path="student-fee-assignments/add" element={guardRoute(<AddStudentFeeAssignment />, { module: 'students', action: 'create' })} />
    <Route path="student-fee-assignments/:id/edit" element={guardRoute(<EditStudentFeeAssignment />, { module: 'students', action: 'edit' })} />
  </>
);
