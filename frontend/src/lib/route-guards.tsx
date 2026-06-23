import React from 'react';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { PermissionRoute } from '@/components/auth/PermissionRoute';
import { PermissionAction } from '@/contexts/PermissionContext';

interface GuardOptions {
  module?: string;
  action?: PermissionAction;
  permission?: string;
  adminOnly?: boolean;
  fallbackPath?: string;
}

export function guardRoute(element: React.ReactNode, options: GuardOptions = {}) {
  let wrapped = element;
  if (options.module || options.permission) {
    wrapped = (
      <PermissionRoute
        module={options.module}
        action={options.action || 'view'}
        permission={options.permission}
        fallbackPath={options.fallbackPath}
      >
        {wrapped}
      </PermissionRoute>
    );
  }
  if (options.adminOnly) {
    wrapped = <AdminRoute>{wrapped}</AdminRoute>;
  }
  return wrapped;
}
