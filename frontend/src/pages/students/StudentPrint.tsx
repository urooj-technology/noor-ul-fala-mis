import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import axios from '@/lib/axios';

interface FeeBreakdownItem {
  fee_type_id: number;
  fee_type: string;
  fee_category: string;
  amount: string;
  currency: string;
  is_mandatory: boolean;
  paid_amount: string;
  remaining_amount: string;
  class_level_id?: number;
  class_level_name?: string;
}

interface StudentPrintData {
  id: number | string;
  registration_number?: string;
  full_name?: string;
  father_name?: string;
  grandfather_name?: string;
  date_of_birth?: string;
  gender?: string;
  tazkira_number?: string;
  class_level_details?: { name?: string };
  status?: string;
  phone?: string;
  parent_phone?: string;
  student_phone?: string;
  alternative_phone?: string;
  email?: string;
  permanent_address?: string;
  current_address?: string;
  province?: string;
  district?: string;
  area?: string;
  transportation?: string;
  registration_date?: string;
  total_fee?: string | number;
  total_paid?: string | number;
  remaining_balance?: string | number;
  financial_summary?: {
    total_fee?: string | number;
    total_paid?: string | number;
    remaining_balance?: string | number;
    currency?: string;
  };
}

interface StudentPrintProps {
  student: StudentPrintData;
  onClose?: () => void;
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

export const StudentPrint = ({ student, onClose }: StudentPrintProps) => {
  const { t, language } = useLanguage();
  const isRTL = language === 'fa' || language === 'ps';
  const tableDirection = isRTL ? 'rtl' : 'ltr';
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdownItem[]>([]);
  const [totalFee, setTotalFee] = useState<number>(0);
  const [totalPaid, setTotalPaid] = useState<number>(0);
  const [totalRemaining, setTotalRemaining] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('AFN');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeeBreakdown = async () => {
      try {
        const response = await axios.get(`/student-payments/financial_info/?student=${student.id}`);
        if (response.data) {
          setFeeBreakdown(response.data.fee_breakdown || []);
          setTotalFee(parseFloat(response.data.total_fee) || 0);
          setTotalPaid(parseFloat(response.data.total_paid) || 0);
          setTotalRemaining(parseFloat(response.data.remaining_amount) || 0);
          setCurrency(response.data.currency || 'AFN');
        }
      } catch (error) {
        console.error('Error fetching fee breakdown:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeeBreakdown();
  }, [student.id]);

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
      active: t('students.statusOptions.active'),
      inactive: t('students.statusOptions.inactive'),
      graduated: t('students.statusOptions.graduated'),
      suspended: t('students.statusOptions.suspended'),
      transferred: t('students.statusOptions.transferred'),
    };
    return labels[status] || status;
  };

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
            #student-print, #student-print * { visibility: visible; }
            #student-print { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
          }
          @media screen { #student-print { display: none; } }
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

      <div id="student-print" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', lineHeight: '1.3', color: '#333' }}>
        {/* Header with Centered Logo */}
        <div style={{ textAlign: 'center', borderBottom: '3px solid #1e40af', paddingBottom: '15px', marginBottom: '15px' }}>
          {/* Logo Centered at Top using Flexbox */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
            <img 
              src="/logo.jpeg" 
              alt="School Logo" 
              style={{ width: '90px', height: '90px', objectFit: 'contain', borderRadius: '10px' }}
            />
          </div>
          
          {/* Title and Info */}
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#1e40af' }}>{t('students.studentInformation')}</h1>
          <p style={{ fontSize: '12px', color: '#666', margin: '0 0 3px 0' }}>{t('students.registrationNumber')}: {student.registration_number || '-'}</p>
          <p style={{ fontSize: '10px', color: '#888', margin: 0 }}>{t('common.printed', 'Printed')}: {formatDate(new Date().toISOString())}</p>
        </div>

        {/* Two Column Layout for Basic Info */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
          {/* Left Column - Personal Info */}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '4px', marginBottom: '6px' }}>{t('students.studentInformation')}</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ padding: '2px 0', color: '#666', width: '40%' }}>{t('students.fullName')}:</td><td style={{ padding: '2px 0', fontWeight: '600' }}>{student.full_name || '-'}</td></tr>
                <tr><td style={{ padding: '2px 0', color: '#666' }}>{t('students.fatherName')}:</td><td style={{ padding: '2px 0', fontWeight: '600' }}>{student.father_name || '-'}</td></tr>
                <tr><td style={{ padding: '2px 0', color: '#666' }}>{t('students.grandfatherName')}:</td><td style={{ padding: '2px 0' }}>{student.grandfather_name || '-'}</td></tr>
                <tr><td style={{ padding: '2px 0', color: '#666' }}>{t('students.genderLabel')}:</td><td style={{ padding: '2px 0' }}>{student.gender ? t(`students.gender.${student.gender}`) : '-'}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Right Column - Academic & Contact */}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '4px', marginBottom: '6px' }}>{t('students.contactInformation')}</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ padding: '2px 0', color: '#666', width: '40%' }}>{t('students.classLevel')}:</td><td style={{ padding: '2px 0', fontWeight: '600' }}>{student.class_level_details?.name || '-'}</td></tr>
                <tr><td style={{ padding: '2px 0', color: '#666' }}>{t('students.status')}:</td><td style={{ padding: '2px 0' }}>{getStatusLabel(student.status || 'inactive')}</td></tr>
                <tr><td style={{ padding: '2px 0', color: '#666' }}>{t('students.phone')}:</td><td style={{ padding: '2px 0' }}>{student.phone || student.parent_phone || '-'}</td></tr>
                <tr><td style={{ padding: '2px 0', color: '#666' }}>{t('students.province')}:</td><td style={{ padding: '2px 0' }}>{student.province || '-'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Fee Breakdown Table */}
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '4px', marginBottom: '8px' }}>{t('students.feeBreakdown')}</h2>
          {feeBreakdown.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', direction: tableDirection }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
                  <th style={{ padding: '6px 8px', textAlign: isRTL ? 'right' : 'left', fontWeight: '600' }}>{t('students.feeType')}</th>
                  <th style={{ padding: '6px 8px', textAlign: isRTL ? 'left' : 'right', fontWeight: '600' }}>{t('students.amount')}</th>
                  <th style={{ padding: '6px 8px', textAlign: isRTL ? 'left' : 'right', fontWeight: '600' }}>{t('students.paidFee')}</th>
                  <th style={{ padding: '6px 8px', textAlign: isRTL ? 'left' : 'right', fontWeight: '600' }}>{t('students.remainingFee')}</th>
                </tr>
              </thead>
              <tbody>
                {feeBreakdown.map((fee, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '5px 8px', textAlign: isRTL ? 'right' : 'left' }}>{fee.fee_type}</td>
                    <td style={{ padding: '5px 8px', textAlign: isRTL ? 'left' : 'right' }}>{formatCurrency(fee.amount, fee.currency)}</td>
                    <td style={{ padding: '5px 8px', textAlign: isRTL ? 'left' : 'right', color: '#16a34a' }}>{formatCurrency(fee.paid_amount, fee.currency)}</td>
                    <td style={{ padding: '5px 8px', textAlign: isRTL ? 'left' : 'right', color: parseFloat(fee.remaining_amount) > 0 ? '#dc2626' : '#16a34a', fontWeight: '600' }}>
                      {formatCurrency(fee.remaining_amount, fee.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '10px' }}>{t('students.noFeesAssigned')}</p>
          )}
        </div>

        {/* Financial Summary */}
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '4px', marginBottom: '8px' }}>{t('students.financialSummary')}</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', direction: tableDirection }}>
            <tbody>
              <tr style={{ backgroundColor: '#f0f4ff' }}>
                <td style={{ padding: '8px 6px', fontWeight: 'bold', fontSize: '12px', border: '1px solid #1e40af', textAlign: isRTL ? 'right' : 'left' }}>{t('students.totalFee')}</td>
                <td style={{ padding: '8px 6px', textAlign: isRTL ? 'left' : 'right', fontWeight: 'bold', fontSize: '14px', color: '#1e40af', border: '1px solid #1e40af' }}>{formatCurrency(totalFee, currency)}</td>
                <td style={{ padding: '8px 6px', fontWeight: 'bold', fontSize: '12px', border: '1px solid #1e40af', textAlign: isRTL ? 'right' : 'left' }}>{t('students.paidFee')}</td>
                <td style={{ padding: '8px 6px', textAlign: isRTL ? 'left' : 'right', fontWeight: 'bold', fontSize: '14px', color: '#16a34a', border: '1px solid #1e40af' }}>{formatCurrency(totalPaid, currency)}</td>
                <td style={{ padding: '8px 6px', fontWeight: 'bold', fontSize: '12px', border: '1px solid #1e40af', textAlign: isRTL ? 'right' : 'left' }}>{t('students.remainingFee')}</td>
                <td style={{ padding: '8px 6px', textAlign: isRTL ? 'left' : 'right', fontWeight: 'bold', fontSize: '14px', color: totalRemaining > 0 ? '#dc2626' : '#16a34a', border: '1px solid #1e40af' }}>{formatCurrency(totalRemaining, currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
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

export default StudentPrint;
