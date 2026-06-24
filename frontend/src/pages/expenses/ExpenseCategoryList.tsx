import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Package } from 'lucide-react';
import { PermissionButton } from '@/components/ui/permission-button';
import DataTable, { TableColumn, TableAction } from '@/components/ui/data-table';
import { useCrudPermissions } from '@/hooks/useCrudPermissions';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';

const ExpenseCategoryList = () => {
  const { t } = useLanguage();
  const { canEdit, canDelete } = useCrudPermissions('expenses');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: categoriesData, isLoading } = useFetchObjects<{
    results: any[];
    count: number;
  }>({
    queryKey: ['expense-categories', currentPage.toString(), pageSize.toString(), searchTerm],
    endpoint: 'expense-categories/',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm
    }
  });



  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['expense-categories'],
    endpoint: 'expense-categories'
  });

  const categories = categoriesData?.results || [];
  const totalItems = categoriesData?.count || 0;

  const handleDetails = (category: any) => {
    navigate(`/expense-categories/${category.id}`);
  };

  const handleEdit = (category: any) => {
    navigate(`/expense-categories/${category.id}/edit`);
  };

  const columns: TableColumn[] = [
    {
      key: 'name',
      title: t('expenses.categories.name'),
      render: (value) => <span className="font-medium text-primarytext-xs">{value}</span>
    },
    {
      key: 'description',
      title: t('expenses.description'),
      render: (value) => (
        <div className="max-w-xs truncate" title={value || ''}>
          {value || '-'}
        </div>
      )
    }
  ];

  const rowActions: TableAction[] = [
    {
      key: 'view',
      label: t('expenses.viewDetails'),
      icon: <Eye className="h-4 w-4" />,
      onClick: handleDetails,
      tooltip: t('expenses.viewDetails')
    },
    ...(canEdit ? [{
      key: 'edit',
      label: t('expenses.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('expenses.editCategory')
    }] : []),
    ...(canDelete ? [{
      key: 'delete',
      label: t('expenses.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record: { id: number; name: string }) => handleDelete(record.id, record.name),
      variant: 'ghost' as const,
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('expenses.deleteCategory')
    }] : []),
  ];

  const customFilters: any[] = [];

  const handleClearFilters = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm;

  return (
    <div className="space-y-6 p-6">
      <DataTable
        data={categories}
        columns={columns}
        loading={isLoading}
        title={t('expenses.categories.title')}
        subtitle={t('expenses.manageExpenseCategories')}
        icon={<Package className="h-5 w-5" />}
        headerActions={
          <PermissionButton module="expenses" action="create" onClick={() => navigate('/expense-categories/add')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('expenses.categories.addCategory')}
          </PermissionButton>
        }
        searchable
        searchPlaceholder={t('expenses.searchCategories')}
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        customFilters={customFilters}
        showClearFilters={hasActiveFilters}
        clearFiltersLabel={t('expenses.clearFilters')}
        onClearFilters={handleClearFilters}
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
        emptyIcon={<Package className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('expenses.noCategoriesFound')}
        emptyDescription={searchTerm ? t('expenses.tryAdjustingSearch') : t('expenses.addFirstCategory')}
        loadingText={t('expenses.loadingCategories')}
        maxHeight="75vh"
        stickyHeader={true}
      />

      <ConfirmDialog />
    </div>
  );
};

export default ExpenseCategoryList;
