import { Route } from 'react-router-dom';
import AdvanceList from '@/pages/advance/AdvanceList';
import AddAdvance from '@/pages/advance/AddAdvance';
import EditAdvance from '@/pages/advance/EditAdvance';
import AdvanceDetails from '@/pages/advance/AdvanceDetails';
import { guardRoute } from '@/lib/route-guards';

export const advanceRoutes = (
  <>
    <Route path="advance" element={guardRoute(<AdvanceList />, { module: 'advances' })} />
    <Route path="advance/add" element={guardRoute(<AddAdvance />, { module: 'advances', action: 'create' })} />
    <Route path="advance/:id" element={guardRoute(<AdvanceDetails />, { module: 'advances' })} />
    <Route path="advance/:id/edit" element={guardRoute(<EditAdvance />, { module: 'advances', action: 'edit' })} />
  </>
);
