import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, FileText } from 'lucide-react';
import { PermissionButton } from '@/components/ui/permission-button';
import { Badge } from '@/components/ui/badge';
import DataTable, { TableColumn, TableAction, FilterOption } from '@/components/ui/data-table';
import { usePermissions } from '@/contexts/PermissionContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar, CalendarProvider } from '@/contexts/CalendarContext';
import { formatDateByCalendarType } from '@/utils/calendar';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';

export const JournalEntryList = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('edit_journal_entries');
  const canDelete = hasPermission('delete_journal_entries');
  const lang = t('language.code') as 'fa' | 'ps';
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: entriesData, isLoading } = useFetchObjects<{
    results: any[];
    count: number;
    next: string | null;
    previous: string | null;
  }>({
    queryKey: ['journal-entries', currentPage.toString(), pageSize.toString(), searchTerm, dateFilter],
    endpoint: 'journal-entries',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm,
      ...(dateFilter && { date: dateFilter })
    }
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['journal-entries'],
    endpoint: 'journal-entries'
  });

  const entries = entriesData?.results || [];
  const totalItems = entriesData?.count || 0;

  const handleDetails = (entry: any) => {
    navigate(`/journal-entries/${entry.id}`);
  };

  const handleEdit = (entry: any) => {
    navigate(`/journal-entries/${entry.id}/edit`);
  };

  const columns: TableColumn[] = [
    {
      key: 'date',
      title: t('accounting.date'),
      render: (value) => (
        <span className="text-xs">
          {formatDateByCalendarType(value, calendarType, lang)}
        </span>
      )
    },
    {
      key: 'account_name',
      title: t('accounting.account'),
      render: (value) => <span className="font-medium text-xs">{value || 'N/A'}</span>
    },
    {
      key: 'account_code',
      title: t('accounting.accountCode'),
      render: (value) => <span className="text-xs">{value || 'N/A'}</span>
    },
    {
      key: 'debit',
      title: t('accounting.debit'),
      render: (value) => (
        <span className="font-bold text-xs text-green-600">
          {Number(value || 0).toFixed(2)}
        </span>
      )
    },
    {
      key: 'credit',
      title: t('accounting.credit'),
      render: (value) => (
        <span className="font-bold text-xs text-blue-600">
          {Number(value || 0).toFixed(2)}
        </span>
      )
    },
    {
      key: 'transaction_number',
      title: t('accounting.transaction'),
      render: (value) => (
        <Badge variant="secondary">
          {value || 'N/A'}
        </Badge>
      )
    },
    {
      key: 'description',
      title: t('accounting.description'),
      render: (value) => <span className="text-xs">{value || 'N/A'}</span>
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
      tooltip: t('accounting.edit')
    }] : []),
    ...(canDelete ? [{
      key: 'delete',
      label: t('accounting.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record: { id: number; description?: string }) => handleDelete(record.id, record.description || 'Journal Entry'),
      variant: 'ghost' as const,
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('accounting.deleteJournalEntry')
    }] : []),
  ];

  const filters: FilterOption[] = [
    {
      key: 'date',
      label: t('accounting.date'),
      placeholder: t('accounting.filterByDate'),
      type: 'date',
      width: 'sm:w-40'
    }
  ];

  const filterValues = {
    date: dateFilter
  };

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'date') {
      setDateFilter(value);
      setCurrentPage(1);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setDateFilter('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 p-6">
      <CalendarProvider>
        <DataTable
        data={entries}
        columns={columns}
        loading={isLoading}
        title={t('accounting.journalEntries')}
        subtitle={t('accounting.doubleEntryBookkeeping')}
        icon={<FileText className="h-5 w-5" />}
        headerActions={
          <PermissionButton permission="create_journal_entries" onClick={() => navigate('/journal-entries/add')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('accounting.addTransaction')}
          </PermissionButton>
        }
        searchable
        searchPlaceholder={t('accounting.searchJournalEntries')}
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
        emptyTitle={t('accounting.noJournalEntriesFound')}
        emptyDescription={searchTerm ? t('accounting.tryAdjustingSearch') : t('accounting.addFirstJournalEntry')}
        loadingText={t('accounting.loadingAccounts')}
        maxHeight="75vh"
        stickyHeader={true}
      />
      </CalendarProvider>

      <ConfirmDialog />
    </div>
  );
};

export default JournalEntryList;
