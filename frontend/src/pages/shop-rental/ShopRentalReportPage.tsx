import { useState } from 'react';
import { FileBarChart, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Autocomplete } from '@/components/ui/autocomplete';
import { DatePicker } from '@/components/ui/date-picker';
import DataTable, { TableColumn } from '@/components/ui/data-table';
import { useLanguage } from '@/contexts/LanguageContext';
import { CalendarProvider, useCalendar } from '@/contexts/CalendarContext';
import { getMonthNames } from '@/utils/calendar';
import { useCrudPermissions } from '@/hooks/useCrudPermissions';
import useFetchObjects from '@/api/useFetchObjects';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { formatNumber } from '@/lib/formatNumber';
import ShopRentalBulkPrint from './ShopRentalBulkPrint';

type DatePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

const getCurrentShamsiYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return month < 3 || (month === 3 && day < 21) ? year - 622 : year - 621;
};

const ShopRentalReportContent = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const { canExport } = useCrudPermissions('shop_rentals');
  const { formatDate } = useFormattedDate();
  const lang = t('language.code') as 'fa' | 'ps';

  const [datePeriod, setDatePeriod] = useState<DatePeriod>('monthly');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showPrint, setShowPrint] = useState(false);

  const isCustomReady = datePeriod !== 'custom' || (Boolean(customDateFrom) && Boolean(customDateTo));
  const reportYear = getCurrentShamsiYear().toString();

  const { data: rentalsData, isLoading } = useFetchObjects<{
    results: any[];
    count: number;
  }>({
    queryKey: ['shop-rental-report-rentals', reportYear, datePeriod, customDateFrom, customDateTo],
    endpoint: 'shop-rentals/',
    enabled: isCustomReady,
    params: {
      for_report: '1',
      year: reportYear,
      date_period: datePeriod,
      ...(datePeriod === 'custom' && {
        date_from: customDateFrom,
        date_to: customDateTo,
      }),
    },
  });

  const periodOptions = [
    { value: 'daily', label: t('shop-rental.startDatePeriodOptions.daily') },
    { value: 'weekly', label: t('shop-rental.startDatePeriodOptions.weekly') },
    { value: 'monthly', label: t('shop-rental.startDatePeriodOptions.monthly') },
    { value: 'yearly', label: t('shop-rental.startDatePeriodOptions.yearly') },
    { value: 'custom', label: t('shop-rental.startDatePeriodOptions.custom') },
  ];

  const rentals = rentalsData?.results || [];
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
                isPaid
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
              }`}
            >
              {monthLabel}
            </span>
          );
        })}
      </div>
    );
  };

  const rentalColumns: TableColumn[] = [
    {
      key: 'shop_details',
      title: t('shop-rental.shop'),
      render: (value) => (
        <span className="text-xs font-medium">
          {value?.shop_number || 'N/A'} - {value?.name || ''}
        </span>
      ),
    },
    {
      key: 'tenant_details',
      title: t('shop-rental.tenant'),
      render: (value) => <span className="text-xs">{value?.full_name || 'N/A'}</span>,
    },
    {
      key: 'start_date',
      title: t('shop-rental.startDate'),
      render: (value) => (
        <span className="text-xs" dir="rtl">
          {formatDate(value)}
        </span>
      ),
    },
    {
      key: 'end_date',
      title: t('shop-rental.endDate'),
      render: (value) => (
        <span className="text-xs" dir="rtl">
          {formatDate(value)}
        </span>
      ),
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
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileBarChart className="h-6 w-6 text-primary" />
          {t('shop-rental.reports')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t('shop-rental.reportsDesc')}</p>
      </div>

      <Card className="no-print">
        <CardHeader>
          <CardTitle>{t('shop-rental.reportDatePeriod')}</CardTitle>
          <CardDescription>{t('shop-rental.reportFiltersDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row flex-wrap items-end gap-4">
            <div className="space-y-2 w-full sm:w-56">
              <label className="text-sm font-medium">{t('shop-rental.reportDatePeriod')}</label>
              <Autocomplete
                options={periodOptions}
                value={datePeriod}
                onChange={(v) => {
                  setDatePeriod((v as DatePeriod) || 'monthly');
                  if (v !== 'custom') {
                    setCustomDateFrom('');
                    setCustomDateTo('');
                  }
                }}
                getOptionLabel={(o) => o.label}
                getOptionValue={(o) => o.value}
              />
            </div>
            {datePeriod === 'custom' && (
              <>
                <div className="space-y-2 w-full sm:w-48">
                  <label className="text-sm font-medium">{t('shop-rental.dateFrom')}</label>
                  <DatePicker value={customDateFrom} onChange={setCustomDateFrom} />
                </div>
                <div className="space-y-2 w-full sm:w-48">
                  <label className="text-sm font-medium">{t('shop-rental.dateTo')}</label>
                  <DatePicker value={customDateTo} onChange={setCustomDateTo} />
                </div>
              </>
            )}
            {canExport && (
            <Button
              variant="outline"
              onClick={() => setShowPrint(true)}
              disabled={!isCustomReady || isLoading || rentals.length === 0}
            >
              <Printer className="mr-2 h-4 w-4" />
              {t('shop-rental.printReport')}
            </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isCustomReady && (
        <div id="shop-rental-report-preview">
          <DataTable
            data={rentals}
            columns={rentalColumns}
            loading={isLoading}
            title={t('shop-rental.shopRentals')}
            icon={<FileBarChart className="h-5 w-5" />}
            emptyTitle={t('shop-rental.noRentalsInPeriod')}
            maxHeight="60vh"
            stickyHeader
          />
        </div>
      )}

      {showPrint && isCustomReady && rentals.length > 0 && (
        <ShopRentalBulkPrint
          rentalIds={rentals.map((r) => r.id)}
          year={reportYear}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
};

export const ShopRentalReportPage = () => (
  <CalendarProvider>
    <ShopRentalReportContent />
  </CalendarProvider>
);

export default ShopRentalReportPage;
