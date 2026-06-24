import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Calendar } from 'lucide-react';
import { PermissionButton } from '@/components/ui/permission-button';
import { Badge } from '@/components/ui/badge';
import DataTable, { TableColumn, TableAction, FilterOption } from '@/components/ui/data-table';
import { useCrudPermissions } from '@/hooks/useCrudPermissions';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar, CalendarProvider } from '@/contexts/CalendarContext';
import { formatDateByCalendarType } from '@/utils/calendar';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';

export const FiscalYearList = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const { canEdit, canDelete } = useCrudPermissions('accounting');
  const lang = t('language.code') as 'fa' | 'ps';
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: fiscalYearsData, isLoading } = useFetchObjects<{
    results: any[];
    count: number;
    next: string | null;
    previous: string | null;
  }>({
    queryKey: ['fiscal-years', currentPage.toString(), pageSize.toString(), searchTerm, statusFilter],
    endpoint: 'fiscal-years',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm,
      ...(statusFilter !== 'all' && { is_closed: statusFilter })
    }
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['fiscal-years'],
    endpoint: 'fiscal-years'
  });

  const fiscalYears = fiscalYearsData?.results || [];
  const totalItems = fiscalYearsData?.count || 0;

  const handleEdit = (fiscalYear: any) => {
    navigate(`/fiscal-years/${fiscalYear.id}/edit`);
  };

  const handleDetails = (fiscalYear: any) => {
    navigate(`/fiscal-years/${fiscalYear.id}`);
  };

  const getStatusBadge = (isClosed: boolean) => {
    return (
      <Badge variant={isClosed ? 'secondary' : 'default'}>
        {isClosed ? t('accounting.closed') : t('accounting.open')}
      </Badge>
    );
  };

  const columns: TableColumn[] = [
    {
      key: 'name',
      title: t('accounting.fiscalYearName'),
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="font-semibold text-xs">{value || 'N/A'}</span>
        </div>
      )
    },
    {
      key: 'start_date',
      title: t('accounting.fiscalYearStartDate'),
      render: (value) => (
        <span className="text-xs">
          {formatDateByCalendarType(value, calendarType, lang)}
        </span>
      )
    },
    {
      key: 'end_date',
      title: t('accounting.fiscalYearEndDate'),
      render: (value) => (
        <span className="text-xs">
          {formatDateByCalendarType(value, calendarType, lang)}
        </span>
      )
    },
    {
      key: 'is_closed',
      title: t('accounting.status'),
      render: (value) => getStatusBadge(value || false)
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
      tooltip: t('accounting.editFiscalYear')
    }] : []),
    ...(canDelete ? [{
      key: 'delete',
      label: t('accounting.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record: { id: number; name?: string }) => handleDelete(record.id, record.name || 'Fiscal Year'),
      variant: 'ghost' as const,
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('accounting.deleteFiscalYear')
    }] : []),
  ];

  const filters: FilterOption[] = [
    {
      key: 'status',
      label: t('accounting.status'),
      placeholder: t('accounting.filterByStatus'),
      width: 'sm:w-40',
      options: [
        { value: 'true', label: t('accounting.closed') },
        { value: 'false', label: t('accounting.open') }
      ]
    }
  ];

  const filterValues = {
    status: statusFilter
  };

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'status') {
      setStatusFilter(value);
      setCurrentPage(1);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 p-6">
      <CalendarProvider>
        <DataTable
        data={fiscalYears}
        columns={columns}
        loading={isLoading}
        title={t('accounting.fiscalYears')}
        subtitle={t('accounting.fiscalYears')}
        icon={<Calendar className="h-5 w-5" />}
        headerActions={
          <PermissionButton module="accounting" action="create" onClick={() => navigate('/fiscal-years/add')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('accounting.addFiscalYear')}
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
        emptyIcon={<Calendar className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('accounting.noFiscalYearsFound')}
        emptyDescription={searchTerm ? t('accounting.tryAdjustingSearch') : t('accounting.addFirstFiscalYear')}
        loadingText={t('accounting.loadingAccounts')}
        maxHeight="75vh"
        stickyHeader={true}
      />
      </CalendarProvider>

      <ConfirmDialog />
    </div>
  );
};

export default FiscalYearList;
