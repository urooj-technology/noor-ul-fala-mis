import { useMemo, useState, useEffect } from 'react';
import { ArchiveRestore, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DataTable, { FilterOption, TableAction, TableColumn } from '@/components/ui/data-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { keepPreviousData } from '@tanstack/react-query';
import useFetchObjects from '@/api/useFetchObjects';
import useAdd from '@/api/useAdd';
import { formatDateByCalendarType } from '@/utils/calendar';
import { toast } from 'sonner';

interface DeletedItem {
  id: number;
  model: string;
  model_label: string;
  label: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface DeletedItemsResponse {
  count: number;
  page: number;
  page_size: number;
  results: DeletedItem[];
  model_types: { key: string; label: string }[];
}

interface RestorePayload {
  items: { model: string; id: number }[];
}

const DEFAULT_MODEL_TYPES = [
  { key: 'employee', label: 'Employee' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'advance', label: 'Advance' },
  { key: 'student', label: 'Student' },
  { key: 'student_payment', label: 'Student Payment' },
  { key: 'expense', label: 'Expense' },
  { key: 'other_income', label: 'Other Income' },
  { key: 'transaction', label: 'Transaction' },
  { key: 'journal_entry', label: 'Journal Entry' },
  { key: 'account', label: 'Account' },
];

const DeletedItemsList = () => {
  const { t, language } = useLanguage();
  const { calendarType } = useCalendar();
  const lang = (language === 'en' ? 'en' : language) as 'fa' | 'ps' | 'en';
  const [searchTerm, setSearchTerm] = useState('');
  const [modelFilter, setModelFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRows, setSelectedRows] = useState<Array<string | number>>([]);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [pendingRestoreItems, setPendingRestoreItems] = useState<RestorePayload['items']>([]);

  const { data, isPending, isFetching, isError, error, refetch } = useFetchObjects<DeletedItemsResponse>({
    queryKey: ['deleted-items', modelFilter, searchTerm, String(currentPage), String(pageSize)],
    endpoint: 'deleted-items',
    params: {
      model: modelFilter,
      search: searchTerm,
      page: currentPage,
      page_size: pageSize,
    },
    options: {
      placeholderData: keepPreviousData,
    },
  });

  const { handleAdd, loading: restoring } = useAdd<RestorePayload>({
    queryKey: ['deleted-items'],
    endpoint: 'deleted-items/restore',
    customSuccessMessage: t('settings.deletedItems.restoreSuccess'),
  });

  const items = Array.isArray(data?.results) ? data.results : [];
  const totalItems = data?.count ?? 0;
  const modelTypes = data?.model_types?.length ? data.model_types : DEFAULT_MODEL_TYPES;
  const showLoading = isPending && !data;

  const rowKeyFor = (record: DeletedItem) => `${record.model}:${record.id}`;

  const selectedItems = useMemo(() => {
    return selectedRows
      .map((key) => {
        const [model, id] = String(key).split(':');
        return { model, id: Number(id) };
      })
      .filter((item) => item.model && item.id);
  }, [selectedRows]);

  const runRestore = (restoreItems: RestorePayload['items']) => {
    if (!restoreItems.length) return;
    handleAdd({ items: restoreItems });
    setRestoreDialogOpen(false);
    setPendingRestoreItems([]);
    setSelectedRows([]);
    setTimeout(() => refetch(), 400);
  };

  const openRestoreDialog = (restoreItems: RestorePayload['items']) => {
    setPendingRestoreItems(restoreItems);
    setRestoreDialogOpen(true);
  };

  const columns: TableColumn<DeletedItem>[] = [
    {
      key: 'model_label',
      title: t('settings.deletedItems.type'),
      render: (value) => (
        <Badge variant="outline" className="text-xs font-medium">
          {value}
        </Badge>
      ),
    },
    {
      key: 'label',
      title: t('settings.deletedItems.item'),
      render: (value) => <span className="text-sm font-medium">{value}</span>,
    },
    {
      key: 'deleted_at',
      title: t('settings.deletedItems.deletedAt'),
      render: (value) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {value ? formatDateByCalendarType(String(value).slice(0, 10), calendarType, lang) : '—'}
        </span>
      ),
    },
    {
      key: 'deleted_by',
      title: t('settings.deletedItems.deletedBy'),
      render: (value) => <span className="text-xs text-muted-foreground">{value || '—'}</span>,
    },
  ];

  const rowActions: TableAction<DeletedItem>[] = [
    {
      key: 'restore',
      label: t('settings.deletedItems.restore'),
      icon: <ArchiveRestore className="h-4 w-4" />,
      onClick: (record) => openRestoreDialog([{ model: record.model, id: record.id }]),
      variant: 'outline',
      tooltip: t('settings.deletedItems.restore'),
    },
  ];

  const filters: FilterOption[] = [
    {
      key: 'model',
      label: t('settings.deletedItems.type'),
      placeholder: t('settings.deletedItems.allTypes'),
      width: 'sm:w-56',
      options: modelTypes.map((type) => ({ value: type.key, label: type.label })),
    },
  ];

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'model') {
      setModelFilter(value || 'all');
      setCurrentPage(1);
      setSelectedRows([]);
    }
  };

  const handleClearFilters = () => {
    setModelFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
    setSelectedRows([]);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    setSelectedRows([]);
  };

  useEffect(() => {
    if (isError) {
      toast.error(t('common.error', 'Error'), {
        description: (error as any)?.response?.data?.detail || t('settings.deletedItems.loadError'),
      });
    }
  }, [isError, error, t]);

  return (
    <div className="space-y-6 p-6">
      <DataTable
        data={items}
        columns={columns}
        loading={showLoading}
        title={t('settings.deletedItems.title')}
        subtitle={t('settings.deletedItems.description')}
        icon={<Trash2 className="h-5 w-5" />}
        headerActions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              {t('common.refresh', 'Refresh')}
            </Button>
            {selectedItems.length > 0 && (
              <Button onClick={() => openRestoreDialog(selectedItems)} disabled={restoring}>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                {t('settings.deletedItems.restoreSelected')} ({selectedItems.length})
              </Button>
            )}
          </div>
        }
        searchable
        searchPlaceholder={t('settings.deletedItems.searchPlaceholder')}
        searchValue={searchTerm}
        onSearch={handleSearch}
        filters={filters}
        filterValues={{ model: modelFilter }}
        onFilterChange={handleFilterChange}
        showClearFilters
        clearFiltersLabel={t('settings.deletedItems.clearFilters', 'Clear filters')}
        onClearFilters={handleClearFilters}
        rowActions={rowActions}
        selectable
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        rowKey={rowKeyFor}
        bulkActions={[
          {
            key: 'restore-bulk',
            label: t('settings.deletedItems.restoreSelected'),
            icon: <ArchiveRestore className="h-4 w-4" />,
            onClick: (rows) => {
              const payload = rows.map((row) => ({ model: row.model, id: row.id }));
              openRestoreDialog(payload);
            },
          },
        ]}
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
            setSelectedRows([]);
          },
        }}
        emptyIcon={<Trash2 className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('settings.deletedItems.emptyTitle')}
        emptyDescription={t('settings.deletedItems.emptyDescription')}
        loadingText={t('settings.deletedItems.loading', 'Loading deleted items...')}
        maxHeight="75vh"
        stickyHeader
      />

      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.deletedItems.restoreTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.deletedItems.restoreConfirm').replace(
                '{{count}}',
                String(pendingRestoreItems.length)
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => runRestore(pendingRestoreItems)}
              disabled={restoring}
            >
              {restoring ? t('settings.deletedItems.restoring') : t('settings.deletedItems.restore')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeletedItemsList;
