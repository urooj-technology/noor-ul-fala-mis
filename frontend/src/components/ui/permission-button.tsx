import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { PermissionGuard } from '@/components/ui/permission-guard';

interface PermissionButtonProps extends ButtonProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  module?: string;
  action?: 'view' | 'add' | 'create' | 'edit' | 'delete';
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  permission,
  permissions,
  requireAll,
  module,
  action,
  children,
  ...buttonProps
}) => {
  return (
    <PermissionGuard
      permission={permission}
      permissions={permissions}
      requireAll={requireAll}
      module={module}
      action={action}
    >
      <Button {...buttonProps}>
        {children}
      </Button>
    </PermissionGuard>
  );
};