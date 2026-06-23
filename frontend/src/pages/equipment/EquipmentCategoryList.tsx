import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DataTable, { TableColumn, TableAction } from '@/components/ui/data-table';
import { PermissionButton } from '@/components/ui/permission-button';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermissions } from '@/contexts/PermissionContext';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';

export const EquipmentCategoryList = () => {
  const { t } = useLanguage();
  const { canEdit, canDelete } = usePermissions();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading } = useFetchObjects<{ results: any[]; count: number }>({
    queryKey: ['equipment-categories', currentPage.toString(), pageSize.toString(), searchTerm],
    endpoint: 'equipment-categories/',
    params: { page: currentPage, page_size: pageSize, search: searchTerm },
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['equipment-categories'],
    endpoint: 'equipment-categories',
  });

  const categories = data?.results || [];

  const columns: TableColumn[] = [
    { key: 'name', title: t('equipment.categoryName'), render: (v) => <span className="font-medium text-xs">{v}</span> },
    { key: 'equipment_count', title: t('equipment.equipment'), render: (v) => <Badge variant="outline">{v ?? 0}</Badge> },
    { key: 'is_active', title: t('equipment.isActive'), render: (v) => <Badge variant={v ? 'default' : 'secondary'}>{v ? t('common.yes') : t('common.no')}</Badge> },
  ];

  const rowActions: TableAction[] = [
    ...(canEdit('equipment') ? [{ key: 'edit', label: t('common.edit'), icon: <Edit className="h-4 w-4" />, onClick: (r: any) => navigate(`/equipment-categories/${r.id}/edit`) }] : []),
    ...(canDelete('equipment') ? [{ key: 'delete', label: t('common.delete'), icon: <Trash2 className="h-4 w-4" />, onClick: (r: any) => handleDelete(r.id, r.name), variant: 'ghost' as const, className: 'text-red-600' }] : []),
  ];

  return (
    <div className="space-y-6 p-6">
      <DataTable
        data={categories}
        columns={columns}
        loading={isLoading}
        title={t('equipment.equipmentCategories')}
        subtitle={t('equipment.manageCategories')}
        icon={<Tag className="h-5 w-5" />}
        headerActions={
          <PermissionButton module="equipment" action="create" onClick={() => navigate('/equipment-categories/add')}>
            <Plus className="mr-2 h-4 w-4" />{t('equipment.addCategory')}
          </PermissionButton>
        }
        searchable
        searchValue={searchTerm}
        onSearch={(v) => { setSearchTerm(v); setCurrentPage(1); }}
        searchPlaceholder={t('equipment.searchCategories')}
        rowActions={rowActions}
        pagination={{ current: currentPage, pageSize, total: data?.count || 0, onPageChange: setCurrentPage, onPageSizeChange: (s) => { setPageSize(s); setCurrentPage(1); } }}
        emptyTitle={t('equipment.noCategoriesFound')}
      />
      <ConfirmDialog />
    </div>
  );
};

export default EquipmentCategoryList;
