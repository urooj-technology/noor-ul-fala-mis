import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { RotateCw, ArrowLeft, Info, DollarSign, Calendar as CalendarIcon, FileSpreadsheet } from 'lucide-react';
import { useCalendar } from '@/contexts/CalendarContext';
import { getYearsArray, getMonthNames } from '@/utils/calendar';
import useUpdate from '@/api/useUpdate';
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

const EditStudentPayment = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<StudentPaymentFormData>({
    assignment: '',
    class_level: 'all',
    amount: '',
    currency: 'AFN',
    payment_date: new Date().toISOString().split('T')[0],
    payment_status: 'pending',
    period_year: new Date().getFullYear().toString(),
    period_month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    reference_number: '',
    description: '',
    receipt: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [feeTypes, setFeeTypes] = useState<any[]>([]);
  const [maxMonths, setMaxMonths] = useState<number | null>(null);
  const { calendarType } = useCalendar();
  const [allocationMode, setAllocationMode] = useState<'all' | 'per_fee'>('all');
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [studentData, setStudentData] = useState<any | null>(null);
  
  // Period months state for editing
  const [periodMonths, setPeriodMonths] = useState<string[]>([]);
  const [editingMonthly, setEditingMonthly] = useState(true);

  const { id } = useParams();
  const { data, loading: fetching } = useFetchObject({
    queryKey: ['student-payment', id],
    endpoint: `student-payments/${id}/`,
  });

  const { handleUpdate, loading, isSuccess } = useUpdate({
    queryKey: ['student-payments'],
  });

  // Fetch student data when selectedStudentId changes
  const { data: fetchedStudentData, loading: fetchingStudent } = useFetchObject<any>({
    queryKey: ['student', selectedStudentId],
    endpoint: selectedStudentId ? `students/${selectedStudentId}/` : '',
    enabled: !!selectedStudentId && !studentData,
  });

  useEffect(() => {
    if (fetchedStudentData) {
      setStudentData(fetchedStudentData);
      if (fetchedStudentData.class_level) {
        setSelectedLevel(fetchedStudentData.class_level?.id?.toString() || 'all');
      }
    }
  }, [fetchedStudentData]);

  useEffect(() => {
    if (isSuccess) {
      navigate('/student-payments');
    }
  }, [isSuccess, navigate]);

  const formatCurrency = (amount: number | string | undefined, currency: string = 'AFN') => {
    const val = typeof amount === 'string' ? parseFloat(amount) || 0 : (amount ?? 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(val);
  };

  useEffect(() => {
    if (data) {
      const periodM = data.period_month ? String(data.period_month).padStart(2, '0') : (new Date().getMonth() + 1).toString().padStart(2, '0');
      
      // Parse period_months array if it exists, otherwise use period_month
      let monthsArray: string[] = [];
      if (data.period_months && Array.isArray(data.period_months)) {
        monthsArray = data.period_months.map((m: string) => String(m).padStart(2, '0'));
      } else if (periodM) {
        monthsArray = [periodM];
      }
      
      // Parse fee_type - it might be an object or just an ID
      let feeTypeId = '';
      if (data.fee_type_details) {
        feeTypeId = String(data.fee_type_details.id);
      } else if (data.fee_type) {
        feeTypeId = String(data.fee_type);
      }
      
      setFormData({
        assignment: data.assignment?.toString() || '',
        class_level: data.assignment_details?.class_level || 'all',
        amount: data.amount?.toString() || '',
        currency: data.currency?.toString() || 'AFN',
        payment_date: data.payment_date ? data.payment_date.slice(0, 10) : new Date().toISOString().split('T')[0],
        payment_status: data.payment_status || 'pending',
        period_year: data.period_year || new Date().getFullYear().toString(),
        period_month: periodM,
        fee_type: feeTypeId,
        reference_number: data.reference_number || '',
        description: data.description || '',
        receipt: undefined,
      });
      // set selectedAssignment from returned assignment_details when available
      if (data.assignment_details) {
        setSelectedAssignment({ ...data.assignment_details, id: data.assignment });
        if (data.assignment_details.payment_plan) setMaxMonths(Number(data.assignment_details.payment_plan));
        // Get student info from assignment
        if (data.assignment_details.student) {
          setSelectedStudent(data.assignment_details.student);
          setSelectedLevel(data.assignment_details.class_level || 'all');
        }
      }
      setPeriodMonths(monthsArray);
      setEditingMonthly(monthsArray.length === 1);
    }
  }, [data]);

  // Get fee types for student when editing
  useEffect(() => {
    if (selectedAssignment) {
      setFeeTypes(selectedAssignment.fee_type ? [selectedAssignment.fee_type] : []);
    } else if (formData.assignment) {
      // fetch the assignment details if not set
      fetch(`/api/student-fee-assignments/${formData.assignment}/`)
        .then((res) => res.json())
        .then((data) => setFeeTypes(data.fee_type ? [data.fee_type] : []))
        .catch(() => setFeeTypes([]));
    } else {
      setFeeTypes([]);
    }
  }, [formData.assignment, selectedAssignment]);

  // Determine max months allowed based on assignment.payment_plan when a specific fee_type is selected
  useEffect(() => {
    // derive maxMonths from selectedAssignment when available
    if (selectedAssignment && selectedAssignment.payment_plan) {
      setMaxMonths(Number(selectedAssignment.payment_plan));
    }
  }, [selectedAssignment]);

  useEffect(() => {
    // fetch assignment details when assignment id present but not loaded
    if (!formData.assignment) {
      setSelectedAssignment(null);
      return;
    }
    if (selectedAssignment && String(selectedAssignment.id) === String(formData.assignment)) return;
    fetch(`/api/student-fee-assignments/${formData.assignment}/`)
      .then((res) => res.json())
      .then((data) => {
        setSelectedAssignment(data);
        if (data.student?.currency) setFormData((prev) => ({ ...prev, currency: data.student.currency }));
        if (data.payment_plan) setMaxMonths(Number(data.payment_plan));
      })
      .catch(() => {});
  }, [formData.assignment]);

  const { data: financialInfo } = useFetchObject<any>({
    queryKey: ['student-financial-info', formData.assignment, formData.class_level, formData.period_month, formData.period_year, formData.fee_type],
    endpoint: `student-payments/financial_info/?assignment=${formData.assignment}&class_level=${formData.class_level || 'all'}&month=${formData.period_month || new Date().getMonth() + 1}&year=${formData.period_year}&fee_type=${formData.fee_type || ''}`,
    enabled: !!formData.assignment && !!formData.period_month,
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.assignment) newErrors.assignment = t('student-payments.validation.student');
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = t('student-payments.validation.amount');
    if (!formData.payment_date) newErrors.payment_date = t('student-payments.validation.paymentDate');
    if (!formData.payment_status) newErrors.payment_status = t('student-payments.validation.paymentStatus');
    if (periodMonths.length === 0) {
      newErrors.period_months = 'Select at least one month';
    }
    if (!formData.period_year) {
      newErrors.period_year = 'Year is required';
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
    
    // Send period_months array to API (required)
    if (periodMonths.length > 0) {
      formDataObj.append('period_months', JSON.stringify(periodMonths));
    } else {
      // Fallback to period_month if no months selected
      formDataObj.append('period_month', formData.period_month);
    }
    // allocation mode
    formDataObj.append('allocation_mode', allocationMode);
    if (allocationMode === 'per_fee') {
      formDataObj.append('allocations', JSON.stringify(allocations || {}));
    }
    
    handleUpdate(id, formDataObj);
  };

  const isYearly = false;
  const monthsCount = periodMonths.length;
  
  const selectedMonthsList = getCalendarMonths(calendarType).filter((m) => periodMonths.includes(m.value));

  if (fetching) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/student-payments')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-bold">{t('student-payments.editPayment')}</h1>
      </div>

      <Card className="border-t-4 border-t-indigo-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-indigo-600" />
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
                onChange={(value) => {
                  if (value && value.id) {
                    setSelectedStudentId(value.id.toString());
                    setStudentData(null);
                    setFormData(prev => ({ ...prev, student: value.id.toString(), class_level: '' }));
                    setSelectedLevel('all');
                  } else {
                    setSelectedStudentId(null);
                    setStudentData(null);
                    setFormData(prev => ({ ...prev, student: '', class_level: '' }));
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
                  setFormData(prev => ({ ...prev, class_level: value, assignment: '' }));
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

          {selectedAssignment && (
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-4 py-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-800 dark:text-indigo-200 uppercase tracking-wide">
                <Info className="h-3.5 w-3.5" />
                {t('student-payments.financialInfo', 'Financial Information')}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">{t('students.feeCurrency')}</div>
                  <div className="text-sm font-bold">{selectedAssignment.student?.currency || 'AFN'}</div>
                </div>
                <div className="bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">{t('students.totalPaid', 'Total Paid')}</div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(selectedAssignment.student?.total_paid ?? 0, selectedAssignment.student?.currency || 'AFN')}
                  </div>
                </div>
                <div className="bg-indigo-100/60 dark:bg-indigo-800/30 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">{t('students.remainingBalance', 'Balance Due')}</div>
                  <div className="text-sm font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(selectedAssignment.student?.remaining_balance ?? 0, selectedAssignment.student?.currency || 'AFN')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {financialInfo && formData.period_month && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-blue-200 uppercase tracking-wide">
                <DollarSign className="h-3.5 w-3.5" />
                {t('student-payments.periodFinancialInfo', 'Period Financial Info')}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">{t('student-payments.totalAmount', 'Total Amount')}</div>
                  <div className="text-sm font-bold">{formatCurrency(financialInfo.total_amount, financialInfo.currency)}</div>
                </div>
                <div className="bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">{t('student-payments.paidAmount', 'Paid Amount')}</div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(financialInfo.paid_amount, financialInfo.currency)}</div>
                </div>
                <div className="bg-indigo-100/60 dark:bg-indigo-800/30 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">{t('student-payments.remainingAmount', 'Remaining Amount')}</div>
                  <div className={`text-sm font-bold ${financialInfo.remaining_amount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {formatCurrency(financialInfo.remaining_amount, financialInfo.currency)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fee Breakdown Section */}
          {financialInfo && financialInfo.fee_breakdown && financialInfo.fee_breakdown.length > 0 && (
            <div className="rounded-xl border bg-muted/30 px-4 py-3 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {t('student-payments.feeBreakdown', 'Fee Breakdown by Type')}
              </div>
              <div className="space-y-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs table-fixed">
                      <thead>
                        <tr className="bg-muted/20 text-muted-foreground">
                          <th className="p-2 text-left">{t('students.feeType')}</th>
                          <th className="p-2 text-left">{t('students.feeCategory')}</th>
                          <th className="p-2 text-right">{t('student-payments.totalAmount')}</th>
                          <th className="p-2 text-right">{t('student-payments.paidAmount')}</th>
                          <th className="p-2 text-right">{t('student-payments.remainingAmount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financialInfo.fee_breakdown.map((fee: any, idx: number) => (
                          <tr key={idx} className="border-b">
                            <td className="p-2 align-top">{fee.fee_type}</td>
                            <td className="p-2 align-top text-muted-foreground text-[11px]">{t(`student-payments.feeCategories.${fee.fee_category}`, fee.fee_category)}</td>
                            <td className="p-2 text-right font-medium">{formatCurrency(fee.amount, fee.currency)}</td>
                            <td className="p-2 text-right text-emerald-600">{formatCurrency(fee.paid_amount, fee.currency)}</td>
                            <td className={`p-2 text-right font-medium ${parseFloat(fee.remaining_amount || '0') > 0 ? 'text-red-600' : 'text-emerald-600' }`}>{formatCurrency(fee.remaining_amount, fee.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold bg-muted/10">
                          <td className="p-2">{t('common.totals', 'Totals')}</td>
                          <td className="p-2" />
                          <td className="p-2 text-right">{formatCurrency(financialInfo.fee_breakdown.reduce((s: number, f: any) => s + (parseFloat(f.amount) || 0), 0), financialInfo.currency)}</td>
                          <td className="p-2 text-right text-emerald-600">{formatCurrency(financialInfo.fee_breakdown.reduce((s: number, f: any) => s + (parseFloat(f.paid_amount) || 0), 0), financialInfo.currency)}</td>
                          <td className="p-2 text-right">{formatCurrency(financialInfo.fee_breakdown.reduce((s: number, f: any) => s + (parseFloat(f.remaining_amount) || 0), 0), financialInfo.currency)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('student-payments.amount')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                disabled={!!selectedAssignment}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, amount: e.target.value }));
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
                }}
                placeholder={t('student-payments.enterAmount')}
                className="h-10"
              />
              {selectedAssignment && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t('students.monthlyFeeLabel', 'Fee')}: {formatCurrency(isYearly ? (selectedAssignment.student?.yearly_fee ?? 0) : (selectedAssignment.student?.monthly_fee ?? selectedAssignment.amount ?? 0), formData.currency)}
                </p>
              )}
              {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('student-payments.currency')}
              </Label>
              <Select value={formData.currency} disabled
                onValueChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AFN">AFN (؋)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t('students.feeCurrency')} — {formData.currency}</p>
            </div>
          </div>

          {feeTypes.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="fee_type" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('student-payments.feeType', 'Fee Type')}
                <span className="ml-1 text-muted-foreground/60 text-[10px] font-normal">({t('common.optional')})</span>
              </Label>
              <Select value={formData.fee_type || ''}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, fee_type: value }))}>
                <SelectTrigger className="h-10"><SelectValue placeholder={t('student-payments.selectFeeType')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('student-payments.allAssignments', 'All Assignments (Split across assignments)')}</SelectItem>
                  {feeTypes.map((feeType) => (
                    <SelectItem key={feeType.id} value={feeType.id.toString()}>
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
                {t('student-payments.feeTypeHelp', 'Select a specific fee type to assign this payment to. Leave empty to split the amount across active assignments for the student.')}
              </p>
            </div>
          )}

          {/* Quick month presets based on selected assignment.payment_plan */}
          {maxMonths && Number(maxMonths) > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold">{t('student-payments.quickMonthSelect', 'Quick month selection')}</div>
              <div className="flex flex-wrap gap-2">
                {([1,2,3,5,12] as number[]).filter(n => n <= Number(maxMonths)).map((n) => (
                  <button
                    key={`preset-${n}`}
                    type="button"
                    onClick={() => {
                      const start = parseInt(formData.period_month || (new Date().getMonth() + 1).toString(), 10);
                      const months: string[] = [];
                      for (let i = 0; i < n; i++) {
                        const v = ((start - 1 + i) % 12) + 1;
                        months.push(String(v).padStart(2, '0'));
                      }
                      setPeriodMonths(months);
                    }}
                    className="px-2.5 py-1 text-xs rounded-md border bg-background hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-900/30 transition-colors"
                  >
                    {n} {t('students.months')}
                  </button>
                ))}
                {Number(maxMonths) > 0 && ![1,2,3,5,12].includes(Number(maxMonths)) && (
                  <button
                    type="button"
                    onClick={() => {
                      const n = Number(maxMonths);
                      const start = parseInt(formData.period_month || (new Date().getMonth() + 1).toString(), 10);
                      const months: string[] = [];
                      for (let i = 0; i < n; i++) {
                        const v = ((start - 1 + i) % 12) + 1;
                        months.push(String(v).padStart(2, '0'));
                      }
                      setPeriodMonths(months);
                    }}
                    className="px-2.5 py-1 text-xs rounded-md border bg-background hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-900/30 transition-colors"
                  >
                    {t('student-payments.upToNMonths', { n: maxMonths })}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* payment interval removed — month selection is driven by assignment.payment_plan */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="payment_date" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('student-payments.paymentDate')} <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                value={formData.payment_date}
                onChange={(date) => { setFormData((prev) => ({ ...prev, payment_date: date?.toISOString().slice(0, 10) || '' })); if (errors.payment_date) setErrors((prev) => ({ ...prev, payment_date: '' })); }}
                className="h-10"
              />
              {errors.payment_date && <p className="text-xs text-destructive mt-1">{errors.payment_date}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment_status" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('student-payments.paymentStatus')} <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.payment_status}
                onValueChange={(value) => { setFormData((prev) => ({ ...prev, payment_status: value })); if (errors.payment_status) setErrors((prev) => ({ ...prev, payment_status: '' })); }}>
                <SelectTrigger className="h-10"><SelectValue placeholder={t('student-payments.selectStatus')} /></SelectTrigger>
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

          <div className="rounded-xl border bg-muted/30 px-4 py-3 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <CalendarIcon className="h-3.5 w-3.5" />
              {t('student-payments.periodCoverage', 'Period Coverage')}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="period_year" className="text-xs font-medium">
                  {t('student-payments.periodYear', 'Period Year')} {isYearly && <span className="text-destructive">*</span>}
                </Label>
                <select
                  id="period_year"
                  value={formData.period_year}
                  onChange={(e) => setFormData((prev) => ({ ...prev, period_year: e.target.value }))}
                  className="h-10 w-full rounded border px-3"
                >
                  {getYearsArray(calendarType, 11).map((y) => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
                {errors.period_year && <p className="text-xs text-destructive mt-1">{errors.period_year}</p>}
              </div>

              {!isYearly && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium">
                    {t('student-payments.periodMonth', 'Period Month')} {monthsCount > 0 && (
                      <span className="ml-1.5 text-muted-foreground font-normal">
                        ({monthsCount} selected)
                      </span>
                    )}
                  </Label>
                  {monthsCount === 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                                  {getCalendarMonths(calendarType).map((m) => (
                                    <button
                                      key={m.value}
                                      type="button"
                                      onClick={() => {
                                        const limit = maxMonths ?? 1;
                                        if (periodMonths.length >= limit) {
                                          setErrors((prev) => ({ ...prev, period_months: `You can select at most ${limit} month(s) for this fee.` }));
                                          return;
                                        }
                                        setPeriodMonths([...periodMonths, m.value]);
                                      }}
                                      className="px-2.5 py-1 text-xs rounded-md border bg-background hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-900/30 transition-colors"
                                    >
                                      {m.label}
                                    </button>
                                  ))}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1.5">
                        {selectedMonthsList.map((m) => (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => setPeriodMonths(periodMonths.filter(p => p !== m.value))}
                            className="px-2.5 py-1 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1"
                          >
                            {m.label}
                            <span className="opacity-70">×</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setPeriodMonths([])}
                          className="px-2 py-1 text-xs rounded-md border text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          Clear all
                        </button>
                      </div>
                    </div>
                  )}
                  {errors.period_months && <p className="text-xs text-destructive mt-1">{errors.period_months}</p>}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reference_number" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t('student-payments.referenceNumber', 'Reference Number')}
            </Label>
            <Input id="reference_number" value={formData.reference_number}
              onChange={(e) => setFormData((prev) => ({ ...prev, reference_number: e.target.value }))}
              placeholder={t('student-payments.referenceNumberPlaceholder', 'e.g. BANK-2026-001')} className="h-10" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t('student-payments.description')}
            </Label>
            <Textarea id="description" value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t('student-payments.enterDescription')} className="h-20" />
          </div>

          {formData.receipt && (
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
              <p className="text-[10px] text-muted-foreground">
                Current: {formData.receipt.name}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => navigate('/student-payments')} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="gap-2">
              {loading ? (
                <><RotateCw className="h-4 w-4 animate-spin" />{t('common.updating')}</>
              ) : t('common.update')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const getCalendarMonths = (calendarType: any, lang: 'fa' | 'ps' = 'fa') =>
  getMonthNames(calendarType, lang).map((label, i) => ({ value: (i + 1).toString(), label }));

export default EditStudentPayment;
