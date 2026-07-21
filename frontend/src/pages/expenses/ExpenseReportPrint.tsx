import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { SHAMSI_MONTHS_DARI, SHAMSI_MONTHS_PASHTO, formatDateByCalendarType } from '@/utils/calendar';
import { formatNumber } from '@/lib/formatNumber';
import type { PaymentReportRow, PaymentReportSummary } from './paymentReportTypes';
import { getEmployeePositionLabel } from '@/lib/employee-positions';

interface ExpenseReportPrintProps {
  payments: PaymentReportRow[];
  summary: PaymentReportSummary;
  onClose: () => void;
}

export const ExpenseReportPrint = ({ payments, summary, onClose }: ExpenseReportPrintProps) => {
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

  const typeLabel = (type: PaymentReportRow['payment_type']) => {
    if (type === 'payroll') return t('expenses.paymentTypes.payroll');
    if (type === 'advance') return t('expenses.paymentTypes.advance');
    return t('expenses.paymentTypes.expense');
  };

  const formatPaymentDate = (row: PaymentReportRow) => {
    const date = calendarType === 'shamsi' ? row.payment_date_shamsi : row.payment_date_qamari;
    if (date && row.payment_date) return formatDateByCalendarType(row.payment_date, calendarType, lang);
    return '-';
  };

  const getMonthLabel = (month: number) => monthNames[(month || 1) - 1] || String(month);

  const formatPeriod = (row: PaymentReportRow) => {
    if (row.payment_type === 'expense') return '-';
    return `${getMonthLabel(row.period_month || 1)} ${row.period_year || ''}`;
  };

  const payeeLabel = (row: PaymentReportRow) => {
    if (row.payment_type === 'expense') return row.category_name || 'N/A';
    const position = getEmployeePositionLabel(t, row.employee_position);
    if (position) return `${row.employee_name || '-'} (${position})`;
    return row.employee_name || '-';
  };

  const userLabel = (row: PaymentReportRow) => {
    if (row.payment_type === 'expense') return row.user_name || '-';
    return '-';
  };

  const thStyle = {
    padding: '5px 4px',
    textAlign: isRTL ? ('right' as const) : ('left' as const),
    fontWeight: '600' as const,
    border: '1px solid #94a3b8',
    backgroundColor: '#f1f5f9',
    color: '#1f2937',
    fontSize: '8px',
    whiteSpace: 'nowrap' as const,
  };

  const tdStyle = {
    padding: '4px',
    border: '1px solid #e2e8f0',
    fontSize: '8px',
    verticalAlign: 'middle' as const,
  };

  const totalRowStyle = {
    ...tdStyle,
    fontWeight: 'bold' as const,
    backgroundColor: '#f8fafc',
    borderTop: '2px solid #94a3b8',
  };

  const amountColor = (type: PaymentReportRow['payment_type'] | 'grand') => {
    if (type === 'payroll') return '#16a34a';
    if (type === 'advance') return '#ea580c';
    if (type === 'expense') return '#2563eb';
    return '#1e40af';
  };

  const totalRows = [
    { key: 'payroll', label: `${t('expenses.paymentTypes.payroll')} ${t('expenses.total')}`, value: summary.payroll_total, color: amountColor('payroll') },
    { key: 'advance', label: `${t('expenses.paymentTypes.advance')} ${t('expenses.total')}`, value: summary.advance_total, color: amountColor('advance') },
    { key: 'expense', label: `${t('expenses.paymentTypes.expense')} ${t('expenses.total')}`, value: summary.expense_total, color: amountColor('expense') },
    { key: 'grand', label: t('expenses.grandTotal'), value: summary.grand_total, color: amountColor('grand') },
  ];

  const amountAlign = isRTL ? 'left' : 'right';

  return (
    <>
      <style>
        {`
          @media print {
            @page { size: A4 portrait; margin: 10mm; }
            body * { visibility: hidden; }
            #expense-report-print, #expense-report-print * { visibility: visible; }
            #expense-report-print { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
          }
          @media screen { #expense-report-print { display: none; } }
        `}
      </style>

      <div id="expense-report-print" style={{ fontFamily: 'Arial, sans-serif', fontSize: '8px', lineHeight: '1.3', color: '#333' }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid #1e40af', paddingBottom: '10px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <img src="/logo.jpeg" alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '6px' }} />
          </div>
          <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#1e40af' }}>
            {t('expenses.reportTitle')}
          </h1>
          <p style={{ fontSize: '9px', color: '#666', margin: '0 0 2px 0' }}>
            {t('expenses.totalRecords')}: {payments.length}
          </p>
          <p style={{ fontSize: '8px', color: '#888', margin: 0 }}>
            {t('expenses.printed')}: {formatDate(new Date().toISOString())}
          </p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', direction: tableDirection, tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '4%' }}>#</th>
              <th style={{ ...thStyle, width: '9%' }}>{t('expenses.printColumns.type')}</th>
              <th style={{ ...thStyle, width: '11%' }}>{t('expenses.printColumns.paymentDate')}</th>
              <th style={{ ...thStyle, width: '16%' }}>{t('expenses.printColumns.payee')}</th>
              <th style={{ ...thStyle, width: '12%' }}>{t('expenses.printColumns.user')}</th>
              <th style={{ ...thStyle, width: '10%' }}>{t('expenses.printColumns.period')}</th>
              <th style={{ ...thStyle, width: '12%', textAlign: amountAlign }}>{t('expenses.printColumns.amount')}</th>
              <th style={{ ...thStyle, width: '7%' }}>{t('expenses.printColumns.currency')}</th>
              <th style={{ ...thStyle, width: '19%' }}>{t('expenses.printColumns.description')}</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((row, index) => (
              <tr key={row.id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{index + 1}</td>
                <td style={tdStyle}>{typeLabel(row.payment_type)}</td>
                <td style={tdStyle}>{formatPaymentDate(row)}</td>
                <td style={{ ...tdStyle, fontWeight: '500' }}>{payeeLabel(row)}</td>
                <td style={tdStyle}>{userLabel(row)}</td>
                <td style={tdStyle}>{formatPeriod(row)}</td>
                <td style={{ ...tdStyle, textAlign: amountAlign, fontWeight: '600', color: amountColor(row.payment_type) }}>
                  {formatNumber(row.amount)}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{row.currency || '-'}</td>
                <td style={tdStyle}>{row.description || '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {totalRows.map((total) => (
              <tr key={total.key}>
                <td style={totalRowStyle} />
                <td style={totalRowStyle}>{total.label}</td>
                <td style={totalRowStyle} />
                <td style={totalRowStyle} />
                <td style={totalRowStyle} />
                <td style={totalRowStyle} />
                <td style={{ ...totalRowStyle, textAlign: amountAlign, color: total.color }}>
                  {formatNumber(total.value)}
                </td>
                <td style={totalRowStyle} />
                <td style={totalRowStyle} />
              </tr>
            ))}
          </tfoot>
        </table>

        <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#666' }}>
          <div><p style={{ margin: 0 }}>{t('expenses.signature')}: _________________</p></div>
          <div style={{ textAlign: isRTL ? 'left' : 'right' }}><p style={{ margin: 0 }}>{t('expenses.generatedBy')}</p></div>
        </div>
      </div>
    </>
  );
};

export default ExpenseReportPrint;
