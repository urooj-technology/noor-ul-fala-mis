import { usePermissions } from '@/contexts/PermissionContext';

/** Module-level CRUD + export permission helpers for list/detail pages. */
export function useCrudPermissions(module: string) {
  const { canEdit, canDelete, canCreate, hasPermission } = usePermissions();

  return {
    canEdit: canEdit(module),
    canDelete: canDelete(module),
    canCreate: canCreate(module),
    canExport: hasPermission('export_reports'),
    hasPermission,
  };
}
