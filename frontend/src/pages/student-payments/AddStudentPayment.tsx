import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Autocomplete } from '@/components/ui/autocomplete';
import { useLanguage } from '@/contexts/LanguageContext';
import { RotateCw, ArrowLeft, User, CreditCard, Calendar as CalendarIcon, DollarSign, Info, FileSpreadsheet } from 'lucide-react';
import { useCalendar } from '@/contexts/CalendarContext';
import { getYearsArray, getMonthNames } from '@/utils/calendar';
import useAdd from '@/api/useAdd';
import useFetchObject from '@/api/useFetchObject';
import DatePicker from '@/components/ui/date-picker-calendar';

interface StudentPaymentFormData {
  assignment: string;
  class_level: string;
  amount: string;
  currency: string;
  payment_date: string;
  payment_status: string;
  period_year: string;
  period_month: string;
  period_months: string[];
  fee_type?: string;
  reference_number?: string;
  description?: string;
  receipt?: File;
}

interface StudentInfo {
  id: string | number;
  full_name: string;
  payment_interval_months?: number;
  payment_interval_display?: string;
  currency?: string;
  monthly_fee?: number | string;
  yearly_fee?: number | string;
  class_level?: { name?: string } | null;
  total_paid?: number | string;
  remaining_balance?: number | string;
}

const defaultForm: StudentPaymentFormData = {
  assignment: '',
  class_level: 'all',
  amount: '',
  currency: 'AFN',
  payment_date: new Date().toISOString().split('T')[0],
  payment_status: 'completed',
  period_year: new Date().getFullYear().toString(),
  period_month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
  period_months: [(new Date().getMonth() + 1).toString().padStart(2, '0')],
  reference_number: '',
  description: '',
  receipt: undefined,
};

const getCalendarMonths = (calendarType: any, lang: 'fa' | 'ps' = 'fa') =>
  getMonthNames(calendarType, lang).map((label, i) => ({ value: (i + 1).toString(), label }));

