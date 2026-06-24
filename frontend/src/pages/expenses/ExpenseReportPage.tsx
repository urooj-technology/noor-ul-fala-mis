import { useState } from 'react';
import { Printer, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Autocomplete } from '@/components/ui/autocomplete';
import { DatePicker } from '@/components/ui/date-picker';
import DataTable, { TableColumn } from '@/components/ui/data-table';
import { useLanguage } from '@/contexts/LanguageContext';
import { CalendarProvider, useCalendar } from '@/contexts/CalendarContext';
import { SHAMSI_MONTHS_DARI, SHAMSI_MONTHS_PASHTO, formatDateByCalendarType } from '@/utils/calendar';
import { useCrudPermissions } from '@/hooks/useCrudPermissions';
import useFetchObjects from '@/api/useFetchObjects';
import { formatNumber } from '@/lib/formatNumber';
import ExpenseReportPrint from './ExpenseReportPrint';
import type { PaymentReportRow } from './paymentReportTypes';

type DatePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

type ReportFilters = {
  datePeriod: DatePeriod;
  customDateFrom: string;
  customDateTo: string;
  categoryFilter: string;
  userFilter: string;
  paymentTypeFilter: string;
  searchTerm: string;
};

const defaultFilters = (): ReportFilters => ({
  datePeriod: 'monthly',
  customDateFrom: '',
  customDateTo: '',
  categoryFilter: '',
  userFilter: '',
  paymentTypeFilter: '',
  searchTerm: '',
});

const isPeriodReady = (filters: ReportFilters) =>
  filters.datePeriod !== 'custom' || (Boolean(filters.customDateFrom) && Boolean(filters.customDateTo));

