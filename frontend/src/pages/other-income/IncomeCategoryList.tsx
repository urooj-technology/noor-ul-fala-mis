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

export const IncomeCategoryList = () => {
  const { t } = useLanguage();
  const { canEdit, canDelete } = useCrudPermissions('other_income');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: categoriesData, isLoading } = useFetchObjects<{
    results: any[];
    count: number;
  }>({
    queryKey: ['income-categories', currentPage.toString(), pageSize.toString(), searchTerm],
    endpoint: 'income-categories/',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm
    }
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['income-categories'],
    endpoint: 'income-categories'
  });

  const categories = categoriesData?.results || [];
  const totalItems = categoriesData?.count || 0;

  const handleEdit = (category: any) => {
    navigate(`/income-categories/${category.id}/edit`);
  };

  const columns: TableColumn[] = [
    {
      key: 'name',
      title: t('other-income.categoryName'),
      render: (value) => <span className="text-xs font-medium">{value || 'N/A'}</span>
    },
    {
      key: 'category_type',
      title: t('other-income.categoryType'),
      render: (value) => (
        <Badge variant="outline">
          {t(`other-income.categoryTypes.${value}`) || value}
        </Badge>
      )
    },
    {
      key: 'description',
      title: t('other-income.description'),
      render: (value) => <span className="text-xs">{value || 'N/A'}</span>
    },
    {
      key: 'is_active',
      title: t('other-income.status'),
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? t('other-income.active') : t('other-income.inactive')}
        </Badge>
      )
    }
  ];

  const rowActions: TableAction[] = [
    ...(canEdit ? [{
      key: 'edit',
      label: t('other-income.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('other-income.editCategory')
    }] : []),
    ...(canDelete ? [{
      key: 'delete',
      label: t('other-income.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record: { id: number; name?: string }) => handleDelete(record.id, record.name || 'Category'),
      variant: 'ghost' as const,
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('other-income.deleteCategory')
    }] : []),
  ];

  return (
    <div className="space-y-6 p-6">
      <DataTable
        data={categories}
        columns={columns}
        loading={isLoading}
        title={t('other-income.incomeCategories')}
        subtitle={t('other-income.manageCategories')}
        icon={<Tag className="h-5 w-5" />}
        headerActions={
          <PermissionButton module="other_income" action="create" onClick={() => navigate('/income-categories/add')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('other-income.addCategory')}
          </PermissionButton>
        }
        searchable
        searchPlaceholder={t('other-income.searchCategories')}
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
        emptyIcon={<Tag className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('other-income.noCategoriesFound')}
        emptyDescription={searchTerm ? t('other-income.tryAdjustingSearch') : t('other-income.addFirstCategory')}
        loadingText={t('other-income.loadingCategories')}
        maxHeight="75vh"
        stickyHeader={true}
      />
      <ConfirmDialog />
    </div>
  );
};

export default IncomeCategoryList;
