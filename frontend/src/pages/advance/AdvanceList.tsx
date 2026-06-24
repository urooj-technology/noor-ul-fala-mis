import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, DollarSign, Calendar, User, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DataTable, { TableColumn, TableAction, FilterOption } from '@/components/ui/data-table';
import { PermissionButton } from '@/components/ui/permission-button';
import { useCrudPermissions } from '@/hooks/useCrudPermissions';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar, CalendarProvider } from '@/contexts/CalendarContext';
import { formatDateByCalendarType, getCurrentYear } from '@/utils/calendar';
import {
  buildShamsiMonthOptions,
  formatMoney,
  getShamsiMonthLabel,
} from '@/lib/hr-list-utils';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';
import AdvanceReportPrint from './AdvanceReportPrint';

export const AdvanceList = () => {
  const { t, language } = useLanguage();
  const { canEdit, canDelete, canExport } = useCrudPermissions('advances');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showPrint, setShowPrint] = useState(false);

  const { calendarType } = useCalendar();
  const lang = (language === 'ps' ? 'ps' : 'fa') as 'fa' | 'ps';
  const months = buildShamsiMonthOptions(lang);
  const currentYear = getCurrentYear(calendarType);
  const years = Array.from({ length: 10 }, (_, i) => ({
    value: (currentYear - 5 + i).toString(),
    label: (currentYear - 5 + i).toString(),
  }));

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
      ...(yearFilter !== 'all' && { year: yearFilter }),
    },
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['advances'],
    endpoint: 'advances',
  });

  const advances = advancesData?.results || [];
  const totalItems = advancesData?.count || 0;

  const { data: employeesData } = useFetchObjects({ queryKey: ['employees-all'], endpoint: 'employees/' });
  const employees = Array.isArray(employeesData) ? employeesData : employeesData?.results || [];

  const handleEdit = (advance: any) => navigate(`/advance/${advance.id}/edit`);

  const renderMoney = (value: number | string | undefined, currency?: string, className = '') => (
    <span className={`font-semibold text-xs tabular-nums ${className}`}>
      {formatMoney(value, currency)}
    </span>
  );

  const columns: TableColumn[] = [
    {
      key: 'employee_details',
      title: t('advance.employee'),
      render: (value) => (
        <div className="flex items-center gap-2 min-w-[140px]">
          <User className="h-4 w-4 text-gray-400 shrink-0" />
          <div>
            <div className="font-medium text-xs">{value?.full_name || 'N/A'}</div>
            {value?.position && <div className="text-[11px] text-muted-foreground">{value.position}</div>}
            {value?.phone && <div className="text-[11px] text-muted-foreground">{value.phone}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'month',
      title: t('advance.month'),
      render: (value, record) => (
        <Badge variant="outline">
          {getShamsiMonthLabel(value, lang)} {record.year}
        </Badge>
      ),
    },
    {
      key: 'period_summary',
      title: t('advance.monthlySalary'),
      render: (_value, record) => renderMoney(
        record.period_summary?.total_salary ?? record.employee_details?.salary,
        record.currency_details?.code,
        'text-blue-600',
      ),
    },
    {
      key: 'amount',
      title: t('advance.paidAmount'),
      render: (value, record) => renderMoney(value, record.currency_details?.code, 'text-orange-600'),
    },
    {
      key: 'advance_paid',
      title: t('advance.advancePaid'),
      render: (_value, record) => renderMoney(
        record.period_summary?.advance_paid,
        record.currency_details?.code,
        'text-orange-600',
      ),
    },
    {
      key: 'overall_paid',
      title: t('advance.totalPaid'),
      render: (_value, record) => renderMoney(
        record.period_summary?.overall_paid,
        record.currency_details?.code,
        'text-red-600',
      ),
    },
    {
      key: 'remaining_amount',
      title: t('advance.remaining'),
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
      title: t('advance.paymentDate'),
      render: (value) => {
        if (!value) return 'N/A';
        return (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-xs whitespace-nowrap">
              {formatDateByCalendarType(value, calendarType, lang)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'reason',
      title: t('advance.reason'),
      render: (value) => (
        <div className="max-w-[160px] truncate text-xs" title={value || ''}>
          {value || '-'}
        </div>
      ),
    },
  ];

  const rowActions: TableAction[] = [
    {
      key: 'view',
      label: t('advance.view'),
      icon: <Eye className="h-4 w-4" />,
      onClick: (record) => navigate(`/advance/${record.id}`),
      tooltip: t('advance.viewDetails'),
    },
    ...(canEdit ? [{
      key: 'edit',
      label: t('advance.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('advance.editAdvance'),
    }] : []),
    ...(canDelete ? [{
      key: 'delete',
      label: t('advance.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record: { id: number; employee_details?: { full_name?: string }; amount: number; month: number; year: number }) => {
        const employeeName = record.employee_details?.full_name || 'Advance';
        handleDelete(record.id, `${employeeName} - ${record.amount} (${getShamsiMonthLabel(record.month, lang)} ${record.year})`);
      },
      variant: 'ghost' as const,
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('advance.deleteAdvance'),
    }] : []),
  ];

  const filters: FilterOption[] = [
    {
      key: 'employee',
      label: t('advance.employee'),
      placeholder: t('advance.filterByEmployee'),
      width: 'sm:w-48',
      options: employees.map((e: { id: number; full_name?: string }) => ({
        value: e.id.toString(),
        label: e.full_name || 'N/A',
      })),
    },
    {
      key: 'month',
      label: t('advance.month'),
      placeholder: t('advance.filterByMonth'),
      width: 'sm:w-40',
      options: months,
    },
    {
      key: 'year',
      label: t('advance.year'),
      placeholder: t('advance.filterByYear'),
      width: 'sm:w-32',
      options: years,
    },
  ];

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
              {canExport && (
                <Button variant="outline" onClick={() => setShowPrint(true)} disabled={advances.length === 0}>
                  <Printer className="mr-2 h-4 w-4" />
                  {t('advance.printReport', 'Print')}
                </Button>
              )}
              <PermissionButton module="advances" action="create" onClick={() => navigate('/advance/add')}>
                <Plus className="mr-2 h-4 w-4" />
                {t('advance.addAdvance')}
              </PermissionButton>
            </div>
          }
          searchable
          searchPlaceholder={t('advance.searchAdvances')}
          searchValue={searchTerm}
          onSearch={(value) => { setSearchTerm(value); setCurrentPage(1); }}
          filters={filters}
          filterValues={{ employee: employeeFilter, month: monthFilter, year: yearFilter }}
          onFilterChange={(key, value) => {
            if (key === 'employee') { setEmployeeFilter(value); setCurrentPage(1); }
            if (key === 'month') { setMonthFilter(value); setCurrentPage(1); }
            if (key === 'year') { setYearFilter(value); setCurrentPage(1); }
          }}
          showClearFilters
          clearFiltersLabel={t('advance.clearFilters')}
          onClearFilters={() => {
            setEmployeeFilter('all');
            setMonthFilter('all');
            setYearFilter('all');
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
          emptyTitle={t('advance.noAdvancesFound')}
          emptyDescription={searchTerm ? t('advance.tryAdjustingSearch') : t('advance.addFirstAdvance')}
          loadingText={t('advance.loadingAdvances')}
          maxHeight="75vh"
          stickyHeader
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
