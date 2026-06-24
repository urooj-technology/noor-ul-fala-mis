import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { PermissionButton } from '@/components/ui/permission-button';
import DataTable, { TableColumn, TableAction } from '@/components/ui/data-table';
import { useCrudPermissions } from '@/hooks/useCrudPermissions';
import { useLanguage } from '@/contexts/LanguageContext';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';

export const TenantList = () => {
  const { t } = useLanguage();
  const { canEdit, canDelete } = useCrudPermissions('shop_rentals');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: tenantsData, isLoading } = useFetchObjects<{
    results: any[];
    count: number;
  }>({
    queryKey: ['tenants', currentPage.toString(), pageSize.toString(), searchTerm],
    endpoint: 'tenants/',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm
    }
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['tenants'],
    endpoint: 'tenants'
  });

  const tenants = tenantsData?.results || [];
  const totalItems = tenantsData?.count || 0;

  const handleEdit = (tenant: any) => {
    navigate(`/tenants/${tenant.id}/edit`);
  };

  const columns: TableColumn[] = [
    {
      key: 'full_name',
      title: t('shop-rental.fullName'),
      render: (value) => <span className="text-xs font-medium">{value || 'N/A'}</span>
    },
    {
      key: 'phone',
      title: t('shop-rental.phone'),
      render: (value) => <span className="text-xs">{value || 'N/A'}</span>
    },
    {
      key: 'email',
      title: t('shop-rental.email'),
      render: (value) => <span className="text-xs">{value || 'N/A'}</span>
    },
    {
      key: 'tazkira_number',
      title: t('shop-rental.tazkiraNumber'),
      render: (value) => <span className="text-xs">{value || 'N/A'}</span>
    }
  ];

  const rowActions: TableAction[] = [
    ...(canEdit ? [{
      key: 'edit',
      label: t('shop-rental.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('shop-rental.editTenant')
    }] : []),
    ...(canDelete ? [{
      key: 'delete',
      label: t('shop-rental.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record: { id: number; full_name?: string }) => handleDelete(record.id, record.full_name || 'Tenant'),
      variant: 'ghost' as const,
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('shop-rental.deleteTenant')
    }] : []),
  ];

  return (
    <div className="space-y-6 p-6">
      <DataTable
        data={tenants}
        columns={columns}
        loading={isLoading}
        title={t('shop-rental.tenants')}
        subtitle={t('shop-rental.manageTenants')}
        icon={<Users className="h-5 w-5" />}
        headerActions={
          <PermissionButton module="shop_rentals" action="create" onClick={() => navigate('/tenants/add')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('shop-rental.addTenant')}
          </PermissionButton>
        }
        searchable
        searchPlaceholder={t('shop-rental.searchTenants')}
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        rowActions={rowActions}
        pagination={{
          current: currentPage,
          pageSize,
          total: totalItems,
          onPageChange: setCurrentPage,
          showSizeChanger: true,
          pageSizeOptions: [10, 25, 50, 100],
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(1);
          }
        }}
        emptyIcon={<Users className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('shop-rental.noTenantsFound')}
        emptyDescription={searchTerm ? t('shop-rental.tryAdjustingSearch') : t('shop-rental.addFirstTenant')}
        loadingText={t('shop-rental.loadingTenants')}
        maxHeight="75vh"
        stickyHeader={true}
      />
      <ConfirmDialog />
    </div>
  );
};

export default TenantList;
