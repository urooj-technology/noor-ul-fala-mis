import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, FileText, Calendar, DollarSign, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DataTable, { TableColumn, TableAction, FilterOption } from '@/components/ui/data-table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar, CalendarProvider } from '@/contexts/CalendarContext';
import { formatDateByCalendarType } from '@/utils/calendar';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';

export const TransactionList = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const lang = t('language.code') as 'fa' | 'ps';
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: transactionsData, isLoading } = useFetchObjects<{
    results: any[];
    count: number;
    next: string | null;
    previous: string | null;
  }>({
    queryKey: ['transactions', currentPage.toString(), pageSize.toString(), searchTerm, typeFilter],
    endpoint: 'transactions',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm,
      ...(typeFilter !== 'all' && { transaction_type: typeFilter })
    }
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['transactions'],
    endpoint: 'transactions'
  });

  const transactions = transactionsData?.results || [];
  const totalItems = transactionsData?.count || 0;

  const handleEdit = (transaction: any) => {
    navigate(`/transactions/${transaction.id}/edit`);
  };

  const handleDetails = (transaction: any) => {
    navigate(`/transactions/${transaction.id}`);
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      student_payment: 'bg-blue-100 text-blue-800',
      expense: 'bg-red-100 text-red-800',
      payroll: 'bg-purple-100 text-purple-800',
      advance: 'bg-orange-100 text-orange-800',
      rental_income: 'bg-green-100 text-green-800',
      other_income: 'bg-teal-100 text-teal-800',
      journal: 'bg-gray-100 text-gray-800',
      opening: 'bg-indigo-100 text-indigo-800',
    };
    return (
      <Badge variant={colors[type as keyof typeof colors] ? 'default' : 'secondary'}>
        {t(`accounting.${type}`) || type}
      </Badge>
    );
  };

  const columns: TableColumn[] = [
    {
      key: 'number',
      title: t('accounting.transactionNumber'),
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="font-semibold text-xs">{value || 'N/A'}</span>
        </div>
      )
    },
    {
      key: 'date',
      title: t('accounting.transactionDate'),
      render: (value) => (
        <span className="text-xs">
          {formatDateByCalendarType(value, calendarType, lang)}
        </span>
      )
    },
    {
      key: 'transaction_type',
      title: t('accounting.transactionType'),
      render: (value) => getTypeBadge(value || '')
    },
    {
      key: 'description',
      title: t('accounting.description'),
      render: (value) => <span className="text-xs">{value || 'N/A'}</span>
    },
    {
      key: 'total_debit',
      title: t('accounting.totalDebit'),
      render: (value) => (
        <span className="font-bold text-xs text-green-600">
          {Number(value || 0).toFixed(2)}
        </span>
      )
    },
    {
      key: 'total_credit',
      title: t('accounting.totalCredit'),
      render: (value) => (
        <span className="font-bold text-xs text-blue-600">
          {Number(value || 0).toFixed(2)}
        </span>
      )
    },
    {
      key: 'is_posted',
      title: t('accounting.isPosted'),
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? t('common.yes') : t('common.no')}
        </Badge>
      )
    }
  ];

  const rowActions: TableAction[] = [
    {
      key: 'view',
      label: t('accounting.viewDetails'),
      icon: <Eye className="h-4 w-4" />,
      onClick: handleDetails,
      tooltip: t('accounting.viewDetails')
    },
    {
      key: 'edit',
      label: t('accounting.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('accounting.editTransaction')
    },
    {
      key: 'delete',
      label: t('accounting.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record) => handleDelete(record.id, record.number || 'Transaction'),
      variant: 'ghost',
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('accounting.deleteTransaction')
    }
  ];

  const filters: FilterOption[] = [
    {
      key: 'type',
      label: t('accounting.transactionType'),
      placeholder: t('accounting.filterByType'),
      width: 'sm:w-40',
      options: [
        { value: 'student_payment', label: t('accounting.studentPayment') },
        { value: 'expense', label: t('accounting.expense') },
        { value: 'payroll', label: t('accounting.payroll') },
        { value: 'advance', label: t('accounting.advance') },
        { value: 'rental_income', label: t('accounting.rentalIncome') },
        { value: 'other_income', label: t('accounting.otherIncome') },
        { value: 'journal', label: t('accounting.journal') }
      ]
    }
  ];

  const filterValues = {
    type: typeFilter
  };

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'type') {
      setTypeFilter(value);
      setCurrentPage(1);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setTypeFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 p-6">
      <CalendarProvider>
        <DataTable
        data={transactions}
        columns={columns}
        loading={isLoading}
        title={t('accounting.transactions')}
        subtitle={t('accounting.journalEntries')}
        icon={<FileText className="h-5 w-5" />}
        headerActions={
          <Button onClick={() => navigate('/transactions/add')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('accounting.addTransaction')}
          </Button>
        }
        searchable
        searchPlaceholder={t('accounting.searchAccounts')}
        searchValue={searchTerm}
        onSearch={handleSearch}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        showClearFilters={true}
        clearFiltersLabel={t('accounting.clearFilters')}
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
        emptyIcon={<FileText className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('accounting.noTransactionsFound')}
        emptyDescription={searchTerm ? t('accounting.tryAdjustingSearch') : t('accounting.addFirstTransaction')}
        loadingText={t('accounting.loadingAccounts')}
        maxHeight="75vh"
        stickyHeader={true}
      />
      </CalendarProvider>

      <ConfirmDialog />
    </div>
  );
};

export default TransactionList;
