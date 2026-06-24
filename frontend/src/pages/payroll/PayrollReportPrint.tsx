import { useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { SHAMSI_MONTHS_DARI, SHAMSI_MONTHS_PASHTO, formatDateByCalendarType } from '@/utils/calendar';
import { formatNumber } from '@/lib/formatNumber';

interface PayrollReportPrintProps {
  payrolls: any[];
  onClose: () => void;
}

export const PayrollReportPrint = ({ payrolls, onClose }: PayrollReportPrintProps) => {
  const { t, language } = useLanguage();
  const { calendarType } = useCalendar();
  const { formatDate } = useFormattedDate();
  const isRTL = language === 'fa' || language === 'ps';
  const tableDirection = isRTL ? 'rtl' : 'ltr';
  const lang = language as 'fa' | 'ps' | 'en';
  const monthNames = lang === 'ps' ? SHAMSI_MONTHS_PASHTO : SHAMSI_MONTHS_DARI;

  useEffect(() => {
    const timer = setTimeout(() => window.print(), 500);
    const handleAfterPrint = () => onClose();
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [onClose]);

  const totalSalary = useMemo(
    () => payrolls.reduce((sum, p) => sum + Number(p.salary || 0), 0),
    [payrolls],
  );

  const getMonthLabel = (month: number) => monthNames[(month || 1) - 1] || String(month);

  const formatPaymentDate = (record: any) => {
    if (calendarType === 'shamsi' && record.payment_date_shamsi?.formatted) {
      return record.payment_date_shamsi.formatted;
    }
    if (calendarType === 'qamari' && record.payment_date_qamari?.formatted) {
      return record.payment_date_qamari.formatted;
    }
    if (record.payment_date) {
      return formatDateByCalendarType(record.payment_date, calendarType, lang);
    }
    return '-';
  };

  const thStyle = {
    padding: '6px 4px',
    textAlign: isRTL ? ('right' as const) : ('left' as const),
    fontWeight: '600' as const,
    border: '1px solid #cbd5e1',
    borderBottom: '2px solid #94a3b8',
    backgroundColor: 'transparent',
    color: '#1f2937',
    fontSize: '9px',
    whiteSpace: 'nowrap' as const,
  };

  const tdStyle = {
    padding: '4px',
    border: '1px solid #e2e8f0',
    fontSize: '9px',
    verticalAlign: 'top' as const,
  };

  return (
    <>
      <style>
        {`
          @media print {
            @page { size: A4 landscape; margin: 6mm; }
            body * { visibility: hidden; }
            #payroll-report-print, #payroll-report-print * { visibility: visible; }
            #payroll-report-print { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
          }
          @media screen { #payroll-report-print { display: none; } }
        `}
      </style>

      <div id="payroll-report-print" style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', lineHeight: '1.35', color: '#333' }}>
        <div style={{ textAlign: 'center', borderBottom: '3px solid #1e40af', paddingBottom: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <img src="/logo.jpeg" alt="Logo" style={{ width: '70px', height: '70px', objectFit: 'contain', borderRadius: '8px' }} />
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#1e40af' }}>
            {t('payroll.reportTitle')}
          </h1>
          <p style={{ fontSize: '10px', color: '#666', margin: '0 0 2px 0' }}>
            {t('payroll.totalRecords')}: {payrolls.length}
          </p>
          <p style={{ fontSize: '9px', color: '#888', margin: 0 }}>
            {t('payroll.printed')}: {formatDate(new Date().toISOString())}
          </p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', direction: tableDirection, marginBottom: '12px' }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>{t('payroll.printColumns.employee')}</th>
              <th style={thStyle}>{t('payroll.printColumns.position')}</th>
              <th style={thStyle}>{t('payroll.printColumns.period')}</th>
              <th style={{ ...thStyle, textAlign: isRTL ? 'left' : 'right' }}>{t('payroll.printColumns.salary')}</th>
              <th style={thStyle}>{t('payroll.printColumns.paymentDate')}</th>
            </tr>
          </thead>
          <tbody>
            {payrolls.map((payroll, index) => (
              <tr key={payroll.id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={tdStyle}>{index + 1}</td>
                <td style={{ ...tdStyle, fontWeight: '500' }}>{payroll.employee_details?.full_name || '-'}</td>
                <td style={tdStyle}>{payroll.employee_details?.position || '-'}</td>
                <td style={tdStyle}>{getMonthLabel(payroll.month)} {payroll.year}</td>
                <td style={{ ...tdStyle, textAlign: isRTL ? 'left' : 'right', fontWeight: '600', color: '#16a34a' }}>
                  {formatNumber(payroll.salary)} {payroll.currency_details?.code || payroll.currency || ''}
                </td>
                <td style={tdStyle}>{formatPaymentDate(payroll)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 'bold' }}>
              <td colSpan={4} style={{ ...tdStyle, border: '1px solid #cbd5e1' }}>{t('payroll.total')}:</td>
              <td style={{ ...tdStyle, textAlign: isRTL ? 'left' : 'right', border: '1px solid #cbd5e1', color: '#16a34a' }}>
                {formatNumber(totalSalary)}
              </td>
              <td style={{ ...tdStyle, border: '1px solid #cbd5e1' }} />
            </tr>
          </tfoot>
        </table>

        <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#666' }}>
          <div><p style={{ margin: 0 }}>{t('payroll.signature')}: _________________</p></div>
          <div style={{ textAlign: 'right' }}><p style={{ margin: 0 }}>{t('payroll.generatedBy')}</p></div>
        </div>
      </div>
    </>
  );
};

export default PayrollReportPrint;
