import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { getMonthNames } from '@/utils/calendar';
import axios from '@/lib/axios';
import { formatNumber } from '@/lib/formatNumber';

interface MonthlyStatus {
  [key: string]: {
    month: string;
    rent: number;
    paid: number;
    remaining: number;
    is_paid: boolean;
    payment_percentage: number;
    payment_count: number;
  };
}

interface RentalPrintData {
  id: number;
  shop: { id: number; shop_number: string; name: string; location: string };
  tenant: { id: number; full_name: string; phone: string; email: string };
  start_date: string;
  end_date: string;
  monthly_rent: number;
  currency: string;
  rental_status: string;
  security_deposit: number;
  payment_summary: {
    total_paid_year: number;
    total_remaining_year: number;
    total_expected_year: number;
    months_paid_count: number;
    months_pending_count: number;
    months_status: MonthlyStatus;
    year: number;
  };
}

interface ShopRentalPrintProps {
  rentalId: number | string;
  year?: string;
  onClose?: () => void;
}

const formatCurrency = (amount: number | string, currency: string = 'AFN'): string => {
  const val = typeof amount === 'string' ? parseFloat(amount) || 0 : (amount ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
};

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateString;
  }
};

export const ShopRentalPrint = ({ rentalId, year, onClose }: ShopRentalPrintProps) => {
  const { t, language } = useLanguage();
  const { calendarType } = useCalendar();
  const isRTL = language === 'fa' || language === 'ps';
  const tableDirection = isRTL ? 'rtl' : 'ltr';
  const lang = language as 'fa' | 'ps' | 'en';
  
  const [rental, setRental] = useState<RentalPrintData | null>(null);
  const [loading, setLoading] = useState(true);

  // Get current Shamsi year
  const getCurrentShamsiYear = () => {
    const gregorianDate = new Date();
    const gregorianYear = gregorianDate.getFullYear();
    const gregorianMonth = gregorianDate.getMonth() + 1;
    const gregorianDay = gregorianDate.getDate();
    return gregorianMonth < 3 || (gregorianMonth === 3 && gregorianDay < 21)
      ? gregorianYear - 622
      : gregorianYear - 621;
  };

  const printYear = year || getCurrentShamsiYear().toString();
  const monthNames = getMonthNames(calendarType, lang);

  useEffect(() => {
    const fetchRentalData = async () => {
      try {
        const response = await axios.get(`/shop-rentals/${rentalId}/?year=${printYear}`);
        setRental(response.data);
      } catch (error) {
        console.error('Error fetching rental data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRentalData();
  }, [rentalId, printYear]);

  useEffect(() => {
    if (!loading) {
      const handleAfterPrint = () => {
        if (onClose) onClose();
      };

      window.addEventListener('afterprint', handleAfterPrint);
      
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
    }
  }, [loading, onClose]);

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      active: t('shop-rental.rentalStatusOptions.active'),
      expired: t('shop-rental.rentalStatusOptions.expired'),
      cancelled: t('shop-rental.rentalStatusOptions.cancelled'),
      renewed: t('shop-rental.rentalStatusOptions.renewed'),
    };
    return labels[status] || status;
  };

  if (loading || !rental) {
    return null;
  }

  const monthsStatus = rental.payment_summary?.months_status || {};
  const summary = rental.payment_summary;

  return (
    <>
      <style>
        {`
          @media print {
            @page { size: A4; margin: 8mm; }
            body * { visibility: hidden; }
            #shop-rental-print, #shop-rental-print * { visibility: visible; }
            #shop-rental-print { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
          }
          @media screen { #shop-rental-print { display: none; } }
        `}
      </style>

      <div className="fixed inset-0 bg-black/50 z-50 hidden print:hidden no-print">
        <div className="flex items-center justify-center h-full">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <p className="text-lg mb-4">Preparing document...</p>
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Close</button>
          </div>
        </div>
      </div>

      <div id="shop-rental-print" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', lineHeight: '1.3', color: '#333' }}>
        {/* Header with Centered Logo */}
        <div style={{ textAlign: 'center', borderBottom: '3px solid #1e40af', paddingBottom: '15px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
            <img 
              src="/logo.jpeg" 
              alt="Logo" 
              style={{ width: '90px', height: '90px', objectFit: 'contain', borderRadius: '10px' }}
            />
          </div>
          
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#1e40af' }}>{t('shop-rental.rentalDetails', 'Shop Rental Details')}</h1>
          <p style={{ fontSize: '12px', color: '#666', margin: '0 0 3px 0' }}>{t('shop-rental.shop')}: {rental.shop?.shop_number} - {rental.shop?.name}</p>
          <p style={{ fontSize: '12px', color: '#666', margin: '0 0 3px 0' }}>{t('shop-rental.tenant')}: {rental.tenant?.full_name}</p>
          <p style={{ fontSize: '10px', color: '#888', margin: 0 }}>{t('common.printed', 'Printed')}: {formatDate(new Date().toISOString())}</p>
        </div>

        {/* Two Column Layout for Basic Info */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
          {/* Left Column - Shop Info */}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '4px', marginBottom: '6px' }}>{t('shop-rental.shopInfo', 'Shop Information')}</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ padding: '2px 0', color: '#666', width: '40%' }}>{t('shop-rental.shopNumber')}:</td><td style={{ padding: '2px 0', fontWeight: '600' }}>{rental.shop?.shop_number || '-'}</td></tr>
                <tr><td style={{ padding: '2px 0', color: '#666' }}>{t('shop-rental.name')}:</td><td style={{ padding: '2px 0', fontWeight: '600' }}>{rental.shop?.name || '-'}</td></tr>
                <tr><td style={{ padding: '2px 0', color: '#666' }}>{t('shop-rental.location')}:</td><td style={{ padding: '2px 0' }}>{rental.shop?.location || '-'}</td></tr>
                <tr><td style={{ padding: '2px 0', color: '#666' }}>{t('shop-rental.monthlyRent')}:</td><td style={{ padding: '2px 0', fontWeight: '600', color: '#1e40af' }}>{formatNumber(rental.monthly_rent)} {rental.currency}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Right Column - Tenant Info */}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '4px', marginBottom: '6px' }}>{t('shop-rental.tenantInfo', 'Tenant Information')}</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ padding: '2px 0', color: '#666', width: '40%' }}>{t('shop-rental.fullName', 'Full Name')}:</td><td style={{ padding: '2px 0', fontWeight: '600' }}>{rental.tenant?.full_name || '-'}</td></tr>
                <tr><td style={{ padding: '2px 0', color: '#666' }}>{t('shop-rental.phone')}:</td><td style={{ padding: '2px 0' }}>{rental.tenant?.phone || '-'}</td></tr>
                <tr><td style={{ padding: '2px 0', color: '#666' }}>{t('shop-rental.email')}:</td><td style={{ padding: '2px 0' }}>{rental.tenant?.email || '-'}</td></tr>
                <tr><td style={{ padding: '2px 0', color: '#666' }}>{t('shop-rental.rentalStatus')}:</td><td style={{ padding: '2px 0' }}>{getStatusLabel(rental.rental_status)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Rental Period */}
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '4px', marginBottom: '6px' }}>{t('shop-rental.rentalPeriod', 'Rental Period')}</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 8px', color: '#666', width: '25%' }}>{t('shop-rental.startDate')}:</td>
                <td style={{ padding: '4px 8px', fontWeight: '600' }}>{formatDate(rental.start_date)}</td>
                <td style={{ padding: '4px 8px', color: '#666', width: '25%' }}>{t('shop-rental.endDate')}:</td>
                <td style={{ padding: '4px 8px', fontWeight: '600' }}>{formatDate(rental.end_date)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Yearly Summary */}
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '4px', marginBottom: '8px' }}>
            {t('shop-rental.yearlySummary', 'Yearly Financial Summary')} - {printYear}
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              <tr style={{ backgroundColor: '#f0f4ff' }}>
                <td style={{ padding: '8px 6px', fontWeight: 'bold', border: '1px solid #1e40af', textAlign: 'center' }}>
                  {t('shop-rental.monthlyRent')}<br/>
                  <span style={{ fontSize: '14px', color: '#1e40af' }}>{formatNumber(rental.monthly_rent)} {rental.currency}</span>
                </td>
                <td style={{ padding: '8px 6px', fontWeight: 'bold', border: '1px solid #1e40af', textAlign: 'center' }}>
                  {t('shop-rental.totalPaidYear', 'Paid')}<br/>
                  <span style={{ fontSize: '14px', color: '#16a34a' }}>{formatNumber(summary?.total_paid_year || 0)} {rental.currency}</span>
                </td>
                <td style={{ padding: '8px 6px', fontWeight: 'bold', border: '1px solid #1e40af', textAlign: 'center' }}>
                  {t('shop-rental.totalRemainingYear', 'Remaining')}<br/>
                  <span style={{ fontSize: '14px', color: (summary?.total_remaining_year || 0) > 0 ? '#dc2626' : '#16a34a' }}>{formatNumber(summary?.total_remaining_year || 0)} {rental.currency}</span>
                </td>
                <td style={{ padding: '8px 6px', fontWeight: 'bold', border: '1px solid #1e40af', textAlign: 'center' }}>
                  {t('shop-rental.monthsPaid', 'Paid Months')}<br/>
                  <span style={{ fontSize: '14px', color: '#7c3aed' }}>{summary?.months_paid_count || 0}/12</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Monthly Payment Status Table */}
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '4px', marginBottom: '8px' }}>{t('shop-rental.monthlyBreakdown', 'Monthly Payment Status')}</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', direction: tableDirection }}>
            <thead>
              <tr style={{ backgroundColor: '#1e40af', color: 'white' }}>
                <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '600', width: '8%' }}>#</th>
                <th style={{ padding: '6px 8px', textAlign: isRTL ? 'right' : 'left', fontWeight: '600' }}>{t('shop-rental.month')}</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '600' }}>{t('shop-rental.rent')}</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '600' }}>{t('shop-rental.paid')}</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '600' }}>{t('shop-rental.remaining')}</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '600' }}>{t('shop-rental.progress')}</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '600' }}>{t('shop-rental.status')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(monthsStatus).map(([monthNum, status], index) => {
                const monthIdx = parseInt(monthNum) - 1;
                const monthLabel = monthNames[monthIdx] || monthNum;
                
                return (
                  <tr key={monthNum} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '5px 8px', textAlign: 'center', color: '#666' }}>{index + 1}</td>
                    <td style={{ padding: '5px 8px', textAlign: isRTL ? 'right' : 'left', fontWeight: '500' }}>{monthLabel}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>{formatNumber(status.rent)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', color: status.paid > 0 ? '#16a34a' : '#666', fontWeight: '600' }}>
                      {formatNumber(status.paid)}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', color: status.remaining > 0 ? '#dc2626' : '#16a34a', fontWeight: '600' }}>
                      {formatNumber(status.remaining)}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ flex: 1, backgroundColor: '#e5e7eb', borderRadius: '4px', height: '8px' }}>
                          <div
                            style={{
                              width: `${Math.min(status.payment_percentage, 100)}%`,
                              height: '100%',
                              backgroundColor: status.is_paid ? '#16a34a' : '#3b82f6',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '9px', color: '#666', minWidth: '30px' }}>{status.payment_percentage.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '9px',
                        fontWeight: '600',
                        backgroundColor: status.is_paid ? '#dcfce7' : (status.paid > 0 ? '#fef3c7' : '#fee2e2'),
                        color: status.is_paid ? '#16a34a' : (status.paid > 0 ? '#d97706' : '#dc2626'),
                      }}>
                        {status.is_paid ? t('shop-rental.paid', 'Paid') : (status.paid > 0 ? t('shop-rental.partial', 'Partial') : t('shop-rental.unpaid', 'Unpaid'))}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#1e40af', color: 'white', fontWeight: 'bold' }}>
                <td colSpan={2} style={{ padding: '8px', textAlign: isRTL ? 'right' : 'left' }}>{t('shop-rental.total')}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{formatNumber(rental.monthly_rent * 12)}</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#86efac' }}>{formatNumber(summary?.total_paid_year || 0)}</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#fca5a5' }}>{formatNumber(summary?.total_remaining_year || 0)}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>-</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{summary?.months_paid_count || 0}/12</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Security Deposit */}
        {rental.security_deposit > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '4px', marginBottom: '6px' }}>{t('shop-rental.securityDeposit')}</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 8px', color: '#666', width: '30%' }}>{t('shop-rental.amount')}:</td>
                  <td style={{ padding: '6px 8px', fontWeight: 'bold', fontSize: '14px', color: '#7c3aed' }}>{formatNumber(rental.security_deposit)} {rental.currency}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '25px', paddingTop: '15px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#666' }}>
          <div>
            <p style={{ margin: 0 }}>{t('common.signature', 'Signature')}: _________________</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0 }}>{t('common.generatedBy', 'Document generated by Shop Rental Management System')}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShopRentalPrint;
