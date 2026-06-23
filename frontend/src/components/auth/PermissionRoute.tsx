import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions, PermissionAction } from '@/contexts/PermissionContext';

interface PermissionRouteProps {
  children: React.ReactNode;
  module?: string;
  action?: PermissionAction;
  permission?: string;
  fallbackPath?: string;
}

export const PermissionRoute: React.FC<PermissionRouteProps> = ({
  children,
  module,
  action = 'view',
  permission,
  fallbackPath = '/profile',
}) => {
  const { can, hasPermission } = usePermissions();

  const allowed = permission
    ? hasPermission(permission)
    : module
      ? can(module, action)
      : true;

  if (!allowed) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};
