import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Autocomplete } from '@/components/ui/autocomplete';
import { ArrowLeft, FileBarChart, Printer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import useFetchObjects from '@/api/useFetchObjects';

const CLASS_LEVEL_IDS = [
  { id: 'KG', level: '0' },
  { id: '1', level: '1' },
  { id: '2', level: '2' },
  { id: '3', level: '3' },
  { id: '4', level: '4' },
  { id: '5', level: '5' },
  { id: '6', level: '6' },
  { id: '7', level: '7' },
  { id: '8', level: '8' },
  { id: '9', level: '9' },
  { id: '10', level: '10' },
  { id: '11', level: '11' },
  { id: '12', level: '12' },
] as const;

type PaymentBalanceStatus = '' | 'paid' | 'unpaid' | 'partial';

interface ReportRow {
  student_id: number;
  registration_number: string;
  student_name: string;
  class_level?: string | null;
  class_level_id?: string | number | null;
  status?: string;
  fee_type?: string;
  payment_status?: 'paid' | 'unpaid' | 'partial' | 'none';
  total_expected: string;
  total_paid: string;
  remaining_balance: string;
  currency: string;
}

interface CurrencyTotal {
  currency: string;
  total_expected: string;
  total_paid: string;
  remaining_balance: string;
  student_count: number;
}

interface ReportResponse {
  count: number;
  results: ReportRow[];
  totals_by_currency: CurrencyTotal[];
  grand_totals: {
    total_expected: string;
    total_paid: string;
    remaining_balance: string;
    student_count: number;
  };
}

function formatCurrency(amount: string | number | undefined, currency: string = 'AFN'): string {
  const val = typeof amount === 'string' ? parseFloat(amount) || 0 : (amount ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

const StudentOutstandingReport = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'fa' || language === 'ps';
  const tableDirection = isRTL ? 'rtl' : 'ltr';

  const [statusFilter, setStatusFilter] = useState('');
  const [classLevelFilter, setClassLevelFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentBalanceStatus>('');

  const { data, isLoading, refetch } = useFetchObjects<ReportResponse>({
    queryKey: ['student-outstanding-report', statusFilter, classLevelFilter, paymentStatusFilter],
    endpoint: 'students/outstanding_report/',
    params: {
      ...(statusFilter && { status: statusFilter }),
      ...(classLevelFilter && { class_level: classLevelFilter }),
      ...(paymentStatusFilter && { payment_status: paymentStatusFilter }),
    },
  });

  const rows = data?.results || [];
  const totalsByCurrency = data?.totals_by_currency || [];

  const classLevels = useMemo(
    () => [
      { id: '', level: '', name: t('students.allClasses', 'All Classes') },
      ...CLASS_LEVEL_IDS.map((c) => ({
        id: c.id,
        level: c.level,
        name: t(`students.classLevels.${c.id}`, c.id === 'KG' ? 'Kindergarten' : `${t('students.classLevelShort', 'Class')} ${c.id}`),
      })),
    ],
    [t],
  );

  const statusOptions = [
    { value: '', label: t('students.allStatuses', 'All Statuses') },
    { value: 'active', label: t('students.statusOptions.active', 'Active') },
    { value: 'inactive', label: t('students.statusOptions.inactive', 'Inactive') },
    { value: 'graduated', label: t('students.statusOptions.graduated', 'Graduated') },
    { value: 'suspended', label: t('students.statusOptions.suspended', 'Suspended') },
    { value: 'transferred', label: t('students.statusOptions.transferred', 'Transferred') },
  ];

  const paymentStatusOptions = [
    { value: '', label: t('students.allPaymentStatuses', 'All Payment Statuses') },
    { value: 'paid', label: t('students.paymentBalanceOptions.paid', 'Full Paid') },
    { value: 'unpaid', label: t('students.paymentBalanceOptions.unpaid', 'Unpaid') },
    { value: 'partial', label: t('students.paymentBalanceOptions.partial', 'Partially Paid') },
  ];

  const hasFilters = Boolean(statusFilter || classLevelFilter || paymentStatusFilter);

  const [printing, setPrinting] = useState(false);
  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  useEffect(() => {
    if (!printing) return;
    const handleAfterPrint = () => setPrinting(false);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [printing]);

  const classLevelLabel = classLevels.find((c) => c.id === classLevelFilter)?.name || t('students.allClasses', 'All Classes');
  const paymentStatusLabel = paymentStatusOptions.find((s) => s.value === paymentStatusFilter)?.label;

  const paymentStatusBadge = (status?: ReportRow['payment_status']) => {
    if (status === 'paid') {
      return (
        <Badge className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
          {t('students.paymentBalanceOptions.paid', 'Full Paid')}
        </Badge>
      );
    }
    if (status === 'partial') {
      return (
        <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
          {t('students.paymentBalanceOptions.partial', 'Partially Paid')}
        </Badge>
      );
    }
    if (status === 'unpaid') {
      return (
        <Badge className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
          {t('students.paymentBalanceOptions.unpaid', 'Unpaid')}
        </Badge>
      );
    }
    return <span className="text-xs text-muted-foreground">-</span>;
  };

  const paymentStatusText = (status?: ReportRow['payment_status']) => {
    if (status === 'paid') return t('students.paymentBalanceOptions.paid', 'Full Paid');
    if (status === 'partial') return t('students.paymentBalanceOptions.partial', 'Partially Paid');
    if (status === 'unpaid') return t('students.paymentBalanceOptions.unpaid', 'Unpaid');
    return '-';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/students')} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <img
          src="/logo.jpeg"
          alt="Noor Ul-Falah"
          className="h-12 w-12 object-contain rounded-lg"
        />
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart className="h-6 w-6 text-primary" />
            {t('students.outstandingReport', 'Student Payment Reports')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('students.outstandingReportDesc', 'View student fee payments by full paid, unpaid, and partially paid status')}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t('students.classLevel')}
            </Label>
            <Autocomplete
              options={classLevels}
              value={classLevelFilter}
              onChange={(value) => setClassLevelFilter((value as string) || '')}
              placeholder={t('students.selectClassLevel')}
              getOptionLabel={(c) => c.name}
              getOptionValue={(c) => c.id.toString()}
              sortOptions={(a: { level?: string }, b: { level?: string }) => Number(a.level || 0) - Number(b.level || 0)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t('students.status')}
            </Label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-9 px-3 border rounded-md bg-background text-sm"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t('students.paymentStatusFilter', 'Payment Status')}
            </Label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value as PaymentBalanceStatus)}
              className="w-full h-9 px-3 border rounded-md bg-background text-sm"
            >
              {paymentStatusOptions.map((opt) => (
                <option key={opt.value || 'all-payment'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {hasFilters && (
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter('');
                  setClassLevelFilter('');
                  setPaymentStatusFilter('');
                }}
              >
                {t('common.clear', 'Clear')}
              </Button>
            )}
            <Button variant="outline" onClick={() => refetch()}>
              {t('common.refresh', 'Refresh')}
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              {t('common.print', 'Print')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {totalsByCurrency.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              {t('students.totalsByCurrency', 'Totals by Currency')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {totalsByCurrency.map((tc) => (
                <div key={tc.currency} className="rounded-lg border p-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    {tc.currency} · {tc.student_count} {t('students.students', 'students')}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('students.totalExpected', 'Total Expected')}</span>
                      <span className="font-medium">{formatCurrency(tc.total_expected, tc.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('students.totalPaid', 'Total Paid')}</span>
                      <span className="font-medium text-emerald-600">{formatCurrency(tc.total_paid, tc.currency)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-muted-foreground">{t('students.totalRemaining', 'Total Remaining')}</span>
                      <span className="font-bold text-red-600">{formatCurrency(tc.remaining_balance, tc.currency)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>{t('students.outstandingDetails', 'Student Payment Details')}</span>
            <Badge variant="secondary">{rows.length} {t('students.students', 'students')}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('students.noStudentsFound', 'No students found')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 text-muted-foreground border-b">
                    <th className="p-2.5 text-left whitespace-nowrap">{t('students.registrationNumber', 'Reg #')}</th>
                    <th className="p-2.5 text-left whitespace-nowrap">{t('students.studentName', 'Student')}</th>
                    <th className="p-2.5 text-left whitespace-nowrap">{t('students.classLevel')}</th>
                    <th className="p-2.5 text-left whitespace-nowrap">{t('students.feeType', 'Fee Type')}</th>
                    <th className="p-2.5 text-left whitespace-nowrap">{t('students.paymentStatus', 'Payment Status')}</th>
                    <th className="p-2.5 text-right whitespace-nowrap">{t('students.totalExpected', 'Expected')}</th>
                    <th className="p-2.5 text-right whitespace-nowrap">{t('students.totalPaid', 'Paid')}</th>
                    <th className="p-2.5 text-right whitespace-nowrap">{t('students.remainingBalance', 'Remaining')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.student_id}
                      className="border-b hover:bg-muted/10 cursor-pointer"
                      onClick={() => navigate(`/students/${row.student_id}`)}
                    >
                      <td className="p-2.5 font-mono text-xs whitespace-nowrap">{row.registration_number}</td>
                      <td className="p-2.5 font-medium whitespace-nowrap">{row.student_name}</td>
                      <td className="p-2.5 whitespace-nowrap">
                        {row.class_level_id
                          ? t(`students.classLevels.${row.class_level_id}`, row.class_level || String(row.class_level_id))
                          : (row.class_level || '-')}
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <Badge variant={row.fee_type === 'paid' ? 'default' : 'secondary'} className="text-xs">
                          {row.fee_type === 'paid'
                            ? t('students.feeTypeOptions.paid', 'Paid')
                            : t('students.feeTypeOptions.free', 'Free')}
                        </Badge>
                      </td>
                      <td className="p-2.5 whitespace-nowrap">{paymentStatusBadge(row.payment_status)}</td>
                      <td className="p-2.5 text-right tabular-nums whitespace-nowrap">
                        {formatCurrency(row.total_expected, row.currency)}
                      </td>
                      <td className="p-2.5 text-right tabular-nums whitespace-nowrap text-emerald-600">
                        {formatCurrency(row.total_paid, row.currency)}
                      </td>
                      <td className="p-2.5 text-right tabular-nums whitespace-nowrap font-bold text-red-600">
                        {formatCurrency(row.remaining_balance, row.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <style>
        {`
          @media print {
            @page { size: A4; margin: 10mm; }
            body * { visibility: hidden; }
            #report-print, #report-print * { visibility: visible; }
            #report-print { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
          }
          @media screen { #report-print { display: none; } }
        `}
      </style>

      <div id="report-print" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', lineHeight: '1.4', color: '#333', direction: tableDirection }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid #1e40af', paddingBottom: '10px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <img src="/logo.jpeg" alt="School Logo" style={{ width: '70px', height: '70px', objectFit: 'contain', borderRadius: '8px' }} />
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#1e40af' }}>
            {t('students.outstandingReport', 'Student Payment Reports')}
          </h1>
          <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>
            {classLevelLabel}
            {statusFilter ? ` · ${statusOptions.find((s) => s.value === statusFilter)?.label}` : ''}
            {paymentStatusFilter ? ` · ${paymentStatusLabel}` : ''}
            {` · ${new Date().toLocaleDateString('en-US')}`}
          </p>
        </div>

        {totalsByCurrency.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '6px 8px', textAlign: isRTL ? 'right' : 'left', border: '1px solid #ddd' }}>{t('students.currency', 'Currency')}</th>
                <th style={{ padding: '6px 8px', textAlign: isRTL ? 'left' : 'right', border: '1px solid #ddd' }}>{t('students.totalExpected', 'Total Expected')}</th>
                <th style={{ padding: '6px 8px', textAlign: isRTL ? 'left' : 'right', border: '1px solid #ddd' }}>{t('students.totalPaid', 'Total Paid')}</th>
                <th style={{ padding: '6px 8px', textAlign: isRTL ? 'left' : 'right', border: '1px solid #ddd' }}>{t('students.totalRemaining', 'Total Remaining')}</th>
                <th style={{ padding: '6px 8px', textAlign: isRTL ? 'left' : 'right', border: '1px solid #ddd' }}>{t('students.students', 'Students')}</th>
              </tr>
            </thead>
            <tbody>
              {totalsByCurrency.map((tc) => (
                <tr key={tc.currency}>
                  <td style={{ padding: '5px 8px', border: '1px solid #eee', fontWeight: '600' }}>{tc.currency}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #eee', textAlign: isRTL ? 'left' : 'right' }}>{formatCurrency(tc.total_expected, tc.currency)}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #eee', textAlign: isRTL ? 'left' : 'right', color: '#16a34a' }}>{formatCurrency(tc.total_paid, tc.currency)}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #eee', textAlign: isRTL ? 'left' : 'right', color: '#dc2626', fontWeight: '600' }}>{formatCurrency(tc.remaining_balance, tc.currency)}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #eee', textAlign: isRTL ? 'left' : 'right' }}>{tc.student_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', direction: tableDirection }}>
          <thead>
            <tr style={{ backgroundColor: '#1e40af', color: '#fff' }}>
              <th style={{ padding: '6px 8px', textAlign: isRTL ? 'right' : 'left' }}>{t('students.registrationNumber', 'Reg #')}</th>
              <th style={{ padding: '6px 8px', textAlign: isRTL ? 'right' : 'left' }}>{t('students.studentName', 'Student')}</th>
              <th style={{ padding: '6px 8px', textAlign: isRTL ? 'right' : 'left' }}>{t('students.classLevel')}</th>
              <th style={{ padding: '6px 8px', textAlign: isRTL ? 'right' : 'left' }}>{t('students.feeType', 'Fee Type')}</th>
              <th style={{ padding: '6px 8px', textAlign: isRTL ? 'right' : 'left' }}>{t('students.paymentStatus', 'Payment Status')}</th>
              <th style={{ padding: '6px 8px', textAlign: isRTL ? 'left' : 'right' }}>{t('students.totalExpected', 'Expected')}</th>
              <th style={{ padding: '6px 8px', textAlign: isRTL ? 'left' : 'right' }}>{t('students.totalPaid', 'Paid')}</th>
              <th style={{ padding: '6px 8px', textAlign: isRTL ? 'left' : 'right' }}>{t('students.remainingBalance', 'Remaining')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.student_id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{row.registration_number}</td>
                <td style={{ padding: '4px 8px', fontWeight: '500' }}>{row.student_name}</td>
                <td style={{ padding: '4px 8px' }}>
                  {row.class_level_id
                    ? t(`students.classLevels.${row.class_level_id}`, row.class_level || String(row.class_level_id))
                    : (row.class_level || '-')}
                </td>
                <td style={{ padding: '4px 8px' }}>{row.fee_type === 'paid' ? t('students.feeTypeOptions.paid', 'Paid') : t('students.feeTypeOptions.free', 'Free')}</td>
                <td style={{ padding: '4px 8px' }}>{paymentStatusText(row.payment_status)}</td>
                <td style={{ padding: '4px 8px', textAlign: isRTL ? 'left' : 'right' }}>{formatCurrency(row.total_expected, row.currency)}</td>
                <td style={{ padding: '4px 8px', textAlign: isRTL ? 'left' : 'right', color: '#16a34a' }}>{formatCurrency(row.total_paid, row.currency)}</td>
                <td style={{ padding: '4px 8px', textAlign: isRTL ? 'left' : 'right', color: '#dc2626', fontWeight: '600' }}>{formatCurrency(row.remaining_balance, row.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '20px', paddingTop: '10px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#666' }}>
          <span>{t('common.signature', 'Signature')}: _________________</span>
          <span>{t('common.generatedBy', 'Document generated by Student Management System')}</span>
        </div>
      </div>
    </div>
  );
};

export default StudentOutstandingReport;
