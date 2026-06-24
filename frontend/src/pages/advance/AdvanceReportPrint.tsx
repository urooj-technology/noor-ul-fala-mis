import { useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { SHAMSI_MONTHS_DARI, SHAMSI_MONTHS_PASHTO, formatDateByCalendarType } from '@/utils/calendar';
import { formatNumber } from '@/lib/formatNumber';

interface AdvanceReportPrintProps {
  advances: any[];
  onClose: () => void;
}

export const AdvanceReportPrint = ({ advances, onClose }: AdvanceReportPrintProps) => {
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

  const totalAmount = useMemo(
    () => advances.reduce((sum, a) => sum + Number(a.amount || 0), 0),
    [advances],
  );

  const getMonthLabel = (month: number) => monthNames[(month || 1) - 1] || String(month);

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
            #advance-report-print, #advance-report-print * { visibility: visible; }
            #advance-report-print { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
          }
          @media screen { #advance-report-print { display: none; } }
        `}
      </style>

      <div id="advance-report-print" style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', lineHeight: '1.35', color: '#333' }}>
        <div style={{ textAlign: 'center', borderBottom: '3px solid #1e40af', paddingBottom: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <img src="/logo.jpeg" alt="Logo" style={{ width: '70px', height: '70px', objectFit: 'contain', borderRadius: '8px' }} />
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#1e40af' }}>
            {t('advance.reportTitle')}
          </h1>
          <p style={{ fontSize: '10px', color: '#666', margin: '0 0 2px 0' }}>
            {t('advance.totalRecords')}: {advances.length}
          </p>
          <p style={{ fontSize: '9px', color: '#888', margin: 0 }}>
            {t('advance.printed')}: {formatDate(new Date().toISOString())}
          </p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', direction: tableDirection, marginBottom: '12px' }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>{t('advance.printColumns.employee')}</th>
              <th style={thStyle}>{t('advance.printColumns.position')}</th>
              <th style={thStyle}>{t('advance.printColumns.period')}</th>
              <th style={{ ...thStyle, textAlign: isRTL ? 'left' : 'right' }}>{t('advance.printColumns.amount')}</th>
              <th style={thStyle}>{t('advance.printColumns.paymentDate')}</th>
              <th style={thStyle}>{t('advance.printColumns.reason')}</th>
            </tr>
          </thead>
          <tbody>
            {advances.map((advance, index) => (
              <tr key={advance.id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={tdStyle}>{index + 1}</td>
                <td style={{ ...tdStyle, fontWeight: '500' }}>{advance.employee_details?.full_name || '-'}</td>
                <td style={tdStyle}>{advance.employee_details?.position || '-'}</td>
                <td style={tdStyle}>{getMonthLabel(advance.month)} {advance.year}</td>
                <td style={{ ...tdStyle, textAlign: isRTL ? 'left' : 'right', fontWeight: '600', color: '#ea580c' }}>
                  {formatNumber(advance.amount)} {advance.currency_details?.code || advance.currency || ''}
                </td>
                <td style={tdStyle}>
                  {advance.payment_date
                    ? formatDateByCalendarType(advance.payment_date, calendarType, lang)
                    : '-'}
                </td>
                <td style={tdStyle}>{advance.reason || '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 'bold' }}>
              <td colSpan={4} style={{ ...tdStyle, border: '1px solid #cbd5e1' }}>{t('advance.total')}:</td>
              <td style={{ ...tdStyle, textAlign: isRTL ? 'left' : 'right', border: '1px solid #cbd5e1', color: '#ea580c' }}>
                {formatNumber(totalAmount)}
              </td>
              <td colSpan={2} style={{ ...tdStyle, border: '1px solid #cbd5e1' }} />
            </tr>
          </tfoot>
        </table>

        <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#666' }}>
          <div><p style={{ margin: 0 }}>{t('advance.signature')}: _________________</p></div>
          <div style={{ textAlign: 'right' }}><p style={{ margin: 0 }}>{t('advance.generatedBy')}</p></div>
        </div>
      </div>
    </>
  );
};

export default AdvanceReportPrint;
