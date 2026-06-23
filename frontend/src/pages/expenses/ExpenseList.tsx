import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Autocomplete } from '@/components/ui/autocomplete';
import DataTable, { TableColumn, TableAction } from '@/components/ui/data-table';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { PermissionButton } from '@/components/ui/permission-button';
import { useCalendar, CalendarProvider } from '@/contexts/CalendarContext';
import { formatDateByCalendarType } from '@/utils/calendar';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';

export const ExpenseList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { t } = useLanguage();
  const navigate = useNavigate();
  const { canEdit, canDelete } = usePermissions();

  const { data: expensesData, isLoading } = useFetchObjects<{
    results: any[];
    count: number;
  }>({
    queryKey: ['expenses', currentPage.toString(), pageSize.toString(), searchTerm, categoryFilter, userFilter],
    endpoint: 'expenses/',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm,
      ...(categoryFilter && { category: categoryFilter }),
      ...(userFilter && { user: userFilter })
    }
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['expenses'],
    endpoint: 'expenses'
  });

  const expenses = expensesData?.results || [];
  const totalItems = expensesData?.count || 0;

  const handleDetails = (expense: any) => {
    navigate(`/expenses/${expense.id}`);
  };

  const handleEdit = (expense: any) => {
    navigate(`/expenses/${expense.id}/edit`);
  };

  const { calendarType } = useCalendar();
  const lang = t('language.code') as 'fa' | 'ps';

  const columns: TableColumn[] = [
    {
      key: 'category_details',
      title: t('expenses.category'),
      render: (value) => (
        <Badge variant="outline">{value?.name || 'N/A'}</Badge>
      )
    },
    {
      key: 'amount',
      title: t('expenses.amount'),
      render: (value, record) => (
        <span className="font-medium text-primarytext-xs">
          {Number(value)?.toFixed(2)} {record.currency_details?.code || ''}
        </span>
      )
    },
    {
      key: 'currency_details',
      title: t('expenses.currency'),
      render: (value) => (
        <Badge variant="secondary">
          {value?.code || '-'}
        </Badge>
      )
    },
    {
      key: 'expense_date',
      title: t('expenses.expenseDate'),
      render: (value, record) => {
        const date = calendarType === 'shamsi' ? record.expense_date_shamsi : record.expense_date_qamari;
        return (
          <div className="text-sm">
            {date ? formatDateByCalendarType(value, calendarType, lang) : '-'}
          </div>
        );
      }
    },
    {
      key: 'user_details',
      title: t('expenses.user'),
      render: (value) => (
        <div className="max-w-xs truncate" title={value?.fullname || ''}>
          {value?.fullname || '-'}
        </div>
      )
    },
    {
      key: 'receipt',
      title: t('expenses.receipt'),
      render: (value) => (
        value ? (
          <div className="flex items-center gap-2">
            <Badge variant="default" className="flex items-center gap-1">
              <Receipt className="h-3 w-3" />
              {t('expenses.hasReceipt')}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(value, '_blank')}
              className="h-6 w-6 p-0"
            >
              <Eye className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Badge variant="outline">-</Badge>
        )
      )
    }
  ];

  const expenseRowActions: TableAction[] = [
    {
      key: 'view',
      label: t('expenses.viewDetails'),
      icon: <Eye className="h-4 w-4" />,
      onClick: handleDetails,
      tooltip: t('expenses.viewDetails')
    },
    ...(canEdit('expenses') ? [{
      key: 'edit',
      label: t('expenses.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('expenses.editExpense')
    }] : []),
    ...(canDelete('expenses') ? [{
      key: 'delete',
      label: t('expenses.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record: any) => handleDelete(record.id, `${record.category_details?.name || 'Expense'} - ${record.amount}`),
      variant: 'ghost' as const,
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('expenses.deleteExpense')
    }] : []),
  ];

  const expenseCustomFilters = [
    {
      key: 'category',
      label: t('expenses.category'),
      component: (
        <Autocomplete
          endpoint="expense-categories"
          value={categoryFilter}
          onChange={(value) => {
            setCategoryFilter(value as string);
            setCurrentPage(1);
          }}
          placeholder={t('expenses.selectCategory')}
          getOptionLabel={(c) => c.name}
          getOptionValue={(c) => c.id.toString()}
        />
      )
    },
    {
      key: 'user',
      label: t('expenses.user'),
      component: (
        <Autocomplete
          endpoint="users"
          getOptionLabel={(u) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}
          getOptionValue={(u) => u.id.toString()}
          value={userFilter}
          onChange={(value) => {
            setUserFilter(value as string);
            setCurrentPage(1);
          }}
          placeholder={t('expenses.selectUser')}
        />
      )
    }
  ];

  const handleClearExpenseFilters = () => {
    setCategoryFilter('');
    setUserFilter('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveExpenseFilters = categoryFilter || userFilter || searchTerm;

  return (
    <div className="space-y-6 p-6">
      <CalendarProvider>
        <DataTable
        data={expenses}
        columns={columns}
        loading={isLoading}
        title={t('expenses.expenses')}
        subtitle={t('expenses.manageExpenseRecords')}
        icon={<Receipt className="h-5 w-5" />}
        headerActions={
          <PermissionButton module="expenses" action="create" onClick={() => navigate('/expenses/add')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('expenses.addExpense')}
          </PermissionButton>
        }
        searchable
        searchPlaceholder={t('expenses.searchExpenses')}
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        customFilters={expenseCustomFilters}
        showClearFilters={hasActiveExpenseFilters}
        clearFiltersLabel={t('expenses.clearFilters')}
        onClearFilters={handleClearExpenseFilters}
        rowActions={expenseRowActions}
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
        emptyIcon={<Receipt className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('expenses.noExpensesFound')}
        emptyDescription={searchTerm ? t('expenses.tryAdjustingSearch') : t('expenses.addFirstExpense')}
        loadingText={t('expenses.loadingExpenses')}
        maxHeight="75vh"
        stickyHeader={true}
      />
      </CalendarProvider>

      <ConfirmDialog />
    </div>
  );
};

export default ExpenseList;
