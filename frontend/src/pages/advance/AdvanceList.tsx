import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, DollarSign, Calendar, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DataTable, { TableColumn, TableAction, FilterOption } from '@/components/ui/data-table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar, CalendarProvider } from '@/contexts/CalendarContext';
import { formatDateByCalendarType } from '@/utils/calendar';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';
import AdvanceReportPrint from './AdvanceReportPrint';

export const AdvanceList = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showPrint, setShowPrint] = useState(false);

  const { data: advancesData, isLoading } = useFetchObjects<{
    results: any[];
    count: number;
    next: string | null;
    previous: string | null;
  }>({
    queryKey: ['advances', currentPage.toString(), pageSize.toString(), searchTerm, employeeFilter, monthFilter, yearFilter],
    endpoint: 'advances',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm,
      ...(employeeFilter !== 'all' && { employee: employeeFilter }),
      ...(monthFilter !== 'all' && { month: monthFilter }),
      ...(yearFilter !== 'all' && { year: yearFilter })
    }
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['advances'],
    endpoint: 'advances'
  });

  const advances = advancesData?.results || [];
  const totalItems = advancesData?.count || 0;

  const { data: employeesData } = useFetchObjects({ queryKey: ['employees-all'], endpoint: 'employees/' });
  const employees = Array.isArray(employeesData) ? employeesData : employeesData?.results || [];

  const handleEdit = (advance: any) => {
    navigate(`/advance/${advance.id}/edit`);
  };

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

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => ({ value: (currentYear - 5 + i).toString(), label: (currentYear - 5 + i).toString() }));

  const { calendarType } = useCalendar();
  const lang = t('language.code') as 'fa' | 'ps';

  const columns: TableColumn[] = [
    {
      key: 'employee_details',
      title: t('advance.employee'),
      render: (value) => (
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="font-semibold text-xs">{value?.full_name || 'N/A'}</span>
          </div>
          {value?.position && <div className="text-xs text-gray-500">{value.position}</div>}
        </div>
      )
    },
    {
      key: 'amount',
      title: t('advance.amount'),
      render: (value, record) => (
        <span className="font-bold text-xs text-orange-600">
          {Number(value || 0).toFixed(2)} {record.currency_details?.code || ''}
        </span>
      )
    },
    {
      key: 'month',
      title: t('advance.month'),
      render: (value) => (
        <Badge variant="outline">
          {months.find(m => m.value === value)?.label || value}
        </Badge>
      )
    },
    {
      key: 'year',
      title: t('advance.year'),
      render: (value) => <Badge variant="secondary">{value}</Badge>
    },
    {
      key: 'payment_date',
      title: t('advance.paymentDate'),
      render: (value) => {
        if (!value) return 'N/A';
        return (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div className="text-base">
              <div className="font-medium">
                {formatDateByCalendarType(value, calendarType, lang)}
              </div>
              <div className="text-gray-500">
                {new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'reason',
      title: t('advance.reason'),
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
      label: t('advance.view'),
      icon: <Eye className="h-4 w-4" />,
      onClick: (record) => navigate(`/advance/${record.id}`),
      tooltip: t('advance.viewDetails')
    },
    {
      key: 'edit',
      label: t('advance.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('advance.editAdvance')
    },
    {
      key: 'delete',
      label: t('advance.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record) => {
        const employeeName = record.employee_details?.full_name || 'Advance';
        handleDelete(record.id, `${employeeName} - ${record.amount} (${record.month} ${record.year})`);
      },
      variant: 'ghost',
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('advance.deleteAdvance')
    }
  ];

  const filters: FilterOption[] = [
    {
      key: 'employee',
      label: t('advance.employee'),
      placeholder: t('advance.filterByEmployee'),
      width: 'sm:w-48',
      options: employees.map(e => ({
        value: e.id.toString(),
        label: e.full_name || 'N/A'
      }))
    },
    {
      key: 'month',
      label: t('advance.month'),
      placeholder: t('advance.filterByMonth'),
      width: 'sm:w-40',
      options: months
    },
    {
      key: 'year',
      label: t('advance.year'),
      placeholder: t('advance.filterByYear'),
      width: 'sm:w-32',
      options: years
    }
  ];

  const filterValues = {
    employee: employeeFilter,
    month: monthFilter,
    year: yearFilter
  };

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'employee') {
      setEmployeeFilter(value);
      setCurrentPage(1);
    } else if (key === 'month') {
      setMonthFilter(value);
      setCurrentPage(1);
    } else if (key === 'year') {
      setYearFilter(value);
      setCurrentPage(1);
    }
  };

  const handleClearFilters = () => {
    setEmployeeFilter('all');
    setMonthFilter('all');
    setYearFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 p-6">
      <CalendarProvider>
        <DataTable
        data={advances}
        columns={columns}
        loading={isLoading}
        title={t('advance.advances')}
        subtitle={t('advance.manageEmployeeAdvances')}
        icon={<DollarSign className="h-5 w-5" />}
        headerActions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowPrint(true)} disabled={advances.length === 0}>
              <Printer className="mr-2 h-4 w-4" />
              {t('advance.printReport', 'Print')}
            </Button>
            <Button onClick={() => navigate('/advance/add')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('advance.addAdvance')}
            </Button>
          </div>
        }
        searchable
        searchPlaceholder={t('advance.searchAdvances')}
        searchValue={searchTerm}
        onSearch={handleSearch}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        showClearFilters={true}
        clearFiltersLabel={t('advance.clearFilters')}
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
        emptyTitle={t('advance.noAdvancesFound')}
        emptyDescription={searchTerm ? t('advance.tryAdjustingSearch') : t('advance.addFirstAdvance')}
        loadingText={t('advance.loadingAdvances')}
        maxHeight="75vh"
        stickyHeader={true}
      />
      </CalendarProvider>

      <ConfirmDialog />

      {showPrint && (
        <AdvanceReportPrint advances={advances} onClose={() => setShowPrint(false)} />
      )}
    </div>
  );
};

export default AdvanceList;
