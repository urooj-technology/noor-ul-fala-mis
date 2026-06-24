import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, BookOpen } from 'lucide-react';
import { PermissionButton } from '@/components/ui/permission-button';
import { Badge } from '@/components/ui/badge';
import DataTable, { TableColumn, TableAction, FilterOption } from '@/components/ui/data-table';
import { useCrudPermissions } from '@/hooks/useCrudPermissions';
import { useLanguage } from '@/contexts/LanguageContext';
import { CalendarProvider } from '@/contexts/CalendarContext';
import { getCurrencySymbol } from '@/utils/currency';
import { Account } from '@/types/accounting';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';

export const AccountList = () => {
  const { t } = useLanguage();
  const { canEdit, canDelete } = useCrudPermissions('accounting');
  const lang = t('language.code', 'en') as 'en' | 'fa' | 'ps';
  const locale = lang === 'fa' ? 'fa-AF' : lang === 'ps' ? 'ps-AF' : 'en-US';
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: accountsData, isLoading } = useFetchObjects<{
    results: Account[];
    count: number;
    next: string | null;
    previous: string | null;
  }>({
    queryKey: ['accounts', currentPage.toString(), pageSize.toString(), searchTerm, typeFilter],
    endpoint: 'accounts',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm,
      ...(typeFilter !== 'all' && { account_type: typeFilter })
    }
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['accounts'],
    endpoint: 'accounts'
  });

  const accounts = accountsData?.results || [];
  const totalItems = accountsData?.count || 0;

  const handleEdit = (account: Account) => {
    navigate(`/accounts/${account.id}/edit`);
  };

  const handleDetails = (account: Account) => {
    navigate(`/accounts/${account.id}`);
  };

  const formatMoney = (value: number | string | undefined | null, currency = 'AFN') => {
    const amount = Number(value || 0);
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)} ${getCurrencySymbol(currency)}`;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      asset: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      liability: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      equity: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      income: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      expense: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    };
    return (
      <Badge variant={colors[type as keyof typeof colors] ? 'default' : 'secondary'}>
        {t(`accounting.${type}`) || type}
      </Badge>
    );
  };

  const columns: TableColumn<Account>[] = [
    {
      key: 'code',
      title: t('accounting.accountCode'),
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="font-semibold text-xs">{value || 'N/A'}</span>
        </div>
      )
    },
    {
      key: 'name',
      title: t('accounting.accountName'),
      render: (value) => <span className="text-xs">{value || 'N/A'}</span>
    },
    {
      key: 'account_type',
      title: t('accounting.accountType'),
      render: (value) => getTypeBadge(value || '')
    },
    {
      key: 'total_debit',
      title: t('accounting.totalDebit'),
      align: 'right',
      render: (value, record) => (
        <span className="whitespace-nowrap font-bold text-xs text-green-700">
          {formatMoney(value, record.currency || 'AFN')}
        </span>
      )
    },
    {
      key: 'total_credit',
      title: t('accounting.totalCredit'),
      align: 'right',
      render: (value, record) => (
        <span className="whitespace-nowrap font-bold text-xs text-blue-700">
          {formatMoney(value, record.currency || 'AFN')}
        </span>
      )
    },
    {
      key: 'current_balance',
      title: t('accounting.balance', 'Balance'),
      align: 'right',
      render: (value, record) => (
        <span className="whitespace-nowrap font-bold text-xs text-slate-800 dark:text-slate-200">
          {formatMoney(value ?? record.balance ?? 0, record.currency || 'AFN')}
        </span>
      )
    },
    {
      key: 'is_active',
      title: t('accounting.isActive'),
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
    ...(canEdit ? [{
      key: 'edit',
      label: t('accounting.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('accounting.editAccount')
    }] : []),
    ...(canDelete ? [{
      key: 'delete',
      label: t('accounting.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record: Account) => handleDelete(record.id, record.name || 'Account'),
      variant: 'ghost' as const,
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('accounting.deleteAccount')
    }] : []),
  ];

  const filters: FilterOption[] = [
    {
      key: 'type',
      label: t('accounting.accountType'),
      placeholder: t('accounting.filterByType'),
      width: 'sm:w-40',
      options: [
        { value: 'asset', label: t('accounting.asset') },
        { value: 'liability', label: t('accounting.liability') },
        { value: 'equity', label: t('accounting.equity') },
        { value: 'income', label: t('accounting.income') },
        { value: 'expense', label: t('accounting.expense') }
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
        data={accounts}
        columns={columns}
        loading={isLoading}
        title={t('accounting.accounts')}
        subtitle={t('accounting.chartOfAccounts')}
        icon={<BookOpen className="h-5 w-5" />}
        headerActions={
          <PermissionButton module="accounting" action="create" onClick={() => navigate('/accounts/add')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('accounting.addAccount')}
          </PermissionButton>
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
        emptyIcon={<BookOpen className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('accounting.noAccountsFound')}
        emptyDescription={searchTerm ? t('accounting.tryAdjustingSearch') : t('accounting.addFirstAccount')}
        loadingText={t('accounting.loadingAccounts')}
        maxHeight="75vh"
        stickyHeader={true}
      />
      </CalendarProvider>

      <ConfirmDialog />
    </div>
  );
};

export default AccountList;
