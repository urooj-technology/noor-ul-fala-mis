import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import axios from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';

interface StudentBulkPrintProps {
  studentIds: (number | string)[];
  onClose: () => void;
}

interface FeeTypeColumn {
  id: number;
  name: string;
}

interface FeeBreakdownItem {
  fee_type_id: number;
  fee_type: string;
  paid_amount: string;
}

interface StudentFinancialRow {
  student_id: number;
  student_name: string;
  registration_number?: string;
  class_level?: string;
  current_address?: string;
  transportation?: string;
  transportation_display?: string;
  phone?: string;
  total_fee: string;
  remaining_amount: string;
  currency: string;
  fee_breakdown: FeeBreakdownItem[];
}

interface BulkFinancialResponse {
  students: StudentFinancialRow[];
  fee_types: FeeTypeColumn[];
  count: number;
}

const PRINT_COLUMN_THRESHOLD = 10;

const formatCurrency = (amount: string | number | undefined, currency: string = 'AFN'): string => {
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

export const StudentBulkPrint = ({ studentIds, onClose }: StudentBulkPrintProps) => {
  const { t, language } = useLanguage();
  const isRTL = language === 'fa' || language === 'ps';
  const tableDirection = isRTL ? 'rtl' : 'ltr';
  const [reportData, setReportData] = useState<BulkFinancialResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchBulkFinancialInfo = async () => {
      try {
        const response = await axios.get<BulkFinancialResponse>('/student-payments/bulk_financial_info/', {
          params: { students: studentIds.join(',') },
        });
        setReportData(response.data);
      } catch (error) {
        console.error('Error fetching bulk financial info:', error);
      } finally {
        setLoading(false);
      }
    };

    if (studentIds.length > 0) {
      fetchBulkFinancialInfo();
    }
  }, [studentIds]);

  const feeTypes = reportData?.fee_types ?? [];
  const studentsData = reportData?.students ?? [];
  const currency = studentsData[0]?.currency || 'AFN';
  const useWideLayout = 7 + feeTypes.length > PRINT_COLUMN_THRESHOLD;
  const pageSize = useWideLayout ? 'A3 landscape' : 'A4 landscape';
  const tableFontSize = useWideLayout ? '9px' : '10px';

  const columnTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    let totalRemaining = 0;
    let totalFee = 0;

    feeTypes.forEach((ft) => {
      totals[ft.id] = 0;
    });

    studentsData.forEach((student) => {
      student.fee_breakdown.forEach((item) => {
        totals[item.fee_type_id] = (totals[item.fee_type_id] || 0) + (parseFloat(item.paid_amount) || 0);
      });
      totalRemaining += parseFloat(student.remaining_amount) || 0;
      totalFee += parseFloat(student.total_fee) || 0;
    });

    return { feeTypeTotals: totals, totalRemaining, totalFee };
  }, [studentsData, feeTypes]);

  const getTransportLabel = (student: StudentFinancialRow) => {
    if (student.transportation) {
      const key = `students.transportationOptions.${student.transportation}`;
      const translated = t(key);
      if (translated !== key) return translated;
    }
    return student.transportation_display || '-';
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const response = await axios.get('/student-payments/bulk_financial_export/', {
        params: { students: studentIds.join(',') },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student-financial-report.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting financial report:', error);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!loading && studentsData.length > 0) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);

      const handleAfterPrint = () => {
        onClose();
      };

      window.addEventListener('afterprint', handleAfterPrint);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
    }
  }, [loading, onClose, studentsData.length]);

  if (loading || !reportData) {
    return null;
  }

  const thStyle = {
    padding: '8px 6px',
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
    padding: '6px',
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
            {exporting ? t('students.exportingExcel', 'Exporting...') : t('students.exportExcel', 'Export Excel')}
          </Button>
        )}
      </div>

      <style>
        {`
          @media print {
            @page { size: ${pageSize}; margin: 6mm; }
            body * { visibility: hidden; }
            #student-bulk-print, #student-bulk-print * { visibility: visible; }
            #student-bulk-print { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
          }
          @media screen { #student-bulk-print { display: none; } }
        `}
      </style>

      <div id="student-bulk-print" style={{ fontFamily: 'Arial, sans-serif', fontSize: tableFontSize, lineHeight: '1.35', color: '#333' }}>
        <div style={{ textAlign: 'center', borderBottom: '3px solid #1e40af', paddingBottom: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <img src="/logo.jpeg" alt="School Logo" style={{ width: '70px', height: '70px', objectFit: 'contain', borderRadius: '8px' }} />
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#1e40af' }}>
            {t('students.studentFinancialReport', 'Student Financial Report')}
          </h1>
          <p style={{ fontSize: '10px', color: '#666', margin: '0 0 2px 0' }}>
            {t('students.totalStudents', 'Total Students')}: {studentsData.length}
          </p>
          <p style={{ fontSize: '9px', color: '#888', margin: 0 }}>
            {t('students.printed', 'Printed')}: {formatDate(new Date().toISOString())}
          </p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', direction: tableDirection, marginBottom: '12px', tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>{t('students.printColumns.regNo')}</th>
              <th style={thStyle}>{t('students.printColumns.name')}</th>
              <th style={thStyle}>{t('students.printColumns.class')}</th>
              <th style={thStyle}>{t('students.printColumns.address')}</th>
              <th style={thStyle}>{t('students.printColumns.transport')}</th>
              <th style={thStyle}>{t('students.printColumns.phone')}</th>
              {feeTypes.map((feeType) => (
                <th key={feeType.id} style={{ ...thStyle, textAlign: isRTL ? 'left' : 'right' }}>{feeType.name}</th>
              ))}
              <th style={{ ...thStyle, textAlign: isRTL ? 'left' : 'right' }}>{t('students.printColumns.remaining')}</th>
              <th style={{ ...thStyle, textAlign: isRTL ? 'left' : 'right' }}>{t('students.printColumns.total')}</th>
            </tr>
          </thead>
          <tbody>
            {studentsData.map((student, index) => {
              const paidByType = Object.fromEntries(
                student.fee_breakdown.map((item) => [item.fee_type_id, item.paid_amount])
              );

              return (
                <tr key={student.student_id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ ...tdStyle, textAlign: isRTL ? 'right' : 'left' }}>{index + 1}</td>
                  <td style={{ ...tdStyle, textAlign: isRTL ? 'right' : 'left' }}>{student.registration_number || '-'}</td>
                  <td style={{ ...tdStyle, textAlign: isRTL ? 'right' : 'left', fontWeight: '500' }}>{student.student_name}</td>
                  <td style={{ ...tdStyle, textAlign: isRTL ? 'right' : 'left' }}>{student.class_level || '-'}</td>
                  <td style={{ ...tdStyle, textAlign: isRTL ? 'right' : 'left', maxWidth: '140px' }}>{student.current_address || '-'}</td>
                  <td style={{ ...tdStyle, textAlign: isRTL ? 'right' : 'left' }}>{getTransportLabel(student)}</td>
                  <td style={{ ...tdStyle, textAlign: isRTL ? 'right' : 'left' }}>{student.phone || '-'}</td>
                  {feeTypes.map((feeType) => (
                    <td key={feeType.id} style={{ ...tdStyle, textAlign: isRTL ? 'left' : 'right', color: '#16a34a', fontWeight: '600' }}>
                      {formatCurrency(paidByType[feeType.id] || 0, student.currency || currency)}
                    </td>
                  ))}
                  <td style={{
                    ...tdStyle,
                    textAlign: isRTL ? 'left' : 'right',
                    color: parseFloat(student.remaining_amount) > 0 ? '#dc2626' : '#16a34a',
                    fontWeight: '600',
                  }}>
                    {formatCurrency(student.remaining_amount, student.currency || currency)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: isRTL ? 'left' : 'right', fontWeight: '600' }}>
                    {formatCurrency(student.total_fee, student.currency || currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 'bold' }}>
              <td colSpan={7} style={{ ...tdStyle, border: '1px solid #cbd5e1', fontSize: '11px' }}>
                {t('students.printColumns.total')}:
              </td>
              {feeTypes.map((feeType) => (
                <td key={feeType.id} style={{ ...tdStyle, textAlign: isRTL ? 'left' : 'right', border: '1px solid #cbd5e1', color: '#16a34a' }}>
                  {formatCurrency(columnTotals.feeTypeTotals[feeType.id] || 0, currency)}
                </td>
              ))}
              <td style={{ ...tdStyle, textAlign: isRTL ? 'left' : 'right', border: '1px solid #cbd5e1', color: columnTotals.totalRemaining > 0 ? '#dc2626' : '#16a34a' }}>
                {formatCurrency(columnTotals.totalRemaining, currency)}
              </td>
              <td style={{ ...tdStyle, textAlign: isRTL ? 'left' : 'right', border: '1px solid #cbd5e1', color: '#1f2937' }}>
                {formatCurrency(columnTotals.totalFee, currency)}
              </td>
            </tr>
          </tfoot>
        </table>

        {useWideLayout && (
          <p style={{ fontSize: '9px', color: '#666', marginBottom: '8px' }}>
            {t('students.exportExcelHint', 'This report has many columns. Use Export Excel for a clearer view.')}
          </p>
        )}

        <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#666' }}>
          <div>
            <p style={{ margin: 0 }}>{t('students.signature', 'Signature')}: _________________</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0 }}>{t('students.generatedBy', 'Document generated by Student Management System')}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentBulkPrint;