function formatCurrency(amount: number | string | undefined, currency: string = 'AFN') {
  const val = typeof amount === 'string' ? parseFloat(amount) || 0 : (amount ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(val);
}

function FinanceBox({ label, value, highlight, valueClass }: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  valueClass?: string;
}) {
  return (
    <div className={`rounded-lg px-3 py-2 ${highlight ? 'bg-indigo-100/60 dark:bg-indigo-800/30' : 'bg-white/50 dark:bg-black/20'}`}>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-sm font-bold mt-0.5 ${valueClass || 'text-foreground'}`}>{value}</div>
    </div>
  );
}

const AddStudentPayment = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<StudentPaymentFormData>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(false);
  const [maxMonths, setMaxMonths] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [studentFeeAssignments, setStudentFeeAssignments] = useState<any[]>([]);
  const [studentData, setStudentData] = useState<any | null>(null);
  const { calendarType } = useCalendar();

  const { handleAdd, loading, isSuccess } = useAdd<StudentPaymentFormData>({
    queryKey: ['student-payments'],
    endpoint: 'student-payments/',
  });

  const [allocationMode, setAllocationMode] = useState<'all' | 'per_fee'>('all');
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [feeTypes, setFeeTypes] = useState<any[]>([]);

  const firstMonth = formData.period_months[0];
  
  // Fetch financial info when student is selected
  const { data: financialInfo } = useFetchObject<any>({
    queryKey: ['student-financial-info', selectedStudentId, selectedLevel, firstMonth || formData.period_month, formData.period_year],
    endpoint: selectedStudentId && formData.period_months.length > 0 
      ? `student-payments/financial_info/?student=${selectedStudentId}&class_level=${selectedLevel}&month=${firstMonth}&year=${formData.period_year}` 
      : '',
    enabled: !!selectedStudentId && formData.period_months.length > 0,
  });

  // Fetch student data when selectedStudentId changes
  const { data: fetchedStudentData, isLoading: fetchingStudent } = useFetchObject<any>({
    queryKey: ['student', selectedStudentId],
    endpoint: selectedStudentId ? `students/${selectedStudentId}/` : '',
    enabled: !!selectedStudentId && !studentData,
  });

  useEffect(() => {
    if (fetchedStudentData) {
      setStudentData(fetchedStudentData);
    }
  }, [fetchedStudentData]);

  // Fetch fee assignments when student or level changes
  useEffect(() => {
    if (selectedStudentId) {
      let url = `/api/student-payments/student_fee_assignments/?student=${selectedStudentId}`;
      if (selectedLevel && selectedLevel !== 'all') {
        url += `&class_level=${selectedLevel}`;
      }
      fetch(url)
        .then(res => res.json())
        .then(data => {
          console.log('Fee assignments fetched:', data);
          setStudentFeeAssignments(data.total_assignments || []);
          // Extract unique fee types from assignments for the dropdown
          const feeTypesList = data.total_assignments?.map((a: any) => ({
            id: a.fee_type?.toString(),
            name: a.fee_type_details?.name || '',
            category: a.fee_type_details?.category || 'other',
            default_amount: a.amount || '0',
            currency: a.currency || formData.currency
          })) || [];
          setFeeTypes(feeTypesList);
        })
        .catch(error => {
          console.error('Error fetching fee assignments:', error);
          setStudentFeeAssignments([]);
          setFeeTypes([]);
        });
    } else {
      setStudentFeeAssignments([]);
      setFeeTypes([]);
    }
  }, [selectedStudentId, selectedLevel]);

  useEffect(() => {
    if (isSuccess) {
      navigate('/student-payments');
    }
  }, [isSuccess, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.assignment) newErrors.assignment = t('student-payments.validation.assignment');
    if (!formData.amount || parseFloat(formData.amount) <= 0)
      newErrors.amount = t('student-payments.validation.amount');
    if (!formData.payment_date) newErrors.payment_date = t('student-payments.validation.paymentDate');
    if (!formData.payment_status) newErrors.payment_status = t('student-payments.validation.paymentStatus');
    if (!formData.period_months || formData.period_months.length === 0) {
      newErrors.period_months = 'Select at least one month';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    const formDataObj = new FormData();
    Object.entries({ ...formData, fee_type: formData.fee_type || undefined }).forEach(([key, value]) => {
      if (key === 'receipt' && value instanceof File) {
        formDataObj.append('receipt', value);
      } else {
        formDataObj.append(key, String(value ?? ''));
      }
    });
    formDataObj.append('allocation_mode', allocationMode);
    if (allocationMode === 'per_fee') {
      formDataObj.append('allocations', JSON.stringify(allocations || {}));
    }
    handleAdd(formDataObj);
  };

  const toggleMonth = (value: string) => {
    setErrors((prev) => ({ ...prev, period_months: '' }));
    setFormData((prev) => {
      const has = prev.period_months.includes(value);
      if (!has) {
        const currentCount = prev.period_months.length;
        const limit = maxMonths ?? 1;
        if (currentCount >= limit) {
          setErrors((prevErr) => ({ ...prevErr, period_months: `You can select at most ${limit} month(s) for this fee.` }));
          return prev;
        }
      }
      return {
        ...prev,
        period_months: has
          ? prev.period_months.filter((m) => m !== value)
          : [...prev.period_months, value],
      };
    });
  };

  const selectedMonthsList = useMemo(
    () => getCalendarMonths(calendarType).filter((m) => formData.period_months.includes(m.value)),
    [formData.period_months, calendarType]
  );
  const monthsCount = formData.period_months.length;

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/student-payments')}
          className="rounded-full hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-bold">{t('student-payments.addPayment')}</h1>
      </div>

      <Card className="border-t-4 border-t-indigo-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-indigo-600" />
            {t('student-payments.paymentDetails', 'Payment Details')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="student" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('student-payments.student', 'Student')} <span className="text-destructive">*</span>
              </Label>
              <Autocomplete
                endpoint="students"
                value={selectedStudentId || ''}
                onChange={(value, option) => {
                  if (option && option.id) {
                    setSelectedStudentId(option.id.toString());
                    setStudentData(option);
                    setFormData(prev => ({ ...prev, student: option.id.toString(), class_level: '', period_months: [] }));
                    setSelectedLevel('all');
                    setStudentFeeAssignments([]);
                    setFeeTypes([]);
                  } else {
                    setSelectedStudentId(null);
                    setStudentData(null);
                    setFormData(prev => ({ ...prev, student: '', class_level: '', period_months: [] }));
                    setStudentFeeAssignments([]);
                    setFeeTypes([]);
                  }
                }}
                placeholder={t('student-payments.selectStudent', 'Select Student')}
                getOptionLabel={(s) => `${s.full_name} (${s.registration_number})`}
                getOptionValue={(s) => s.id.toString()}
              />
              {fetchingStudent && (
                <p className="text-[10px] text-muted-foreground">Loading student data...</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="level" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('student-payments.level', 'Level')} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedLevel}
                onValueChange={(value) => {
                  setSelectedLevel(value);
                  setFormData(prev => ({ ...prev, class_level: value, assignment: '', period_months: [] }));
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t('student-payments.selectLevel', 'Select Level')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all', 'All Levels')}</SelectItem>
                  <SelectItem value="1">{t('students.classLevels.1', 'Class 1')}</SelectItem>
                  <SelectItem value="2">{t('students.classLevels.2', 'Class 2')}</SelectItem>
                  <SelectItem value="3">{t('students.classLevels.3', 'Class 3')}</SelectItem>
                  <SelectItem value="4">{t('students.classLevels.4', 'Class 4')}</SelectItem>
                  <SelectItem value="5">{t('students.classLevels.5', 'Class 5')}</SelectItem>
                  <SelectItem value="6">{t('students.classLevels.6', 'Class 6')}</SelectItem>
                  <SelectItem value="7">{t('students.classLevels.7', 'Class 7')}</SelectItem>
                  <SelectItem value="8">{t('students.classLevels.8', 'Class 8')}</SelectItem>
                  <SelectItem value="9">{t('students.classLevels.9', 'Class 9')}</SelectItem>
                  <SelectItem value="10">{t('students.classLevels.10', 'Class 10')}</SelectItem>
                  <SelectItem value="11">{t('students.classLevels.11', 'Class 11')}</SelectItem>
                  <SelectItem value="12">{t('students.classLevels.12', 'Class 12')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {studentData && !fetchingStudent && (
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-4 py-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-800 dark:text-indigo-200 uppercase tracking-wide">
                <Info className="h-3.5 w-3.5" />
                {t('student-payments.studentFinancialInfo', 'Student Financial Summary')}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <FinanceBox
                  label={t('students.studentName', 'Student')}
                  value={studentData.full_name}
                />
                <FinanceBox
                  label={t('students.feeCurrency')}
                  value={studentData.currency || formData.currency || 'AFN'}
                />
                <FinanceBox
                  label={t('students.totalPaid', 'Total Paid')}
                  value={formatCurrency(studentData.total_paid ?? 0, studentData.currency || formData.currency || 'AFN')}
                  valueClass="text-emerald-600 dark:text-emerald-400"
                />
                <FinanceBox
                  label={t('students.remainingBalance', 'Balance Due')}
                  value={formatCurrency(studentData.remaining_balance ?? 0, studentData.currency || formData.currency || 'AFN')}
                  highlight
                  valueClass="text-red-600 dark:text-red-400"
                />
              </div>
            </div>
          )}

          {financialInfo && formData.period_months.length > 0 && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-blue-200 uppercase tracking-wide">
                <DollarSign className="h-3.5 w-3.5" />
                {t('student-payments.periodFinancialInfo', 'Period Financial Info')}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FinanceBox
                  label={t('student-payments.totalAmount', 'Total Amount')}
                  value={formatCurrency(financialInfo.total_amount, financialInfo.currency)}
                />
                <FinanceBox
                  label={t('student-payments.paidAmount', 'Paid Amount')}
                  value={formatCurrency(financialInfo.paid_amount, financialInfo.currency)}
                  valueClass="text-emerald-600 dark:text-emerald-400"
                />
                <FinanceBox
                  label={t('student-payments.remainingAmount', 'Remaining Amount')}
                  value={formatCurrency(financialInfo.remaining_amount, financialInfo.currency)}
                  highlight
                  valueClass={financialInfo.remaining_amount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}
                />
              </div>
            </div>
          )}

          {/* Fee Breakdown Section */}
          {studentFeeAssignments.length > 0 && (
            <div className="rounded-xl border bg-muted/30 px-4 py-3 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {t('student-payments.feeBreakdown', 'Fee Breakdown by Type')}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('student-payments.feeBreakdownHelp', 'Select a fee type below to pay for that specific fee.')} {t('student-payments.feeBreakdownNote', 'Total fees and payments shown below.')}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs table-fixed">
                  <thead>
                    <tr className="bg-muted/20 text-muted-foreground">
                      <th className="p-2 text-left">{t('students.feeType')}</th>
                      <th className="p-2 text-left">{t('students.feeCategory')}</th>
                      <th className="p-2 text-right">{t('student-payments.amount')}</th>
                      <th className="p-2 text-right">{t('student-payments.paidAmount')}</th>
                      <th className="p-2 text-right">{t('student-payments.remainingAmount')}</th>
                      <th className="p-2 text-center">{t('student-payments.actions', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentFeeAssignments.map((assignment: any) => {
                      const amount = parseFloat(assignment.amount || '0');
                      const paid = parseFloat(assignment.paid_amount || '0');
                      const remaining = parseFloat(assignment.remaining_amount || '0');
                      return (
                        <tr key={assignment.id} className="border-b hover:bg-muted/50">
                          <td className="p-2 align-top font-medium">{assignment.fee_type_details?.name || ''}</td>
                          <td className="p-2 align-top text-muted-foreground text-[11px]">{t(`student-payments.feeCategories.${assignment.fee_type_details?.category || 'other'}`, assignment.fee_type_details?.category || 'other')}</td>
                          <td className="p-2 text-right">{formatCurrency(amount, assignment.currency)}</td>
                          <td className="p-2 text-right text-emerald-600">{formatCurrency(paid, assignment.currency)}</td>
                          <td className={`p-2 text-right font-medium ${remaining > 0 ? 'text-red-600' : 'text-emerald-600' }`}>{formatCurrency(remaining, assignment.currency)}</td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setAllocationMode('per_fee');
                                setFormData(prev => ({ 
                                  ...prev, 
                                  fee_type: assignment.fee_type?.toString() || '', 
                                  assignment: assignment.id.toString(), 
                                  amount: remaining.toString(),
                                  currency: assignment.currency || formData.currency
                                }));
                                setAllocations({ [assignment.fee_type?.toString() || '']: remaining.toString() });
                              }}
                              className="px-3 py-1.5 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 transition-colors"
                              disabled={remaining <= 0}
                            >
                              {remaining > 0 ? t('common.pay') : t('common.paid')}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-muted/10">
                      <td className="p-2">{t('common.totals', 'Totals')}</td>
                      <td className="p-2" />
                      <td className="p-2 text-right">{formatCurrency(studentFeeAssignments.reduce((s: number, a: any) => s + (parseFloat(a.amount) || 0), 0), financialInfo?.currency || 'AFN')}</td>
                      <td className="p-2 text-right text-emerald-600">{formatCurrency(studentFeeAssignments.reduce((s: number, a: any) => s + (parseFloat(a.paid_amount) || 0), 0), financialInfo?.currency || 'AFN')}</td>
                      <td className="p-2 text-right">{formatCurrency(studentFeeAssignments.reduce((s: number, a: any) => s + (parseFloat(a.remaining_amount) || 0), 0), financialInfo?.currency || 'AFN')}</td>
                      <td className="p-2" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('student-payments.amount')} <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, amount: e.target.value }));
                    if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
                  }}
                  placeholder={t('student-payments.enterAmount')}
                  className="h-10 pl-9"
                />
              </div>
              {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('student-payments.currency')}
              </Label>
              <Select
                value={formData.currency}
                disabled
                onValueChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t('student-payments.selectCurrency')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AFN">AFN (؋)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {t('students.feeCurrency')} — {formData.currency}
              </p>
            </div>
          </div>

          {/* Fee Type Dropdown for per-fee payment */}
          {feeTypes.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="fee_type" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('student-payments.feeType', 'Fee Type (Optional)')}
                <span className="ml-1 text-muted-foreground/60 text-[10px] font-normal">({t('common.optional')})</span>
              </Label>
              <Select
                value={formData.fee_type || ''}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, fee_type: value }));
                  // Update allocations when fee type changes
                  if (value && feeTypes.length > 0) {
                    const feeType = feeTypes.find(ft => ft.id.toString() === value);
                    if (feeType) {
                      setAllocations({ [value]: feeType.default_amount || '' });
                    }
                  }
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t('student-payments.selectFeeType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('student-payments.allAssignments', 'All Fees (Split across all)')}</SelectItem>
                  {feeTypes.map((feeType) => (
                    <SelectItem key={feeType.id} value={feeType.id?.toString()}>
                      <div className="flex items-center justify-between">
                        <span>{feeType.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {t(`student-payments.feeCategories.${feeType.category}`, feeType.category)}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                {t('student-payments.feeTypeHelp', 'Leave empty to split payment across all fees. Select a specific fee type to pay only that fee.')}
              </p>
            </div>
          )}

          {/* Month Selection */}
          <div className="space-y-2">
            <div className="text-xs font-semibold">{t('student-payments.periodMonth', 'Period Month')} <span className="text-destructive">*</span></div>
            <div className="flex flex-wrap gap-2">
              {getCalendarMonths(calendarType).map((m) => {
                const isSelected = formData.period_months.includes(m.value);
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => toggleMonth(m.value)}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      isSelected 
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                        : 'border bg-background hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-900/30'
                    }`}
                  >
                    {m.label}
                    {isSelected && <span className="ml-1 opacity-70">×</span>}
                  </button>
                );
              })}
            </div>
            {errors.period_months && <p className="text-xs text-destructive mt-1">{errors.period_months}</p>}
          </div>

          {monthsCount > 0 && formData.amount && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3 flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="text-sm">
                <span className="font-medium">
                  {monthsCount} month{monthsCount > 1 ? 's' : ''} × {formatCurrency(formData.amount, formData.currency)}
                  = <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(parseFloat(formData.amount || '0') * monthsCount, formData.currency)}
                  </span>
                </span>
                <span className="text-muted-foreground ml-2">
                  ({selectedMonthsList.map(m => m.label).join(', ')})
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="payment_date" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('student-payments.paymentDate')} <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                value={formData.payment_date}
                onChange={(date) => {
                  setFormData((prev) => ({ ...prev, payment_date: date?.toISOString().slice(0, 10) || '' }));
                  if (errors.payment_date) setErrors((prev) => ({ ...prev, payment_date: '' }));
                }}
                className="h-10"
              />
              {errors.payment_date && <p className="text-xs text-destructive mt-1">{errors.payment_date}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment_status" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('student-payments.paymentStatus')} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.payment_status}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, payment_status: value }));
                  if (errors.payment_status) setErrors((prev) => ({ ...prev, payment_status: '' }));
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t('student-payments.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('student-payments.status.pending')}</SelectItem>
                  <SelectItem value="completed">{t('student-payments.status.completed')}</SelectItem>
                  <SelectItem value="cancelled">{t('student-payments.status.cancelled')}</SelectItem>
                  <SelectItem value="refunded">{t('student-payments.status.refunded')}</SelectItem>
                </SelectContent>
              </Select>
              {errors.payment_status && <p className="text-xs text-destructive mt-1">{errors.payment_status}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reference_number" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t('student-payments.referenceNumber', 'Reference Number')}
            </Label>
            <Input
              id="reference_number"
              value={formData.reference_number}
              onChange={(e) => setFormData((prev) => ({ ...prev, reference_number: e.target.value }))}
              placeholder={t('student-payments.referenceNumberPlaceholder', 'e.g. BANK-2026-001')}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t('student-payments.description')}
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t('student-payments.enterDescription')}
              className="h-20"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receipt" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t('student-payments.receipt', 'Receipt')} ({t('common.optional')})
            </Label>
            <Input
              id="receipt"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setFormData((prev) => ({ ...prev, receipt: file }));
                }
              }}
              className="h-10"
            />
            {formData.receipt && (
              <p className="text-[10px] text-muted-foreground">
                Selected: {formData.receipt.name}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => navigate('/student-payments')} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin" />
                  {t('common.adding')}
                </>
              ) : (
                t('common.add')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddStudentPayment;
