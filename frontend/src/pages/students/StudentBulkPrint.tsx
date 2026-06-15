import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import axios from '@/lib/axios';

interface StudentBulkPrintProps {
  studentIds: (number | string)[];
  onClose: () => void;
}

interface StudentFinancialInfo {
  student_id: number;
  student_name: string;
  class_level_name: string;
  total_fee: string;
  total_paid: string;
  remaining_amount: string;
  currency: string;
}

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
  const [studentsData, setStudentsData] = useState<StudentFinancialInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<string>('AFN');

  useEffect(() => {
    const fetchAllFinancialInfo = async () => {
      try {
        const promises = studentIds.map(id =>
          axios.get(`/student-payments/financial_info/?student=${id}`)
        );
        const responses = await Promise.all(promises);
        
        const data: StudentFinancialInfo[] = responses.map(res => ({
          student_id: res.data.student_id,
          student_name: res.data.student_name,
          class_level_name: res.data.class_level || '-',
          total_fee: res.data.total_fee,
          total_paid: res.data.total_paid,
          remaining_amount: res.data.remaining_amount,
          currency: res.data.currency || 'AFN',
        }));
        
        setStudentsData(data);
        if (data.length > 0) {
          setCurrency(data[0].currency);
        }
      } catch (error) {
        console.error('Error fetching student financial info:', error);
      } finally {
        setLoading(false);
      }
    };

    if (studentIds.length > 0) {
      fetchAllFinancialInfo();
    }
  }, [studentIds]);

  useEffect(() => {
    if (!loading) {
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
  }, [loading, onClose]);

  const totalFee = studentsData.reduce((sum, s) => sum + parseFloat(s.total_fee || '0'), 0);
  const totalPaid = studentsData.reduce((sum, s) => sum + parseFloat(s.total_paid || '0'), 0);
  const totalRemaining = studentsData.reduce((sum, s) => sum + parseFloat(s.remaining_amount || '0'), 0);

  if (loading) {
    return null;
  }

  return (
    <>
      <style>
        {`
          @media print {
            @page { size: A4; margin: 8mm; }
            body * { visibility: hidden; }
            #student-bulk-print, #student-bulk-print * { visibility: visible; }
            #student-bulk-print { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
          }
          @media screen { #student-bulk-print { display: none; } }
        `}
      </style>

      <div id="student-bulk-print" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', lineHeight: '1.4', color: '#333' }}>
        <div style={{ textAlign: 'center', borderBottom: '3px solid #1e40af', paddingBottom: '15px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
            <img src="/logo.jpeg" alt="School Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '10px' }} />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#1e40af' }}>
            {t('students.studentFinancialReport', 'Student Financial Report')}
          </h1>
          <p style={{ fontSize: '11px', color: '#666', margin: '0 0 3px 0' }}>
            {t('students.totalStudents', 'Total Students')}: {studentsData.length}
          </p>
          <p style={{ fontSize: '10px', color: '#888', margin: 0 }}>
            {t('common.printed', 'Printed')}: {formatDate(new Date().toISOString())}
          </p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', direction: tableDirection, marginBottom: '15px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1e40af', color: 'white' }}>
              <th style={{ padding: '10px 8px', textAlign: isRTL ? 'right' : 'left', fontWeight: '600', border: '1px solid #1e40af', backgroundColor: '#1e40af', color: 'white' }}>#</th>
              <th style={{ padding: '10px 8px', textAlign: isRTL ? 'right' : 'left', fontWeight: '600', border: '1px solid #1e40af', backgroundColor: '#1e40af', color: 'white' }}>{t('students.fullName')}</th>
              <th style={{ padding: '10px 8px', textAlign: isRTL ? 'right' : 'left', fontWeight: '600', border: '1px solid #1e40af', backgroundColor: '#1e40af', color: 'white' }}>{t('students.classLevel')}</th>
              <th style={{ padding: '10px 8px', textAlign: isRTL ? 'left' : 'right', fontWeight: '600', border: '1px solid #1e40af', backgroundColor: '#1e40af', color: 'white' }}>{t('students.totalFee')}</th>
              <th style={{ padding: '10px 8px', textAlign: isRTL ? 'left' : 'right', fontWeight: '600', border: '1px solid #1e40af', backgroundColor: '#1e40af', color: 'white' }}>{t('students.paidFee')}</th>
              <th style={{ padding: '10px 8px', textAlign: isRTL ? 'left' : 'right', fontWeight: '600', border: '1px solid #1e40af', backgroundColor: '#1e40af', color: 'white' }}>{t('students.remainingFee')}</th>
            </tr>
          </thead>
          <tbody>
            {studentsData.map((student, index) => (
              <tr key={student.student_id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', textAlign: isRTL ? 'right' : 'left', border: '1px solid #e2e8f0' }}>{index + 1}</td>
                <td style={{ padding: '8px', textAlign: isRTL ? 'right' : 'left', fontWeight: '500', border: '1px solid #e2e8f0' }}>{student.student_name}</td>
                <td style={{ padding: '8px', textAlign: isRTL ? 'right' : 'left', border: '1px solid #e2e8f0' }}>{student.class_level_name}</td>
                <td style={{ padding: '8px', textAlign: isRTL ? 'left' : 'right', fontWeight: '600', border: '1px solid #e2e8f0' }}>{formatCurrency(student.total_fee, student.currency)}</td>
                <td style={{ padding: '8px', textAlign: isRTL ? 'left' : 'right', color: '#16a34a', fontWeight: '600', border: '1px solid #e2e8f0' }}>{formatCurrency(student.total_paid, student.currency)}</td>
                <td style={{ padding: '8px', textAlign: isRTL ? 'left' : 'right', color: parseFloat(student.remaining_amount) > 0 ? '#dc2626' : '#16a34a', fontWeight: '600', border: '1px solid #e2e8f0' }}>
                  {formatCurrency(student.remaining_amount, student.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#f0f4ff', fontWeight: 'bold' }}>
              <td colSpan={3} style={{ padding: '10px 8px', textAlign: isRTL ? 'right' : 'left', border: '1px solid #1e40af', fontSize: '12px' }}>
                {t('students.total', 'Total')}:
              </td>
              <td style={{ padding: '10px 8px', textAlign: isRTL ? 'left' : 'right', border: '1px solid #1e40af', fontSize: '12px', color: '#1e40af' }}>
                {formatCurrency(totalFee, currency)}
              </td>
              <td style={{ padding: '10px 8px', textAlign: isRTL ? 'left' : 'right', border: '1px solid #1e40af', fontSize: '12px', color: '#16a34a' }}>
                {formatCurrency(totalPaid, currency)}
              </td>
              <td style={{ padding: '10px 8px', textAlign: isRTL ? 'left' : 'right', border: '1px solid #1e40af', fontSize: '12px', color: totalRemaining > 0 ? '#dc2626' : '#16a34a' }}>
                {formatCurrency(totalRemaining, currency)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div style={{ marginTop: '25px', paddingTop: '15px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#666' }}>
          <div>
            <p style={{ margin: 0 }}>{t('common.signature', 'Signature')}: _________________</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0 }}>{t('common.generatedBy', 'Document generated by Student Management System')}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentBulkPrint;
