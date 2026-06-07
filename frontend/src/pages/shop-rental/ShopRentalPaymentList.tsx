import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Autocomplete } from '@/components/ui/autocomplete';
import DataTable, { TableColumn, TableAction } from '@/components/ui/data-table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { formatDateByCalendarType } from '@/utils/calendar';
import { CalendarProvider } from '@/contexts/CalendarContext';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';
import { formatNumber } from '@/lib/formatNumber';

export const ShopRentalPaymentList = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [rentalFilter, setRentalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: paymentsData, isLoading, refetch } = useFetchObjects<{
    results: any[];
    count: number;
  }>({
    queryKey: ['shop-rental-payments', currentPage.toString(), pageSize.toString(), searchTerm, rentalFilter, statusFilter],
    endpoint: 'shop-rental-payments/',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm,
      ...(rentalFilter && { rental: rentalFilter }),
      ...(statusFilter && { payment_status: statusFilter })
    }
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['shop-rental-payments'],
    endpoint: 'shop-rental-payments',
    onSuccess: () => refetch()
  });

  const payments = paymentsData?.results || [];
  const totalItems = paymentsData?.count || 0;

  const handleEdit = (payment: any) => {
    navigate(`/shop-rental-payments/${payment.id}/edit`);
  };

  const handleDetails = (payment: any) => {
    navigate(`/shop-rental-payments/${payment.id}`);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      refunded: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    };
    return (
      <Badge className={colors[status] || 'bg-gray-100'}>
        {t(`shop-rental.paymentStatusOptions.${status}`) || status}
      </Badge>
    );
  };

  const { calendarType } = useCalendar();
  const lang = t('language.code') as 'fa' | 'ps';

  const columns: TableColumn[] = [
    {
      key: 'reference_number',
      title: t('shop-rental.referenceNumber'),
      render: (value) => (
        <span className="font-mono text-xs font-medium">{value || 'N/A'}</span>
      )
    },
    {
      key: 'rental_details',
      title: t('shop-rental.rental'),
      render: (value) => (
        <div>
          <div className="font-medium text-xs">{value?.shop_number || 'N/A'}</div>
          <div className="text-muted-foreground text-xs">{value?.tenant_name || ''}</div>
        </div>
      )
    },
    {
      key: 'amount',
      title: t('shop-rental.amount'),
      render: (value, record) => (
        <span className="font-bold text-xs text-green-600">
          {formatNumber(Number(value || 0))} {record.currency || ''}
        </span>
      )
    },
    {
      key: 'payment_date',
      title: t('shop-rental.paymentDate'),
      render: (value, record) => {
        if (!value) return 'N/A';
        return (
          <div>
            <div>
              {formatDateByCalendarType(value, calendarType, lang)}
            </div>
            <div className="text-muted-foreground text-xs">
              {new Date(value).toLocaleTimeString()}
            </div>
          </div>
        );
      }
    },
    {
      key: 'period',
      title: t('shop-rental.period'),
      render: (value, record) => (
        <span className="text-xs">
          {record.period_month}/{record.period_year}
        </span>
      )
    },
    {
      key: 'payment_status',
      title: t('shop-rental.status'),
      render: (value) => getStatusBadge(value || 'pending')
    },
    {
      key: 'receipt',
      title: t('shop-rental.receipt'),
      render: (value, record) => (
        record.receipt ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(record.receipt, '_blank')}
            className="h-6 w-6 p-0"
          >
            <Eye className="h-3 w-3" />
          </Button>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        )
      )
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
    {
      key: 'edit',
      label: t('shop-rental.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('shop-rental.editPayment')
    },
    {
      key: 'delete',
      label: t('shop-rental.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record) => handleDelete(record.id, record.reference_number || t('shop-rental.payments')),
      variant: 'ghost',
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('shop-rental.deletePayment')
    }
  ];

  const customFilters = [
    {
      key: 'rental',
      label: t('shop-rental.rental'),
      component: (
        <Autocomplete
          endpoint="shop-rentals"
          value={rentalFilter}
          onChange={(value) => {
            setRentalFilter(value as string);
            setCurrentPage(1);
          }}
          placeholder={t('shop-rental.selectRental')}
          getOptionLabel={(r: any) => `${r.shop?.shop_number || ''} - ${r.tenant?.full_name || ''}`}
          getOptionValue={(r: any) => r.id.toString()}
        />
      )
    },
    {
      key: 'status',
      label: t('shop-rental.status'),
      component: (
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border rounded px-3 py-2 text-sm w-40 bg-background"
        >
          <option value="">{t('shop-rental.allPaymentStatuses') || t('shop-rental.allStatuses')}</option>
          <option value="pending">{t('shop-rental.paymentStatusOptions.pending')}</option>
          <option value="completed">{t('shop-rental.paymentStatusOptions.completed')}</option>
          <option value="cancelled">{t('shop-rental.paymentStatusOptions.cancelled')}</option>
          <option value="refunded">{t('shop-rental.paymentStatusOptions.refunded')}</option>
        </select>
      )
    }
  ];

  const handleClearFilters = () => {
    setRentalFilter('');
    setStatusFilter('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveFilters = rentalFilter || statusFilter || searchTerm;

  return (
    <div className="space-y-6 p-6">
      <CalendarProvider>
        <DataTable
        data={payments}
        columns={columns}
        loading={isLoading}
        title={t('shop-rental.payments')}
        subtitle={t('shop-rental.managePayments')}
        icon={<CreditCard className="h-5 w-5" />}
        headerActions={
          <Button onClick={() => navigate('/shop-rental-payments/add')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('shop-rental.addPayment')}
          </Button>
        }
        searchable
        searchPlaceholder={t('shop-rental.searchPayments')}
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        customFilters={customFilters}
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
        emptyIcon={<CreditCard className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('shop-rental.noPaymentsFound')}
        emptyDescription={searchTerm ? t('shop-rental.tryAdjustingSearch') : t('shop-rental.addFirstPayment')}
        loadingText={t('shop-rental.loadingPayments')}
        maxHeight="75vh"
        stickyHeader={true}
      />
      </CalendarProvider>

      <ConfirmDialog />
    </div>
  );
};

export default ShopRentalPaymentList;