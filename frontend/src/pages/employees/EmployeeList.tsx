import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Users } from 'lucide-react';
import { PermissionButton } from '@/components/ui/permission-button';
import { Badge } from '@/components/ui/badge';
import DataTable, { TableColumn, TableAction, FilterOption } from '@/components/ui/data-table';
import { useCrudPermissions } from '@/hooks/useCrudPermissions';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';
import { getCurrentYear, getYearsArray, SHAMSI_MONTHS_DARI, SHAMSI_MONTHS_PASHTO, gregorianToShamsi } from '@/utils/calendar';
import {
  formatFinanceAmount,
} from '@/components/ui/employee-finance-summary';
import { Employee } from '@/types/employee';
import { getEmployeePositionLabel, getEmployeePositionOptions } from '@/lib/employee-positions';

const getCurrentShamsiMonth = () => {
  const now = new Date();
  const shamsi = gregorianToShamsi(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return shamsi.month;
};

export const EmployeeList = () => {
  const { t, language } = useLanguage();
  const { calendarType } = useCalendar();
  const { canEdit, canDelete } = useCrudPermissions('employees');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const currentYear = getCurrentYear(calendarType);
  const months = language === 'ps' ? SHAMSI_MONTHS_PASHTO : SHAMSI_MONTHS_DARI;
  const years = getYearsArray(calendarType, 10);

  const [selectedMonth, setSelectedMonth] = useState(getCurrentShamsiMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data: employeesData, isLoading } = useFetchObjects<{
    results: Employee[];
    count: number;
    next: string | null;
    previous: string | null;
  }>({
    queryKey: ['employees', currentPage.toString(), pageSize.toString(), searchTerm, statusFilter, positionFilter, selectedMonth.toString(), selectedYear.toString()],
    endpoint: 'employees',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm,
      month: selectedMonth,
      year: selectedYear,
      ...(statusFilter !== 'all' && { is_active: statusFilter }),
      ...(positionFilter !== 'all' && { position: positionFilter }),
    }
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['employees'],
    endpoint: 'employees'
  });

  const employees = employeesData?.results || [];
  const totalItems = employeesData?.count || 0;

  const selectedMonthName = months[selectedMonth - 1] || selectedMonth.toString();
  const periodLabel = `${selectedMonthName} ${selectedYear}`;

  const handleEdit = (employee: Employee) => {
    navigate(`/employees/${employee.id}/edit`);
  };

  const handleDetails = (employee: Employee) => {
    navigate(`/employees/${employee.id}`);
  };

  const columns: TableColumn[] = [
    {
      key: 'full_name',
      title: t('employees.name'),
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <span className="font-semibold text-xs">{value || 'N/A'}</span>
        </div>
      )
    },
    {
      key: 'position',
      title: t('employees.position'),
      render: (value) => <span className="text-xs">{getEmployeePositionLabel(t, value) || 'N/A'}</span>
    },
    {
      key: 'financial_summary_salary',
      title: t('employees.monthlySalary'),
      render: (_, record) => {
        const summary = record.financial_summary;
        const currency = summary?.currency?.code || record.currency || '';
        return (
          <span className="font-bold text-xs text-blue-600 whitespace-nowrap">
            {formatFinanceAmount(summary?.total_salary ?? record.salary, currency)}
          </span>
        );
      }
    },
    {
      key: 'financial_summary_payroll',
      title: t('employees.paidSalary'),
      render: (_, record) => {
        const summary = record.financial_summary;
        const currency = summary?.currency?.code || record.currency || '';
        return (
          <span className="font-semibold text-xs text-green-600 whitespace-nowrap">
            {formatFinanceAmount(summary?.payroll_paid, currency)}
          </span>
        );
      }
    },
    {
      key: 'financial_summary_advance',
      title: t('employees.advancePaid'),
      render: (_, record) => {
        const summary = record.financial_summary;
        const currency = summary?.currency?.code || record.currency || '';
        return (
          <span className="font-semibold text-xs text-orange-600 whitespace-nowrap">
            {formatFinanceAmount(summary?.advance_paid, currency)}
          </span>
        );
      }
    },
    {
      key: 'financial_summary_total',
      title: t('employees.totalPaid'),
      render: (_, record) => {
        const summary = record.financial_summary;
        const currency = summary?.currency?.code || record.currency || '';
        return (
          <span className="font-semibold text-xs text-red-600 whitespace-nowrap">
            {formatFinanceAmount(summary?.overall_paid, currency)}
          </span>
        );
      }
    },
    {
      key: 'financial_summary_remaining',
      title: t('employees.remaining'),
      render: (_, record) => {
        const summary = record.financial_summary;
        const currency = summary?.currency?.code || record.currency || '';
        const remaining = Number(summary?.remaining_amount ?? 0);
        return (
          <span className={`font-semibold text-xs whitespace-nowrap ${remaining < 0 ? 'text-red-600' : 'text-purple-600'}`}>
            {formatFinanceAmount(remaining, currency)}
          </span>
        );
      }
    },
    {
      key: 'is_active',
      title: t('employees.status'),
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? t('employees.active') : t('employees.inactive')}
        </Badge>
      )
    }
  ];

  const rowActions: TableAction[] = [
    {
      key: 'view',
      label: t('employees.viewDetails'),
      icon: <Eye className="h-4 w-4" />,
      onClick: handleDetails,
      tooltip: t('employees.viewDetails')
    },
    ...(canEdit ? [{
      key: 'edit',
      label: t('employees.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('employees.editEmployee')
    }] : []),
    ...(canDelete ? [{
      key: 'delete',
      label: t('employees.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record: Employee) => handleDelete(record.id, record.full_name || 'Employee'),
      variant: 'ghost' as const,
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('employees.deleteEmployee')
    }] : []),
  ];

  const filters: FilterOption[] = [
    {
      key: 'month',
      label: t('employees.month'),
      placeholder: t('employees.selectMonth'),
      width: 'sm:w-32',
      options: months.map((month, idx) => ({ value: (idx + 1).toString(), label: month }))
    },
    {
      key: 'year',
      label: t('employees.year'),
      placeholder: t('employees.selectYear'),
      width: 'sm:w-28',
      options: years.map((year) => ({ value: year.toString(), label: year.toString() }))
    },
    {
      key: 'position',
      label: t('employees.position'),
      placeholder: t('employees.filterByPosition'),
      width: 'sm:w-44',
      options: getEmployeePositionOptions(t),
    },
    {
      key: 'status',
      label: t('employees.status'),
      placeholder: t('employees.filterByStatus'),
      width: 'sm:w-40',
      options: [
        { value: 'true', label: t('employees.active') },
        { value: 'false', label: t('employees.inactive') }
      ]
    }
  ];

  const filterValues = {
    month: selectedMonth.toString(),
    year: selectedYear.toString(),
    position: positionFilter,
    status: statusFilter
  };

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'status') {
      setStatusFilter(value);
      setCurrentPage(1);
    } else if (key === 'position') {
      setPositionFilter(value);
      setCurrentPage(1);
    } else if (key === 'month') {
      setSelectedMonth(parseInt(value));
      setCurrentPage(1);
    } else if (key === 'year') {
      setSelectedYear(parseInt(value));
      setCurrentPage(1);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedMonth(getCurrentShamsiMonth());
    setSelectedYear(currentYear);
    setStatusFilter('all');
    setPositionFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('employees.financeForPeriod').replace('{month}', selectedMonthName).replace('{year}', selectedYear.toString())}
        </p>
      </div>

      <DataTable
        data={employees}
        columns={columns}
        loading={isLoading}
        title={t('employees.title')}
        subtitle={`${t('employees.manageEmployeeRecords')} — ${periodLabel}`}
        icon={<Users className="h-5 w-5" />}
        headerActions={
          <PermissionButton module="employees" action="create" onClick={() => navigate('/employees/add')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('employees.addEmployee')}
          </PermissionButton>
        }
        searchable
        searchPlaceholder={t('employees.searchEmployees')}
        searchValue={searchTerm}
        onSearch={handleSearch}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        showClearFilters={true}
        clearFiltersLabel={t('employees.clearFilters')}
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
        emptyIcon={<Users className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('employees.noEmployeesFound')}
        emptyDescription={searchTerm ? t('employees.tryAdjustingSearch') : t('employees.addFirstEmployee')}
        loadingText={t('employees.loadingEmployees')}
        maxHeight="70vh"
        stickyHeader={true}
      />

      <ConfirmDialog />
    </div>
  );
};

export default EmployeeList;
