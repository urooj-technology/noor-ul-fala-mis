import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, DollarSign, Calendar, User, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Autocomplete } from '@/components/ui/autocomplete';
import DataTable, { TableColumn, TableAction, FilterOption } from '@/components/ui/data-table';
import { PermissionButton } from '@/components/ui/permission-button';
import { useCrudPermissions } from '@/hooks/useCrudPermissions';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { getCurrentYear } from '@/utils/calendar';
import {
  buildShamsiMonthOptions,
  formatMoney,
  getShamsiMonthLabel,
} from '@/lib/hr-list-utils';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';
import PayrollReportPrint from './PayrollReportPrint';
import { getEmployeePositionLabel, getEmployeePositionOptions } from '@/lib/employee-positions';

export const PayrollList = () => {
  const { t, language } = useLanguage();
  const { calendarType } = useCalendar();
  const { canEdit, canDelete, canExport } = useCrudPermissions('payroll');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showPrint, setShowPrint] = useState(false);

  const lang = (language === 'ps' ? 'ps' : 'fa') as 'fa' | 'ps';
  const months = buildShamsiMonthOptions(lang);
  const currentYear = getCurrentYear(calendarType);
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  const { data: payrollsData, isLoading } = useFetchObjects<{
    results: any[];
    count: number;
    next: string | null;
    previous: string | null;
  }>({
    queryKey: ['payrolls', currentPage.toString(), pageSize.toString(), searchTerm, employeeFilter, positionFilter, monthFilter, yearFilter],
    endpoint: 'payrolls',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm,
      ...(employeeFilter && { employee: employeeFilter }),
      ...(positionFilter !== 'all' && { position: positionFilter }),
      ...(monthFilter !== 'all' && { month: monthFilter }),
      ...(yearFilter !== 'all' && { year: yearFilter }),
    },
  });

  const { data: employeesData } = useFetchObjects({
    queryKey: ['employees-all'],
    endpoint: 'employees/',
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['payrolls'],
    endpoint: 'payrolls',
  });

  const totalItems = payrollsData?.count || 0;
  const payrolls = payrollsData?.results || [];
  const employees = Array.isArray(employeesData) ? employeesData : employeesData?.results || [];

  const calendarLabels = {
    shamsi: { year: t('payroll.yearShamsi', 'سال'), month: t('payroll.monthShamsi', 'ماه') },
    qamari: { year: t('payroll.yearQamari', 'سال'), month: t('payroll.monthQamari', 'ماه') },
    gregorian: { year: t('payroll.year', 'Year'), month: t('payroll.month', 'Month') },
  };

  const handleEdit = (payroll: any) => navigate(`/payroll/${payroll.id}/edit`);
  const handleDetails = (payroll: any) => navigate(`/payroll/${payroll.id}`);

  const formatPaymentDate = (record: any) => {
    if (calendarType === 'shamsi' && record.payment_date_shamsi) {
      return record.payment_date_shamsi.formatted;
    }
    if (calendarType === 'qamari' && record.payment_date_qamari) {
      return record.payment_date_qamari.formatted;
    }
    return record.payment_date || '-';
  };

  const renderMoney = (value: number | string | undefined, currency?: string, className = '') => (
    <span className={`font-semibold text-xs tabular-nums ${className}`}>
      {formatMoney(value, currency)}
    </span>
  );

  const columns: TableColumn[] = [
    {
      key: 'employee_details',
      title: t('payroll.employee'),
      render: (value) => (
        <div className="flex items-center gap-2 min-w-[140px]">
          <User className="h-4 w-4 text-gray-400 shrink-0" />
          <div>
            <div className="font-medium text-xs">{value?.full_name || 'N/A'}</div>
            {value?.position && (
              <div className="text-[11px] text-muted-foreground">
                {getEmployeePositionLabel(t, value.position)}
              </div>
            )}
            {value?.phone && <div className="text-[11px] text-muted-foreground">{value.phone}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'month',
      title: t('payroll.period'),
      render: (_value, record) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <Badge variant="outline">
            {getShamsiMonthLabel(record.month, lang)} {record.year}
          </Badge>
        </div>
      ),
    },
    {
      key: 'period_summary',
      title: t('payroll.monthlySalary'),
      render: (_value, record) => renderMoney(
        record.period_summary?.total_salary ?? record.employee_details?.salary,
        record.currency_details?.code,
        'text-blue-600',
      ),
    },
    {
      key: 'salary',
      title: t('payroll.paidAmount'),
      render: (value, record) => renderMoney(value, record.currency_details?.code, 'text-emerald-600'),
    },
    {
      key: 'payroll_paid',
      title: t('payroll.payrollPaid'),
      render: (_value, record) => renderMoney(
        record.period_summary?.payroll_paid,
        record.currency_details?.code,
        'text-green-600',
      ),
    },
    {
      key: 'overall_paid',
      title: t('payroll.totalPaid'),
      render: (_value, record) => renderMoney(
        record.period_summary?.overall_paid,
        record.currency_details?.code,
        'text-red-600',
      ),
    },
    {
      key: 'remaining_amount',
      title: t('payroll.remaining'),
      render: (_value, record) => {
        const remaining = Number(record.period_summary?.remaining_amount ?? 0);
        return renderMoney(
          remaining,
          record.currency_details?.code,
          remaining > 0 ? 'text-purple-600' : 'text-muted-foreground',
        );
      },
    },
    {
      key: 'payment_date',
      title: t('payroll.paymentDate'),
      render: (_value, record) => (
        <div className="text-xs whitespace-nowrap">{formatPaymentDate(record)}</div>
      ),
    },
  ];

  const rowActions: TableAction[] = [
    {
      key: 'view',
      label: t('payroll.viewDetails'),
      icon: <Eye className="h-4 w-4" />,
      onClick: handleDetails,
      tooltip: t('payroll.viewDetails'),
    },
    ...(canEdit ? [{
      key: 'edit',
      label: t('payroll.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('payroll.editPayroll'),
    }] : []),
    ...(canDelete ? [{
      key: 'delete',
      label: t('payroll.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record: { id: number; employee_details?: { full_name?: string }; month: number; year: number }) => {
        const employeeName = record.employee_details?.full_name || 'Payroll';
        handleDelete(record.id, `${employeeName} - ${getShamsiMonthLabel(record.month, lang)} ${record.year}`);
      },
      variant: 'ghost' as const,
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('payroll.deletePayroll'),
    }] : []),
  ];

  const filters: FilterOption[] = [
    {
      key: 'position',
      label: t('payroll.position'),
      placeholder: t('payroll.filterByPosition'),
      width: 'sm:w-44',
      options: getEmployeePositionOptions(t),
    },
    {
      key: 'year',
      label: calendarLabels[calendarType]?.year || t('payroll.year'),
      placeholder: t('payroll.filterByYear'),
      width: 'sm:w-32',
      options: years.map((y) => ({ value: y.toString(), label: y.toString() })),
    },
    {
      key: 'month',
      label: calendarLabels[calendarType]?.month || t('payroll.month'),
      placeholder: t('payroll.filterByMonth'),
      width: 'sm:w-40',
      options: months,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <DataTable
        data={payrolls}
        columns={columns}
        loading={isLoading}
        title={t('payroll.payrolls')}
        subtitle={t('payroll.manageEmployeePayrolls')}
        icon={<DollarSign className="h-5 w-5" />}
        headerActions={
          <div className="flex items-center gap-2">
            {canExport && (
              <Button variant="outline" onClick={() => setShowPrint(true)} disabled={payrolls.length === 0}>
                <Printer className="mr-2 h-4 w-4" />
                {t('payroll.printReport', 'Print')}
              </Button>
            )}
            <PermissionButton module="payroll" action="create" onClick={() => navigate('/payroll/add')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('payroll.addPayroll')}
            </PermissionButton>
          </div>
        }
        searchable
        searchPlaceholder={t('payroll.searchPayrolls')}
        searchValue={searchTerm}
        onSearch={(v) => { setSearchTerm(v); setCurrentPage(1); }}
        customFilters={[{
          key: 'employee',
          label: t('payroll.employee'),
          component: (
            <Autocomplete
              options={employees.map((e: { id: number; full_name?: string; position?: string }) => ({
                id: e.id.toString(),
                value: e.id.toString(),
                label: `${e.full_name || 'N/A'}${e.position ? ` (${getEmployeePositionLabel(t, e.position)})` : ''}`,
              }))}
              getOptionLabel={(opt) => opt.label}
              getOptionValue={(opt) => opt.value}
              value={employeeFilter}
              onChange={(value) => { setEmployeeFilter(value); setCurrentPage(1); }}
              placeholder={t('payroll.filterByEmployee')}
            />
          ),
        }]}
        filters={filters}
        filterValues={{ position: positionFilter, year: yearFilter, month: monthFilter }}
        customFilterValues={{ employee: employeeFilter }}
        onFilterChange={(key, value) => {
          if (key === 'position') { setPositionFilter(value); setCurrentPage(1); }
          if (key === 'year') { setYearFilter(value); setCurrentPage(1); }
          if (key === 'month') { setMonthFilter(value); setCurrentPage(1); }
        }}
        showClearFilters
        clearFiltersLabel={t('payroll.clearFilters')}
        onClearFilters={() => {
          setEmployeeFilter('');
          setPositionFilter('all');
          setYearFilter('all');
          setMonthFilter('all');
          setSearchTerm('');
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
          onPageSizeChange: (size) => { setPageSize(size); setCurrentPage(1); },
        }}
        emptyIcon={<DollarSign className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('payroll.noPayrollsFound')}
        emptyDescription={searchTerm ? t('payroll.tryAdjustingSearch') : t('payroll.addFirstPayroll')}
        loadingText={t('payroll.loadingPayrolls')}
        maxHeight="75vh"
        stickyHeader
      />

      <ConfirmDialog />

      {showPrint && (
        <PayrollReportPrint payrolls={payrolls} onClose={() => setShowPrint(false)} />
      )}
    </div>
  );
};

export default PayrollList;
