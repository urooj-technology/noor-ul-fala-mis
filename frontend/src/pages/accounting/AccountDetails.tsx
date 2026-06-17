import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DataTable, { TableAction, TableColumn } from '@/components/ui/data-table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { formatDateByCalendarType } from '@/utils/calendar';
import { getCurrencySymbol } from '@/utils/currency';
import { Account, JournalEntry } from '@/types/accounting';
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Eye, FileText, RefreshCw, Scale } from 'lucide-react';
import useFetchObject from '@/api/useFetchObject';
import useFetchObjects from '@/api/useFetchObjects';

const AccountDetails = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const navigate = useNavigate();
  const { id } = useParams();
  const lang = t('language.code', 'en') as 'en' | 'fa' | 'ps';
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, loading, refetch } = useFetchObject({
    queryKey: ['account', id],
    endpoint: `accounts/${id}/`,
  });

  const { data: entriesData, isLoading: entriesLoading, refetch: refetchEntries } = useFetchObjects<{
    results: JournalEntry[];
    count: number;
    next: string | null;
    previous: string | null;
  }>({
    queryKey: ['account-journal-entries', id || '', currentPage.toString(), pageSize.toString(), searchTerm],
    endpoint: 'journal-entries',
    enabled: Boolean(id),
    params: {
      account: id,
      page: currentPage,
      page_size: pageSize,
      search: searchTerm,
    },
  });

  const account = data as Account | undefined;
  const entries = entriesData?.results || [];
  const totalEntries = entriesData?.count || 0;
  const locale = lang === 'fa' ? 'fa-AF' : lang === 'ps' ? 'ps-AF' : 'en-US';

  useEffect(() => {
    if (id) {
      refetch();
      refetchEntries();
    }
  }, [id, refetch, refetchEntries]);

  const handleRefresh = () => {
    refetch();
    refetchEntries();
  };

  const formatMoney = (value: number | string | undefined | null, currency = account?.currency || 'AFN') => {
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

  const formatCount = (value: number | string | undefined | null) => {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
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
      <Badge variant="secondary" className={colors[type as keyof typeof colors] || ''}>
        {t(`accounting.${type}`) || type}
      </Badge>
    );
  };

  const getEntrySide = (entry: JournalEntry) => {
    const debit = Number(entry.debit || 0);
    const credit = Number(entry.credit || 0);
    if (debit > 0) {
      return <Badge variant="outline" className="text-green-700 border-green-300">{t('accounting.debit')}</Badge>;
    }
    if (credit > 0) {
      return <Badge variant="outline" className="text-blue-700 border-blue-300">{t('accounting.credit')}</Badge>;
    }
    return <span className="text-muted-foreground">-</span>;
  };

  const columns: TableColumn<JournalEntry>[] = useMemo(() => [
    {
      key: 'date',
      title: t('accounting.date'),
      render: (value) => (
        <span className="whitespace-nowrap text-xs font-medium">
          {value ? formatDateByCalendarType(value, calendarType, lang === 'en' ? 'fa' : lang) : '-'}
        </span>
      ),
    },
    {
      key: 'transaction_number',
      title: t('accounting.transaction'),
      render: (value, record) => (
        <button
          type="button"
          onClick={() => record.transaction && navigate(`/transactions/${record.transaction}`)}
          className="text-xs font-semibold text-primary hover:underline"
        >
          {value || record.transaction || '-'}
        </button>
      ),
    },
    {
      key: 'reference',
      title: t('accounting.reference', 'Reference'),
      render: (value) => <span className="text-xs">{value || '-'}</span>,
    },
    {
      key: 'description',
      title: t('accounting.description'),
      render: (value) => (
        <span className="block max-w-[360px] truncate text-xs" title={value || ''}>
          {value || '-'}
        </span>
      ),
    },
    {
      key: 'debit',
      title: t('accounting.debit'),
      align: 'right',
      render: (value) => (
        <span className="whitespace-nowrap text-xs font-bold text-green-700">
          {Number(value || 0) > 0 ? formatMoney(value) : '-'}
        </span>
      ),
    },
    {
      key: 'credit',
      title: t('accounting.credit'),
      align: 'right',
      render: (value) => (
        <span className="whitespace-nowrap text-xs font-bold text-blue-700">
          {Number(value || 0) > 0 ? formatMoney(value) : '-'}
        </span>
      ),
    },
    {
      key: 'id',
      title: t('accounting.entries'),
      align: 'center',
      render: (_value, record) => getEntrySide(record),
    },
  ], [calendarType, lang, locale, navigate, t, account?.currency]);

  const rowActions: TableAction<JournalEntry>[] = [
    {
      key: 'transaction',
      label: t('accounting.viewDetails'),
      icon: <Eye className="h-4 w-4" />,
      onClick: (record) => record.transaction && navigate(`/transactions/${record.transaction}`),
      tooltip: t('accounting.viewDetails'),
    },
  ];

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const StatPanel = ({
    title,
    value,
    icon,
    tone,
  }: {
    title: string;
    value: string;
    icon: React.ReactNode;
    tone: 'debit' | 'credit' | 'balance';
  }) => {
    const toneClasses = {
      debit: 'border-green-200 bg-green-50/70 text-green-700 dark:border-green-900 dark:bg-green-950/20 dark:text-green-300',
      credit: 'border-blue-200 bg-blue-50/70 text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300',
      balance: 'border-slate-200 bg-slate-50/80 text-slate-800 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-200',
    };

    return (
      <div className={`rounded-lg border p-4 ${toneClasses[tone]}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium opacity-80">{title}</p>
          <div className="shrink-0">{icon}</div>
        </div>
        <p className="mt-3 break-words text-2xl font-bold tracking-normal">{value}</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">{t('common.loading')}</div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">{t('accounting.accountNotFound')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/accounts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-normal sm:text-3xl">{account.name}</h1>
            <p className="text-sm text-muted-foreground">{account.code} - {account.currency || 'AFN'}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('accounting.accountDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatPanel
              title={t('accounting.totalDebit')}
              value={formatMoney(account.total_debit ?? 0)}
              icon={<ArrowDownToLine className="h-5 w-5" />}
              tone="debit"
            />
            <StatPanel
              title={t('accounting.totalCredit')}
              value={formatMoney(account.total_credit ?? 0)}
              icon={<ArrowUpFromLine className="h-5 w-5" />}
              tone="credit"
            />
            <StatPanel
              title={t('accounting.balance', 'Balance')}
              value={formatMoney(account.current_balance ?? account.balance ?? 0)}
              icon={<Scale className="h-5 w-5" />}
              tone="balance"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm opacity-75">{t('accounting.accountCode')}</p>
              <p className="text-base font-bold">{account.code}</p>
            </div>
            <div>
              <p className="text-sm opacity-75">{t('accounting.accountType')}</p>
              <div className="mt-1">{getTypeBadge(account.account_type || '')}</div>
            </div>
            <div>
              <p className="text-sm opacity-75">{t('accounting.parentAccount')}</p>
              <p className="text-base font-bold">{account.parent_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm opacity-75">{t('accounting.currency')}</p>
              <p className="text-base font-bold">{account.currency || 'AFN'}</p>
            </div>
            <div>
              <p className="text-sm opacity-75">{t('accounting.isActive')}</p>
              <p className="text-base font-bold">{account.is_active ? t('common.yes') : t('common.no')}</p>
            </div>
            <div>
              <p className="text-sm opacity-75">{t('accounting.isDetail')}</p>
              <p className="text-base font-bold">{account.is_detail ? t('common.yes') : t('common.no')}</p>
            </div>
            <div>
              <p className="text-sm opacity-75">{t('accounting.entries')}</p>
              <p className="text-base font-bold">{formatCount(totalEntries)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTable
        data={entries}
        columns={columns}
        loading={entriesLoading}
        title={t('accounting.journalEntries')}
        subtitle={`${t('accounting.accountCode')}: ${account.code} - ${formatCount(totalEntries)} ${t('accounting.entries')}`}
        icon={<FileText className="h-5 w-5" />}
        searchable
        searchPlaceholder={t('accounting.searchJournalEntries')}
        searchValue={searchTerm}
        onSearch={handleSearch}
        rowActions={rowActions}
        pagination={{
          current: currentPage,
          pageSize,
          total: totalEntries,
          onPageChange: setCurrentPage,
          showSizeChanger: true,
          pageSizeOptions: [10, 25, 50, 100],
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(1);
          },
        }}
        emptyIcon={<FileText className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('accounting.noJournalEntriesFound')}
        emptyDescription={t('accounting.noEntries', 'No entries found')}
        loadingText={t('accounting.loadingJournalEntries')}
        maxHeight="70vh"
        stickyHeader
      />
    </div>
  );
};

export default AccountDetails;
