import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { getMonthNames } from '@/utils/calendar';
import axios from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import { formatNumber } from '@/lib/formatNumber';

interface ShopRentalBulkPrintProps {
  rentalIds: (number | string)[];
  year?: string;
  onClose: () => void;
}

interface MonthStatus {
  paid: number;
  remaining: number;
  is_paid: boolean;
}

interface RentalReportRow {
  rental_id: number;
  shop_number: string;
  shop_name: string;
  shop_location: string;
  tenant_name: string;
  tenant_phone: string;
  tenant_email: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  currency: string;
  rental_status: string;
  payment_summary: {
    total_paid_year: number;
    total_remaining_year: number;
    months_paid_count: number;
    months_status: Record<string, MonthStatus>;
    year: number;
  };
}

interface BulkRentalResponse {
  rentals: RentalReportRow[];
  year: number;
  count: number;
}

const PRINT_COLUMN_THRESHOLD = 14;
const MONTH_KEYS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

export const ShopRentalBulkPrint = ({ rentalIds, year, onClose }: ShopRentalBulkPrintProps) => {
  const { t, language } = useLanguage();
  const { calendarType } = useCalendar();
  const { formatDate } = useFormattedDate();
  const isRTL = language === 'fa' || language === 'ps';
  const tableDirection = isRTL ? 'rtl' : 'ltr';
  const lang = language as 'fa' | 'ps' | 'en';
  const monthNames = getMonthNames(calendarType, lang);

  const [reportData, setReportData] = useState<BulkRentalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchBulkInfo = async () => {
      try {
        const response = await axios.get<BulkRentalResponse>('/shop-rentals/bulk_rental_info/', {
          params: {
            rentals: rentalIds.join(','),
            ...(year && { year }),
          },
        });
        setReportData(response.data);
      } catch (error) {
        console.error('Error fetching bulk rental info:', error);
      } finally {
        setLoading(false);
      }
    };

    if (rentalIds.length > 0) {
      fetchBulkInfo();
    }
  }, [rentalIds, year]);

  const rentalsData = reportData?.rentals ?? [];
  const reportYear = reportData?.year;
  const useWideLayout = 9 + MONTH_KEYS.length > PRINT_COLUMN_THRESHOLD;
  const pageSize = useWideLayout ? 'A3 landscape' : 'A4 landscape';
  const tableFontSize = useWideLayout ? '8px' : '9px';

  const columnTotals = useMemo(() => {
    const monthTotals: Record<string, number> = {};
    MONTH_KEYS.forEach((m) => { monthTotals[m] = 0; });
    let totalPaid = 0;
    let totalRemaining = 0;

    rentalsData.forEach((rental) => {
      MONTH_KEYS.forEach((month) => {
        monthTotals[month] += rental.payment_summary.months_status?.[month]?.paid || 0;
      });
      totalPaid += rental.payment_summary.total_paid_year || 0;
      totalRemaining += rental.payment_summary.total_remaining_year || 0;
    });

    return { monthTotals, totalPaid, totalRemaining };
  }, [rentalsData]);

  const getStatusLabel = (status: string) =>
    t(`shop-rental.rentalStatusOptions.${status}`) || status;

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const response = await axios.get('/shop-rentals/bulk_rental_export/', {
        params: {
          rentals: rentalIds.join(','),
          ...(year && { year }),
        },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'shop-rental-report.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting rental report:', error);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!loading && rentalsData.length > 0) {
      const timer = setTimeout(() => window.print(), 500);
      const handleAfterPrint = () => onClose();
      window.addEventListener('afterprint', handleAfterPrint);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
    }
  }, [loading, onClose, rentalsData.length]);

  if (loading || !reportData) {
    return null;
  }

  const thStyle = {
    padding: '6px 4px',
    textAlign: isRTL ? ('right' as const) : ('left' as const),
    fontWeight: '600' as const,
    border: '1px solid #cbd5e1',
    borderBottom: '2px solid #94a3b8',
    backgroundColor: 'transparent',
    color: '#1f2937',
    fontSize: tableFontSize,
    whiteSpace: 'nowrap' as const,
  };

  const tdStyle = {
    padding: '4px',
    border: '1px solid #e2e8f0',
    fontSize: tableFontSize,
    verticalAlign: 'top' as const,
  };

  return (
    <>
      <div className="no-print fixed bottom-4 right-4 z-50 flex gap-2">
        {useWideLayout && (
          <Button variant="outline" onClick={handleExportExcel} disabled={exporting}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {exporting ? t('shop-rental.exportingExcel') : t('shop-rental.exportExcel')}
          </Button>
        )}
      </div>

      <style>
        {`
          @media print {
            @page { size: ${pageSize}; margin: 6mm; }
            body * { visibility: hidden; }
            #shop-rental-bulk-print, #shop-rental-bulk-print * { visibility: visible; }
            #shop-rental-bulk-print { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
          }
          @media screen { #shop-rental-bulk-print { display: none; } }
        `}
      </style>

      <div id="shop-rental-bulk-print" style={{ fontFamily: 'Arial, sans-serif', fontSize: tableFontSize, lineHeight: '1.35', color: '#333' }}>
        <div style={{ textAlign: 'center', borderBottom: '3px solid #1e40af', paddingBottom: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <img src="/logo.jpeg" alt="Logo" style={{ width: '70px', height: '70px', objectFit: 'contain', borderRadius: '8px' }} />
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#1e40af' }}>
            {t('shop-rental.rentalReport')}
          </h1>
          <p style={{ fontSize: '10px', color: '#666', margin: '0 0 2px 0' }}>
            {t('shop-rental.totalRentals')}: {rentalsData.length}
            {reportYear ? ` · ${t('shop-rental.year')}: ${reportYear}` : ''}
          </p>
          <p style={{ fontSize: '9px', color: '#888', margin: 0 }}>
            {t('shop-rental.printed')}: {formatDate(new Date().toISOString())}
          </p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', direction: tableDirection, marginBottom: '12px', tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>{t('shop-rental.printColumns.shopNo')}</th>
              <th style={thStyle}>{t('shop-rental.printColumns.shopName')}</th>
              <th style={thStyle}>{t('shop-rental.printColumns.tenant')}</th>
              <th style={thStyle}>{t('shop-rental.printColumns.phone')}</th>
              <th style={thStyle}>{t('shop-rental.printColumns.startDate')}</th>
              <th style={thStyle}>{t('shop-rental.printColumns.endDate')}</th>
              <th style={thStyle}>{t('shop-rental.printColumns.monthlyRent')}</th>
              <th style={thStyle}>{t('shop-rental.printColumns.status')}</th>
              {MONTH_KEYS.map((month, idx) => (
                <th key={month} style={{ ...thStyle, textAlign: 'center' }}>
                  {monthNames[idx]?.substring(0, 3) || month}
                </th>
              ))}
              <th style={{ ...thStyle, textAlign: isRTL ? 'left' : 'right' }}>{t('shop-rental.printColumns.paidYear')}</th>
              <th style={{ ...thStyle, textAlign: isRTL ? 'left' : 'right' }}>{t('shop-rental.printColumns.remainingYear')}</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>{t('shop-rental.printColumns.monthsPaid')}</th>
            </tr>
          </thead>
          <tbody>
            {rentalsData.map((rental, index) => {
              const months = rental.payment_summary.months_status || {};
              return (
                <tr key={rental.rental_id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={tdStyle}>{index + 1}</td>
                  <td style={tdStyle}>{rental.shop_number || '-'}</td>
                  <td style={{ ...tdStyle, fontWeight: '500' }}>{rental.shop_name || '-'}</td>
                  <td style={tdStyle}>{rental.tenant_name || '-'}</td>
                  <td style={tdStyle}>{rental.tenant_phone || '-'}</td>
                  <td style={tdStyle}>{formatDate(rental.start_date)}</td>
                  <td style={tdStyle}>{formatDate(rental.end_date)}</td>
                  <td style={{ ...tdStyle, textAlign: isRTL ? 'left' : 'right', fontWeight: '600' }}>
                    {formatNumber(rental.monthly_rent)} {rental.currency}
                  </td>
                  <td style={tdStyle}>{getStatusLabel(rental.rental_status)}</td>
                  {MONTH_KEYS.map((month) => {
                    const status = months[month];
                    const paid = status?.paid || 0;
                    return (
                      <td
                        key={month}
                        style={{
                          ...tdStyle,
                          textAlign: 'center',
                          color: status?.is_paid ? '#16a34a' : paid > 0 ? '#d97706' : '#666',
                          fontWeight: paid > 0 ? '600' : '400',
                        }}
                      >
                        {paid > 0 ? formatNumber(paid) : '-'}
                      </td>
                    );
                  })}
                  <td style={{ ...tdStyle, textAlign: isRTL ? 'left' : 'right', color: '#16a34a', fontWeight: '600' }}>
                    {formatNumber(rental.payment_summary.total_paid_year)} {rental.currency}
                  </td>
                  <td style={{
                    ...tdStyle,
                    textAlign: isRTL ? 'left' : 'right',
                    color: rental.payment_summary.total_remaining_year > 0 ? '#dc2626' : '#16a34a',
                    fontWeight: '600',
                  }}>
                    {formatNumber(rental.payment_summary.total_remaining_year)} {rental.currency}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {rental.payment_summary.months_paid_count}/12
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 'bold' }}>
              <td colSpan={9} style={{ ...tdStyle, border: '1px solid #cbd5e1' }}>
                {t('shop-rental.total')}:
              </td>
              {MONTH_KEYS.map((month) => (
                <td key={month} style={{ ...tdStyle, textAlign: 'center', border: '1px solid #cbd5e1', color: '#16a34a' }}>
                  {formatNumber(columnTotals.monthTotals[month])}
                </td>
              ))}
              <td style={{ ...tdStyle, textAlign: isRTL ? 'left' : 'right', border: '1px solid #cbd5e1', color: '#16a34a' }}>
                {formatNumber(columnTotals.totalPaid)}
              </td>
              <td style={{ ...tdStyle, textAlign: isRTL ? 'left' : 'right', border: '1px solid #cbd5e1', color: '#dc2626' }}>
                {formatNumber(columnTotals.totalRemaining)}
              </td>
              <td style={{ ...tdStyle, border: '1px solid #cbd5e1' }} />
            </tr>
          </tfoot>
        </table>

        <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#666' }}>
          <div>
            <p style={{ margin: 0 }}>{t('shop-rental.signature')}: _________________</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0 }}>{t('shop-rental.generatedBy')}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShopRentalBulkPrint;
