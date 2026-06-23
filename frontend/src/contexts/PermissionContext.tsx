import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';

export type PermissionAction = 'view' | 'create' | 'add' | 'edit' | 'delete';

interface PermissionContextType {
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  can: (module: string, action?: PermissionAction) => boolean;
  canView: (module: string) => boolean;
  canCreate: (module: string) => boolean;
  canAdd: (module: string) => boolean;
  canEdit: (module: string) => boolean;
  canDelete: (module: string) => boolean;
  isAdmin: boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

interface PermissionProviderProps {
  children: ReactNode;
}

function isAdminUser(user: ReturnType<typeof useAuth>['user']): boolean {
  if (!user) return false;
  return (
    Boolean(user.is_admin) ||
    Boolean(user.is_staff) ||
    Boolean(user.is_super_admin) ||
    user.role === 'admin' ||
    user.role === 'super_admin'
  );
}

function actionToPrefix(action: PermissionAction): string {
  if (action === 'add') return 'create';
  return action;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    return user.permissions?.includes(permission) || false;
  }, [user, isAdmin]);

  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  }, [hasPermission]);

  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  }, [hasPermission]);

  const can = useCallback((module: string, action: PermissionAction = 'view'): boolean => {
    return hasPermission(`${actionToPrefix(action)}_${module}`);
  }, [hasPermission]);

  const canView = useCallback((module: string) => can(module, 'view'), [can]);
  const canCreate = useCallback((module: string) => can(module, 'create'), [can]);
  const canAdd = canCreate;
  const canEdit = useCallback((module: string) => can(module, 'edit'), [can]);
  const canDelete = useCallback((module: string) => can(module, 'delete'), [can]);

  const value: PermissionContextType = {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    can,
    canView,
    canCreate,
    canAdd,
    canEdit,
    canDelete,
    isAdmin,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};
