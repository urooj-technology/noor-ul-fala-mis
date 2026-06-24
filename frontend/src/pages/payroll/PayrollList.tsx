import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, DollarSign, Calendar, User, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Autocomplete } from '@/components/ui/autocomplete';
import DataTable, { TableColumn, TableAction, FilterOption } from '@/components/ui/data-table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar, CalendarProvider } from '@/contexts/CalendarContext';
import { formatDateByCalendarType } from '@/utils/calendar';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';
import PayrollReportPrint from './PayrollReportPrint';

export const PayrollList = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showPrint, setShowPrint] = useState(false);

  const { data: payrollsData, isLoading } = useFetchObjects<{
    results: any[];
    count: number;
    next: string | null;
    previous: string | null;
  }>({
    queryKey: ['payrolls', currentPage.toString(), pageSize.toString(), searchTerm, employeeFilter, monthFilter, yearFilter],
    endpoint: 'payrolls',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm,
      ...(employeeFilter && { employee: employeeFilter }),
      ...(monthFilter !== 'all' && { month: monthFilter }),
      ...(yearFilter !== 'all' && { year: yearFilter })
    }
  });

  const { data: employeesData } = useFetchObjects({
    queryKey: ['employees-all'],
    endpoint: 'employees/'
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['payrolls'],
    endpoint: 'payrolls'
  });

  const totalItems = payrollsData?.count || 0;
  const payrolls = payrollsData?.results || [];
  const employees = Array.isArray(employeesData) ? employeesData : employeesData?.results || [];

  // Get year labels based on calendar type
  const currentYear = calendarType === 'shamsi' ? 1403 : new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  const months = [
    { value: 'january', label: t('advance.months.january') },
    { value: 'february', label: t('advance.months.february') },
    { value: 'march', label: t('advance.months.march') },
    { value: 'april', label: t('advance.months.april') },
    { value: 'may', label: t('advance.months.may') },
    { value: 'june', label: t('advance.months.june') },
    { value: 'july', label: t('advance.months.july') },
    { value: 'august', label: t('advance.months.august') },
    { value: 'september', label: t('advance.months.september') },
    { value: 'october', label: t('advance.months.october') },
    { value: 'november', label: t('advance.months.november') },
    { value: 'december', label: t('advance.months.december') },
  ];

  const calendarLabels = {
    shamsi: { year: t('payroll.yearShamsi', 'سال'), month: t('payroll.monthShamsi', 'ماه') },
    qamari: { year: t('payroll.yearQamari', 'سال'), month: t('payroll.monthQamari', 'ماه') },
  };

  const handleEdit = (payroll: any) => {
    navigate(`/payroll/${payroll.id}/edit`);
  };

  const handleDetails = (payroll: any) => {
    navigate(`/payroll/${payroll.id}`);
  };

  // Format payment date based on selected calendar type
  const formatPaymentDate = (record: any) => {
    if (calendarType === 'shamsi' && record.payment_date_shamsi) {
      return record.payment_date_shamsi.formatted;
    }
    if (calendarType === 'qamari' && record.payment_date_qamari) {
      return record.payment_date_qamari.formatted;
    }
    return record.payment_date || '-';
  };

  const columns: TableColumn[] = [
    {
      key: 'employee_details',
      title: t('payroll.employee'),
      render: (value) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium text-xs">{value?.full_name || 'N/A'}</div>
            {value?.position && <div className="text-xs text-gray-500">{value.position}</div>}
          </div>
        </div>
      )
    },
    {
      key: 'month',
      title: t('payroll.period'),
      render: (value, record) => {
        const monthLabel = months.find(m => m.value === value)?.label || value;
        return (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <Badge variant="outline">{monthLabel} {record.year}</Badge>
          </div>
        );
      }
    },
    {
      key: 'salary',
      title: t('payroll.salary'),
      render: (value, record) => (
        <span className="font-bold text-xs text-emerald-600">
          {Number(value || 0).toFixed(2)} {record.currency_details?.code || ''}
        </span>
      )
    },
    {
      key: 'payment_date',
      title: t('payroll.paymentDate'),
      render: (value, record) => {
        return (
          <div className="text-sm">
            {formatPaymentDate(record)}
          </div>
        );
      }
    }
  ];

  const rowActions: TableAction[] = [
    {
      key: 'view',
      label: t('payroll.viewDetails'),
      icon: <Eye className="h-4 w-4" />,
      onClick: handleDetails,
      tooltip: t('payroll.viewDetails')
    },
    {
      key: 'edit',
      label: t('payroll.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('payroll.editPayroll')
    },
    {
      key: 'delete',
      label: t('payroll.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record) => {
        const employeeName = record.employee_details?.full_name || 'Payroll';
        handleDelete(record.id, `${employeeName} - ${record.month} ${record.year}`);
      },
      variant: 'ghost',
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('payroll.deletePayroll')
    }
  ];

  const filters: FilterOption[] = [
    {
      key: 'year',
      label: calendarLabels[calendarType].year,
      placeholder: t('payroll.filterByYear'),
      width: 'sm:w-32',
      options: years.map(y => ({ value: y.toString(), label: y.toString() }))
    },
    {
      key: 'month',
      label: calendarLabels[calendarType].month,
      placeholder: t('payroll.filterByMonth'),
      width: 'sm:w-40',
      options: months
    }
  ];

  const filterValues = {
    year: yearFilter,
    month: monthFilter
  };

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'year') {
      setYearFilter(value);
      setCurrentPage(1);
    } else if (key === 'month') {
      setMonthFilter(value);
      setCurrentPage(1);
    }
  };

  const handleClearFilters = () => {
    setEmployeeFilter('');
    setYearFilter('all');
    setMonthFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const customFilters = [
    {
      key: 'employee',
      label: t('payroll.employee'),
      component: (
        <Autocomplete
          options={employees.map(e => ({
            id: e.id.toString(),
            value: e.id.toString(),
            label: `${e.full_name || 'N/A'}${e.position ? ` (${e.position})` : ''}`
          }))}
          getOptionLabel={(opt) => opt.label}
          getOptionValue={(opt) => opt.value}
          value={employeeFilter}
          onChange={(value) => {
            setEmployeeFilter(value);
            setCurrentPage(1);
          }}
          placeholder={t('payroll.filterByEmployee')}
        />
      )
    }
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
            <Button variant="outline" onClick={() => setShowPrint(true)} disabled={payrolls.length === 0}>
              <Printer className="mr-2 h-4 w-4" />
              {t('payroll.printReport', 'Print')}
            </Button>
            <Button onClick={() => navigate('/payroll/add')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('payroll.addPayroll')}
            </Button>
          </div>
        }
        searchable
        searchPlaceholder={t('payroll.searchPayrolls')}
        searchValue={searchTerm}
        onSearch={handleSearch}
        customFilters={customFilters}
        filters={filters}
        filterValues={filterValues}
        customFilterValues={{ employee: employeeFilter }}
        onFilterChange={handleFilterChange}
        showClearFilters={true}
        clearFiltersLabel={t('payroll.clearFilters')}
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
        emptyIcon={<DollarSign className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('payroll.noPayrollsFound')}
        emptyDescription={searchTerm ? t('payroll.tryAdjustingSearch') : t('payroll.addFirstPayroll')}
        loadingText={t('payroll.loadingPayrolls')}
        maxHeight="75vh"
        stickyHeader={true}
      />

      <ConfirmDialog />

      {showPrint && (
        <PayrollReportPrint payrolls={payrolls} onClose={() => setShowPrint(false)} />
      )}
    </div>
  );
};

export default PayrollList;
