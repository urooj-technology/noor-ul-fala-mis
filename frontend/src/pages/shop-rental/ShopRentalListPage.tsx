import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Receipt, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Autocomplete } from '@/components/ui/autocomplete';
import DataTable, { TableColumn, TableAction } from '@/components/ui/data-table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar, CalendarProvider } from '@/contexts/CalendarContext';
import { getMonthNames } from '@/utils/calendar';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { formatNumber } from '@/lib/formatNumber';

const getCurrentShamsiYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return month < 3 || (month === 3 && day < 21) ? year - 622 : year - 621;
};

export const ShopRentalListPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { calendarType } = useCalendar();
  const { formatDate } = useFormattedDate();
  const lang = t('language.code') as 'fa' | 'ps';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [shopFilter, setShopFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: rentalsData, isLoading } = useFetchObjects<{
    results: any[];
    count: number;
  }>({
    queryKey: ['shop-rentals', currentPage.toString(), pageSize.toString(), searchTerm, statusFilter, shopFilter],
    endpoint: 'shop-rentals/',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm,
      year: getCurrentShamsiYear().toString(),
      ...(statusFilter && { rental_status: statusFilter }),
      ...(shopFilter && { shop: shopFilter }),
    },
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: 'shop-rentals',
    endpoint: 'shop-rentals',
  });

  const rentals = rentalsData?.results || [];
  const totalItems = rentalsData?.count || 0;

  const handleEdit = (rental: any) => navigate(`/shop-rentals/${rental.id}/edit`);
  const handleDetails = (rental: any) => navigate(`/shop-rentals/${rental.id}`);
  const handleAddPayment = (rental: any) => navigate(`/shop-rental-payments/add?rental_id=${rental.id}`);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      renewed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    };
    return (
      <Badge variant="default" className={colors[status] || ''}>
        {t(`shop-rental.rentalStatusOptions.${status}`) || status}
      </Badge>
    );
  };

  const monthNames = getMonthNames(calendarType, lang);

  const renderMonthBadges = (paymentSummary: any) => {
    if (!paymentSummary?.months_status) return null;
    const monthsStatus = paymentSummary.months_status;
    return (
      <div className="flex flex-wrap gap-0.5 max-w-[220px]">
        {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((month) => {
          const status = monthsStatus[month];
          const isPaid = status?.is_paid || false;
          const monthIndex = parseInt(month, 10) - 1;
          const monthLabel = monthNames[monthIndex]?.substring(0, 3) || month;
          return (
            <span
              key={month}
              className={`text-[9px] px-1 py-0.5 rounded ${
                isPaid ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
              }`}
            >
              {monthLabel}
            </span>
          );
        })}
      </div>
    );
  };

  const columns: TableColumn[] = [
    {
      key: 'shop_details',
      title: t('shop-rental.shop'),
      render: (value) => <span className="text-xs font-medium">{value?.shop_number || 'N/A'} - {value?.name || ''}</span>,
    },
    {
      key: 'tenant_details',
      title: t('shop-rental.tenant'),
      render: (value) => <span className="text-xs">{value?.full_name || 'N/A'}</span>,
    },
    {
      key: 'start_date',
      title: t('shop-rental.startDate'),
      render: (value) => <span className="text-xs" dir="rtl">{formatDate(value)}</span>,
    },
    {
      key: 'end_date',
      title: t('shop-rental.endDate'),
      render: (value) => <span className="text-xs" dir="rtl">{formatDate(value)}</span>,
    },
    {
      key: 'monthly_rent',
      title: t('shop-rental.monthlyRent'),
      render: (value, record) => (
        <span className="text-xs font-bold text-blue-600">
          {formatNumber(value)} {record.currency_details?.code || record.currency || ''}
        </span>
      ),
    },
    {
      key: 'payment_summary',
      title: t('shop-rental.paidThisYear', 'Paid (Year)'),
      render: (value, record) => (
        <span className="text-xs font-bold text-green-600">
          {formatNumber(value?.total_paid_year || 0)} {value?.currency || record.currency || ''}
        </span>
      ),
    },
    {
      key: 'payment_summary',
      title: t('shop-rental.remainingYear', 'Remaining (Year)'),
      render: (value, record) => {
        const remaining = value?.total_remaining_year || 0;
        return (
          <span className={`text-xs font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatNumber(remaining)} {value?.currency || record.currency || ''}
          </span>
        );
      },
    },
    {
      key: 'payment_summary',
      title: t('shop-rental.monthlyStatus', 'Monthly Status'),
      render: (value) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-green-600 font-medium">{value?.months_paid_count || 0}</span>
            <span className="text-muted-foreground">/ 12</span>
          </div>
          {renderMonthBadges(value)}
        </div>
      ),
    },
    {
      key: 'rental_status',
      title: t('shop-rental.rentalStatus'),
      render: (value) => getStatusBadge(value || 'active'),
    },
  ];

  const rowActions: TableAction[] = [
    { key: 'add_payment', label: t('shop-rental.addPayment'), icon: <DollarSign className="h-4 w-4" />, onClick: handleAddPayment },
    { key: 'view', label: t('shop-rental.viewDetails'), icon: <Eye className="h-4 w-4" />, onClick: handleDetails },
    { key: 'edit', label: t('shop-rental.edit'), icon: <Edit className="h-4 w-4" />, onClick: handleEdit },
    {
      key: 'delete',
      label: t('shop-rental.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record) => handleDelete(record.id, `Rental ${record.shop_details?.name || ''}`),
      variant: 'ghost',
      className: 'text-red-600 hover:text-red-700',
    },
  ];

  const rentalStatusOptions = [
    { value: 'active', label: t('shop-rental.rentalStatusOptions.active') },
    { value: 'expired', label: t('shop-rental.rentalStatusOptions.expired') },
    { value: 'cancelled', label: t('shop-rental.rentalStatusOptions.cancelled') },
    { value: 'renewed', label: t('shop-rental.rentalStatusOptions.renewed') },
  ];

  return (
    <div className="space-y-6 p-6">
      <CalendarProvider>
        <DataTable
          data={rentals}
          columns={columns}
          loading={isLoading}
          title={t('shop-rental.shopRentals')}
          subtitle={t('shop-rental.manageRentals')}
          icon={<Receipt className="h-5 w-5" />}
          headerActions={
            <Button onClick={() => navigate('/shop-rentals/add')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('shop-rental.addRental')}
            </Button>
          }
          searchable
          searchPlaceholder={t('shop-rental.searchRentals')}
          searchValue={searchTerm}
          onSearch={(value) => { setSearchTerm(value); setCurrentPage(1); }}
          customFilters={[
            {
              key: 'shop',
              label: t('shop-rental.shop'),
              component: (
                <Autocomplete
                  endpoint="shops/"
                  value={shopFilter}
                  onChange={(v) => { setShopFilter(v); setCurrentPage(1); }}
                  placeholder={t('shop-rental.selectShop')}
                  getOptionLabel={(s) => s.name}
                  getOptionValue={(s) => s.id.toString()}
                />
              ),
            },
            {
              key: 'status',
              label: t('shop-rental.rentalStatus'),
              component: (
                <Autocomplete
                  options={rentalStatusOptions}
                  value={statusFilter}
                  onChange={(v) => { setStatusFilter(v as string); setCurrentPage(1); }}
                  placeholder={t('shop-rental.selectRentalStatus')}
                  getOptionLabel={(s) => s.label}
                  getOptionValue={(s) => s.value}
                />
              ),
            },
          ]}
          showClearFilters={!!statusFilter || !!shopFilter || !!searchTerm}
          clearFiltersLabel={t('shop-rental.clearFilters')}
          onClearFilters={() => { setStatusFilter(''); setShopFilter(''); setSearchTerm(''); setCurrentPage(1); }}
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
          emptyIcon={<Receipt className="h-8 w-8 text-muted-foreground" />}
          emptyTitle={t('shop-rental.noRentalsFound')}
          emptyDescription={searchTerm ? t('shop-rental.tryAdjustingSearch') : t('shop-rental.addFirstRental')}
          loadingText={t('shop-rental.loadingRentals')}
          maxHeight="75vh"
          stickyHeader
        />
        <ConfirmDialog />
      </CalendarProvider>
    </div>
  );
};

export default ShopRentalListPage;
