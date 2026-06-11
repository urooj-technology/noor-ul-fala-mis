import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DataTable, { TableColumn, TableAction } from '@/components/ui/data-table';
import { useLanguage } from '@/contexts/LanguageContext';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';

export const FeeTypeList = () => {
  const { t } = useLanguage();
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

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      admission: 'bg-blue-100 text-blue-800',
      book: 'bg-purple-100 text-purple-800',
      uniform: 'bg-orange-100 text-orange-800',
      transportation: 'bg-cyan-100 text-cyan-800',
      exam: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return (
      <Badge variant="outline" className={colors[category] || ''}>
        {t(`students.feeCategories.${category}`, category)}
      </Badge>
    );
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
      key: 'category',
      title: t('students.category', 'Category'),
      render: (value) => getCategoryBadge(value)
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
    {
      key: 'edit',
      label: t('students.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('students.editFeeType', 'Edit Fee Type')
    },
    {
      key: 'delete',
      label: t('students.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record) => handleDelete(record.id, record.name),
      variant: 'ghost',
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('students.deleteFeeType', 'Delete Fee Type')
    }
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
          <Button onClick={() => navigate('/fee-types/add')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('students.addFeeType', 'Add Fee Type')}
          </Button>
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
