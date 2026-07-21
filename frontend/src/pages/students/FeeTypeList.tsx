import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { PermissionButton } from '@/components/ui/permission-button';
import { Badge } from '@/components/ui/badge';
import DataTable, { TableColumn, TableAction } from '@/components/ui/data-table';
import { useCrudPermissions } from '@/hooks/useCrudPermissions';
import { useLanguage } from '@/contexts/LanguageContext';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';

export const FeeTypeList = () => {
  const { t } = useLanguage();
  const { canEdit, canDelete } = useCrudPermissions('students');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: feeTypesData, isLoading } = useFetchObjects<{
    results: any[];
    count: number;
  }>({
    queryKey: ['fee-types', currentPage.toString(), pageSize.toString(), searchTerm],
    endpoint: 'fee-types/',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm,
    },
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['fee-types'],
    endpoint: 'fee-types'
  });

  const feeTypes = feeTypesData?.results || [];
  const totalItems = feeTypesData?.count || 0;

  const handleEdit = (record: any) => {
    navigate(`/fee-types/${record.id}/edit`);
  };

  const columns: TableColumn[] = [
    {
      key: 'code',
      title: t('students.code', 'Code'),
      render: (value) => <span className="font-mono text-xs font-semibold">{value}</span>
    },
    {
      key: 'name',
      title: t('students.feeName', 'Fee Name'),
      render: (value) => <span className="text-xs font-medium">{value}</span>
    },
    {
      key: 'is_mandatory',
      title: t('students.mandatory', 'Mandatory'),
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? t('common.yes', 'Yes') : t('common.no', 'No')}
        </Badge>
      )
    },
    {
      key: 'is_active',
      title: t('students.active', 'Active'),
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
        </Badge>
      )
    },
  ];

  const rowActions: TableAction[] = [
    ...(canEdit ? [{
      key: 'edit',
      label: t('students.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('students.editFeeType', 'Edit Fee Type')
    }] : []),
    ...(canDelete ? [{
      key: 'delete',
      label: t('students.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record: { id: number; name: string }) => handleDelete(record.id, record.name),
      variant: 'ghost' as const,
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('students.deleteFeeType', 'Delete Fee Type')
    }] : []),
  ];

  return (
    <div className="space-y-6 p-6">
      <DataTable
        data={feeTypes}
        columns={columns}
        loading={isLoading}
        title={t('students.feeTypes', 'Fee Types')}
        subtitle={t('students.manageFeeTypes', 'Manage fee types')}
        icon={<Tag className="h-5 w-5" />}
        headerActions={
          <PermissionButton module="students" action="create" onClick={() => navigate('/fee-types/add')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('students.addFeeType', 'Add Fee Type')}
          </PermissionButton>
        }
        searchable
        searchPlaceholder={t('students.searchFeeTypes', 'Search fee types...')}
        searchValue={searchTerm}
        onSearch={(value) => { setSearchTerm(value); setCurrentPage(1); }}
        rowActions={rowActions}
        pagination={{
          current: currentPage,
          pageSize,
          total: totalItems,
          onPageChange: setCurrentPage,
          showSizeChanger: true,
          pageSizeOptions: [10, 25, 50, 100],
          onPageSizeChange: (size) => { setPageSize(size); setCurrentPage(1); }
        }}
        emptyIcon={<Tag className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('students.noFeeTypesFound', 'No fee types found')}
        emptyDescription={t('students.addFirstFeeType', 'Add your first fee type')}
        loadingText={t('students.loadingFeeTypes', 'Loading fee types...')}
        maxHeight="75vh"
        stickyHeader={true}
      />
      <ConfirmDialog />
    </div>
  );
};

export default FeeTypeList;
