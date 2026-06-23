import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function useIsAdmin(): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return (
    Boolean(user.is_admin) ||
    Boolean(user.is_staff) ||
    Boolean(user.is_super_admin) ||
    user.role === 'admin' ||
    user.role === 'super_admin'
  );
}

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const isAdmin = useIsAdmin();
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};
