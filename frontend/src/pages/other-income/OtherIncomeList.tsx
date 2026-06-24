import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, TrendingUp } from 'lucide-react';
import { PermissionButton } from '@/components/ui/permission-button';
import { Badge } from '@/components/ui/badge';
import { Autocomplete } from '@/components/ui/autocomplete';
import DataTable, { TableColumn, TableAction } from '@/components/ui/data-table';
import { useCrudPermissions } from '@/hooks/useCrudPermissions';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar, CalendarProvider } from '@/contexts/CalendarContext';
import { formatDateByCalendarType } from '@/utils/calendar';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';

export const OtherIncomeList = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const { canEdit, canDelete } = useCrudPermissions('other_income');
  const lang = t('language.code') as 'fa' | 'ps';
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: incomesData, isLoading } = useFetchObjects<{
    results: any[];
    count: number;
    next: string | null;
    previous: string | null;
  }>({
    queryKey: ['other-incomes', currentPage.toString(), pageSize.toString(), searchTerm, categoryFilter],
    endpoint: 'other-incomes',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm,
      ...(categoryFilter && { income_category: categoryFilter })
    }
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['other-incomes'],
    endpoint: 'other-incomes'
  });

  const incomes = incomesData?.results || [];
  const totalItems = incomesData?.count || 0;

  const handleEdit = (income: any) => {
    navigate(`/other-incomes/${income.id}/edit`);
  };

  const handleDetails = (income: any) => {
    navigate(`/other-incomes/${income.id}`);
  };

  const columns: TableColumn[] = [
    {
      key: 'income_date',
      title: t('other-income.incomeDate'),
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="font-semibold text-xs">
            {formatDateByCalendarType(value, calendarType, lang)}
          </span>
        </div>
      )
    },
    {
      key: 'amount',
      title: t('other-income.amount'),
      render: (value, record) => (
        <span className="font-bold text-xs text-green-600">
          {Number(value || 0).toFixed(2)} {record.currency || ''}
        </span>
      )
    },
    {
      key: 'income_category_details',
      title: t('other-income.category'),
      render: (value) => <span className="text-xs">{value?.name || 'N/A'}</span>
    },
    {
      key: 'source',
      title: t('other-income.source'),
      render: (value) => <span className="text-xs">{value || 'N/A'}</span>
    },
    {
      key: 'description',
      title: t('other-income.description'),
      render: (value) => <span className="text-xs truncate max-w-xs">{value || 'N/A'}</span>
    }
  ];

  const rowActions: TableAction[] = [
    {
      key: 'view',
      label: t('other-income.viewDetails'),
      icon: <Eye className="h-4 w-4" />,
      onClick: handleDetails,
      tooltip: t('other-income.viewDetails')
    },
    ...(canEdit ? [{
      key: 'edit',
      label: t('other-income.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('other-income.editIncome')
    }] : []),
    ...(canDelete ? [{
      key: 'delete',
      label: t('other-income.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record: { id: number; source?: string }) => handleDelete(record.id, record.source || 'Income'),
      variant: 'ghost' as const,
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('other-income.deleteIncome')
    }] : []),
  ];

  const customFilters = [
    {
      key: 'category',
      label: t('other-income.category'),
      component: (
        <Autocomplete
          endpoint="income-categories"
          value={categoryFilter}
          onChange={(value) => {
            setCategoryFilter(value);
            setCurrentPage(1);
          }}
          placeholder={t('other-income.selectCategory')}
          getOptionLabel={(c) => c.name}
          getOptionValue={(c) => c.id.toString()}
        />
      )
    }
  ];

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setCategoryFilter('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveFilters = categoryFilter || searchTerm;

  return (
    <div className="space-y-6 p-6">
      <CalendarProvider>
        <DataTable
        data={incomes}
        columns={columns}
        loading={isLoading}
        title={t('other-income.otherIncome')}
        subtitle={t('other-income.manageIncome')}
        icon={<TrendingUp className="h-5 w-5" />}
        headerActions={
          <PermissionButton module="other_income" action="create" onClick={() => navigate('/other-incomes/add')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('other-income.addIncome')}
          </PermissionButton>
        }
        searchable
        searchPlaceholder={t('other-income.searchIncome')}
        searchValue={searchTerm}
        onSearch={handleSearch}
        customFilters={customFilters}
        showClearFilters={hasActiveFilters}
        clearFiltersLabel={t('other-income.clearFilters')}
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
        emptyIcon={<TrendingUp className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('other-income.noIncomeFound')}
        emptyDescription={searchTerm ? t('other-income.tryAdjustingSearch') : t('other-income.addFirstIncome')}
        loadingText={t('other-income.loadingIncome')}
        maxHeight="75vh"
        stickyHeader={true}
      />
      </CalendarProvider>

      <ConfirmDialog />
    </div>
  );
};

export default OtherIncomeList;