const ExpenseReportContent = () => {
  const { t, language } = useLanguage();
  const { calendarType } = useCalendar();
  const { canExport } = useCrudPermissions('expenses');
  const lang = t('language.code') as 'fa' | 'ps';
  const monthNames = language === 'ps' ? SHAMSI_MONTHS_PASHTO : SHAMSI_MONTHS_DARI;

  const [filters, setFilters] = useState<ReportFilters>(defaultFilters);
  const [showPrint, setShowPrint] = useState(false);

  const periodReady = isPeriodReady(filters);

  const { data: reportData, isLoading } = useFetchObjects<{
    results: PaymentReportRow[];
    count: number;
    summary: {
      payroll_total: number;
      advance_total: number;
      expense_total: number;
      grand_total: number;
    };
  }>({
    queryKey: [
      'expense-payment-report',
      filters.datePeriod,
      filters.customDateFrom,
      filters.customDateTo,
      filters.categoryFilter,
      filters.userFilter,
      filters.paymentTypeFilter,
      filters.searchTerm,
    ],
    endpoint: 'expenses/payment-report/',
    enabled: periodReady,
    params: {
      date_period: filters.datePeriod,
      ...(filters.datePeriod === 'custom' && {
        date_from: filters.customDateFrom,
        date_to: filters.customDateTo,
      }),
      ...(filters.categoryFilter && { category: filters.categoryFilter }),
      ...(filters.userFilter && { user: filters.userFilter }),
      ...(filters.paymentTypeFilter && { payment_type: filters.paymentTypeFilter }),
      ...(filters.searchTerm && { search: filters.searchTerm }),
    },
  });

  const payments = reportData?.results || [];
  const summary = reportData?.summary;

  const periodOptions = [
    { value: 'daily', label: t('expenses.periodOptions.daily') },
    { value: 'weekly', label: t('expenses.periodOptions.weekly') },
    { value: 'monthly', label: t('expenses.periodOptions.monthly') },
    { value: 'yearly', label: t('expenses.periodOptions.yearly') },
    { value: 'custom', label: t('expenses.periodOptions.custom') },
  ];

  const paymentTypeOptions = [
    { value: '', label: t('expenses.allPaymentTypes') },
    { value: 'payroll', label: t('expenses.paymentTypes.payroll') },
    { value: 'advance', label: t('expenses.paymentTypes.advance') },
    { value: 'expense', label: t('expenses.paymentTypes.expense') },
  ];

  const typeLabel = (type: PaymentReportRow['payment_type']) => {
    if (type === 'payroll') return t('expenses.paymentTypes.payroll');
    if (type === 'advance') return t('expenses.paymentTypes.advance');
    return t('expenses.paymentTypes.expense');
  };

  const typeBadgeClass = (type: PaymentReportRow['payment_type']) => {
    if (type === 'payroll') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
    if (type === 'advance') return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
  };

  const amountClass = (type: PaymentReportRow['payment_type']) => {
    if (type === 'payroll') return 'text-emerald-600';
    if (type === 'advance') return 'text-orange-600';
    return 'text-blue-600';
  };

  const formatRowDate = (row: PaymentReportRow) => {
    const date = calendarType === 'shamsi' ? row.payment_date_shamsi : row.payment_date_qamari;
    if (date && row.payment_date) return formatDateByCalendarType(row.payment_date, calendarType, lang);
    return '-';
  };

  const getMonthLabel = (month: number) => monthNames[(month || 1) - 1] || String(month);

  const formatPeriod = (row: PaymentReportRow) => {
    if (row.payment_type === 'expense') return '-';
    return `${getMonthLabel(row.period_month || 1)} ${row.period_year || ''}`;
  };

  const payeeLabel = (row: PaymentReportRow) => {
    if (row.payment_type === 'expense') return row.category_name || 'N/A';
    return row.employee_name || 'N/A';
  };

  const columns: TableColumn[] = [
    {
      key: 'payment_type',
      title: t('expenses.paymentType'),
      render: (value: PaymentReportRow['payment_type']) => (
        <Badge className={`text-[10px] ${typeBadgeClass(value)}`}>{typeLabel(value)}</Badge>
      ),
    },
    {
      key: 'payment_date',
      title: t('expenses.paymentDate'),
      render: (_value, record) => (
        <div className="text-sm whitespace-nowrap">{formatRowDate(record)}</div>
      ),
    },
    {
      key: 'payee',
      title: t('expenses.payee'),
      render: (_value, record: PaymentReportRow) => (
        <div className="min-w-[140px]">
          {record.payment_type === 'expense' ? (
            <Badge variant="outline">{payeeLabel(record)}</Badge>
          ) : (
            <>
              <div className="font-medium text-xs">{payeeLabel(record)}</div>
              {record.employee_position && (
                <div className="text-[10px] text-muted-foreground">{record.employee_position}</div>
              )}
            </>
          )}
        </div>
      ),
    },
    {
      key: 'user_name',
      title: t('expenses.user'),
      render: (_value, record: PaymentReportRow) => (
        <div className="max-w-[120px] truncate text-xs" title={record.user_name || ''}>
          {record.payment_type === 'expense' ? record.user_name || '-' : '-'}
        </div>
      ),
    },
    {
      key: 'period_month',
      title: t('expenses.period'),
      render: (_value, record: PaymentReportRow) => (
        record.payment_type === 'expense' ? (
          <span className="text-xs text-muted-foreground">-</span>
        ) : (
          <Badge variant="outline" className="text-[10px] whitespace-nowrap">
            {formatPeriod(record)}
          </Badge>
        )
      ),
    },
    {
      key: 'amount',
      title: t('expenses.amount'),
      render: (value, record) => (
        <span className={`font-semibold text-xs whitespace-nowrap ${amountClass(record.payment_type)}`}>
          {formatNumber(value)} {record.currency || ''}
        </span>
      ),
    },
    {
      key: 'currency',
      title: t('expenses.currency'),
      render: (_value, record) => (
        <Badge variant="secondary">{record.currency || '-'}</Badge>
      ),
    },
    {
      key: 'description',
      title: t('expenses.description'),
      render: (value) => (
        <div className="max-w-[200px] truncate text-xs" title={value || ''}>
          {value || '-'}
        </div>
      ),
    },
  ];

  const reportCustomFilters = [
    {
      key: 'date_period',
      label: t('expenses.reportDatePeriod'),
      component: (
        <Autocomplete
          options={periodOptions}
          value={filters.datePeriod}
          onChange={(v) => {
                const period = (v as DatePeriod) || 'monthly';
            setFilters((prev) => ({
              ...prev,
              datePeriod: period,
              ...(period !== 'custom' && { customDateFrom: '', customDateTo: '' }),
            }));
          }}
          getOptionLabel={(o) => o.label}
          getOptionValue={(o) => o.value}
        />
      ),
    },
    ...(filters.datePeriod === 'custom'
      ? [
          {
            key: 'date_from',
            label: t('expenses.dateFrom'),
            component: (
              <DatePicker
                value={filters.customDateFrom}
                onChange={(v) => setFilters((prev) => ({ ...prev, customDateFrom: v }))}
              />
            ),
          },
          {
            key: 'date_to',
            label: t('expenses.dateTo'),
            component: (
              <DatePicker
                value={filters.customDateTo}
                onChange={(v) => setFilters((prev) => ({ ...prev, customDateTo: v }))}
              />
            ),
          },
        ]
      : []),
    {
      key: 'payment_type',
      label: t('expenses.paymentType'),
      component: (
        <Autocomplete
          options={paymentTypeOptions}
          value={filters.paymentTypeFilter}
          onChange={(v) => setFilters((prev) => ({ ...prev, paymentTypeFilter: v }))}
          getOptionLabel={(o) => o.label}
          getOptionValue={(o) => o.value}
        />
      ),
    },
    {
      key: 'category',
      label: t('expenses.category'),
      component: (
        <Autocomplete
          endpoint="expense-categories"
          value={filters.categoryFilter}
          onChange={(value) => setFilters((prev) => ({ ...prev, categoryFilter: value as string }))}
          placeholder={t('expenses.selectCategory')}
          getOptionLabel={(c) => c.name}
          getOptionValue={(c) => c.id.toString()}
        />
      ),
    },
    {
      key: 'user',
      label: t('expenses.user'),
      component: (
        <Autocomplete
          endpoint="users"
          getOptionLabel={(u) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}
          getOptionValue={(u) => u.id.toString()}
          value={filters.userFilter}
          onChange={(value) => setFilters((prev) => ({ ...prev, userFilter: value as string }))}
          placeholder={t('expenses.selectUser')}
        />
      ),
    },
  ];

  const handleClearFilters = () => {
    setFilters((prev) => ({
      ...defaultFilters(),
      datePeriod: prev.datePeriod,
      customDateFrom: prev.customDateFrom,
      customDateTo: prev.customDateTo,
    }));
  };

  const hasActiveFilters =
    filters.categoryFilter || filters.userFilter || filters.paymentTypeFilter || filters.searchTerm;

  return (
    <div className="space-y-6 p-6">
      {periodReady && (
        <DataTable
            data={payments}
            columns={columns}
            loading={isLoading}
            title={t('expenses.reports')}
            icon={<Receipt className="h-5 w-5" />}
            headerActions={
              canExport ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrint(true)}
                disabled={isLoading || payments.length === 0}
              >
                <Printer className="mr-2 h-4 w-4" />
                {t('expenses.printReport')}
              </Button>
              ) : null
            }
            searchable
            searchPlaceholder={t('expenses.searchExpenses')}
            searchValue={filters.searchTerm}
            onSearch={(value) => setFilters((prev) => ({ ...prev, searchTerm: value }))}
            customFilters={reportCustomFilters}
            showClearFilters={hasActiveFilters}
            clearFiltersLabel={t('expenses.clearFilters')}
            onClearFilters={handleClearFilters}
            emptyTitle={t('expenses.noPaymentsInPeriod')}
            loadingText={t('expenses.loadingExpenses')}
            maxHeight="75vh"
          stickyHeader
        />
      )}

      {showPrint && periodReady && payments.length > 0 && summary && (
        <ExpenseReportPrint
            payments={payments}
            summary={summary}
            onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
};

export const ExpenseReportPage = () => (
  <CalendarProvider>
    <ExpenseReportContent />
  </CalendarProvider>
);

export default ExpenseReportPage;
