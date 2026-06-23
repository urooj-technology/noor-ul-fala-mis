import React, { ReactNode } from 'react';
import { usePermissions, PermissionAction } from '@/contexts/PermissionContext';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  module?: string;
  action?: PermissionAction;
  fallback?: ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  module,
  action,
  fallback = null,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, can } = usePermissions();

  let hasAccess = false;

  if (module && action) {
    hasAccess = can(module, action);
  } else if (module) {
    hasAccess = can(module, 'view');
  } else if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};
