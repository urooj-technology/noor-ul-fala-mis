import { Route } from 'react-router-dom';
import { UserList } from '@/pages/users/UserList';
import AddUser from '@/pages/users/AddUser';
import EditUser from '@/pages/users/EditUser';
import { UserDetails } from '@/pages/users/UserDetails';
import { UserPermissions } from '@/pages/users/UserPermissions';
import { guardRoute } from '@/lib/route-guards';

export const userRoutes = (
  <>
    <Route path="users" element={guardRoute(<UserList />, { adminOnly: true })} />
    <Route path="users/add" element={guardRoute(<AddUser />, { adminOnly: true })} />
    <Route path="users/:id" element={guardRoute(<UserDetails />, { adminOnly: true })} />
    <Route path="users/:id/edit" element={guardRoute(<EditUser />, { adminOnly: true })} />
    <Route path="users/:id/permissions" element={guardRoute(<UserPermissions />, { adminOnly: true })} />
  </>
);
