import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Store } from 'lucide-react';
import { PermissionButton } from '@/components/ui/permission-button';
import { Badge } from '@/components/ui/badge';
import { Autocomplete } from '@/components/ui/autocomplete';
import DataTable, { TableColumn, TableAction } from '@/components/ui/data-table';
import { useCrudPermissions } from '@/hooks/useCrudPermissions';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { formatDateByCalendarType } from '@/utils/calendar';
import { CalendarProvider } from '@/contexts/CalendarContext';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';

export const ShopRentalList = () => {
  const { t } = useLanguage();
  const { canEdit, canDelete } = useCrudPermissions('shop_rentals');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: shopsData, isLoading } = useFetchObjects<{
    results: any[];
    count: number;
    next: string | null;
    previous: string | null;
  }>({
    queryKey: ['shops', currentPage.toString(), pageSize.toString(), searchTerm, statusFilter],
    endpoint: 'shops',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm,
      ...(statusFilter && { status: statusFilter })
    }
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['shops'],
    endpoint: 'shops'
  });

  const shops = shopsData?.results || [];
  const totalItems = shopsData?.count || 0;

  const handleEdit = (shop: any) => {
    navigate(`/shops/${shop.id}/edit`);
  };

  const handleDetails = (shop: any) => {
    navigate(`/shops/${shop.id}`);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      available: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      rented: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      maintenance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      reserved: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    };
    return (
      <Badge variant={colors[status as keyof typeof colors] ? 'default' : 'secondary'}>
        {t(`shop-rental.statusOptions.${status}`) || status}
      </Badge>
    );
  };

  const columns: TableColumn[] = [
    {
      key: 'shop_number',
      title: t('shop-rental.shopNumber'),
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="font-semibold text-xs">{value || 'N/A'}</span>
        </div>
      )
    },
    {
      key: 'name',
      title: t('shop-rental.name'),
      render: (value) => <span className="text-xs">{value || 'N/A'}</span>
    },
    {
      key: 'location',
      title: t('shop-rental.location'),
      render: (value) => <span className="text-xs">{value || 'N/A'}</span>
    },
    {
      key: 'monthly_rent',
      title: t('shop-rental.monthlyRent'),
      render: (value, record) => (
        <span className="font-bold text-xs text-green-600">
          {Number(value || 0).toFixed(2)} {record.currency || ''}
        </span>
      )
    },
    {
      key: 'status',
      title: t('shop-rental.status'),
      render: (value) => getStatusBadge(value || 'available')
    }
  ];

  const rowActions: TableAction[] = [
    {
      key: 'view',
      label: t('shop-rental.viewDetails'),
      icon: <Eye className="h-4 w-4" />,
      onClick: handleDetails,
      tooltip: t('shop-rental.viewDetails')
    },
    ...(canEdit ? [{
      key: 'edit',
      label: t('shop-rental.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('shop-rental.editShop')
    }] : []),
    ...(canDelete ? [{
      key: 'delete',
      label: t('shop-rental.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record: { id: number; shop_number?: string }) => handleDelete(record.id, record.shop_number || 'Shop'),
      variant: 'ghost' as const,
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('shop-rental.deleteShop')
    }] : []),
  ];

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter || searchTerm;

  return (
    <div className="space-y-6 p-6">
      <CalendarProvider>
        <DataTable
        data={shops}
        columns={columns}
        loading={isLoading}
        title={t('shop-rental.shopRental')}
        subtitle={t('shop-rental.manageShops')}
        icon={<Store className="h-5 w-5" />}
        headerActions={
          <PermissionButton module="shop_rentals" action="create" onClick={() => navigate('/shops/add')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('shop-rental.addShop')}
          </PermissionButton>
        }
        searchable
        searchPlaceholder={t('shop-rental.searchShops')}
        searchValue={searchTerm}
        onSearch={handleSearch}
        showClearFilters={hasActiveFilters}
        clearFiltersLabel={t('shop-rental.clearFilters')}
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
        emptyIcon={<Store className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('shop-rental.noShopsFound')}
        emptyDescription={searchTerm ? t('shop-rental.tryAdjustingSearch') : t('shop-rental.addFirstShop')}
        loadingText={t('shop-rental.loadingShops')}
        maxHeight="75vh"
        stickyHeader={true}
      />
      </CalendarProvider>

      <ConfirmDialog />
    </div>
  );
};

export default ShopRentalList;
