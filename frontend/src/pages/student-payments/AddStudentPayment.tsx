import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Autocomplete } from '@/components/ui/autocomplete';
import { useLanguage } from '@/contexts/LanguageContext';
import { RotateCw, ArrowLeft, User, CreditCard, Calendar as CalendarIcon, DollarSign, Info } from 'lucide-react';
import useAdd from '@/api/useAdd';
import useFetchObject from '@/api/useFetchObject';
import DatePicker from '@/components/ui/date-picker-calendar';

interface StudentPaymentFormData {
  student: string;
  class_level: string;
  amount: string;
  currency: string;
  payment_date: string;
  payment_status: string;
  payment_cycle: string;
  period_year: string;
  period_month: string;
  period_months: string[];
  reference_number?: string;
  description?: string;
}

interface StudentInfo {
  id: string | number;
  full_name: string;
  payment_cycle?: string;
  currency?: string;
  monthly_fee?: number | string;
  yearly_fee?: number | string;
  class_level?: { name?: string } | null;
  total_paid?: number | string;
  remaining_balance?: number | string;
}

const defaultForm: StudentPaymentFormData = {
  student: '',
  class_level: 'all',
  amount: '',
  currency: 'AFN',
  payment_date: new Date().toISOString().split('T')[0],
  payment_status: 'completed',
  payment_cycle: 'monthly',
  period_year: new Date().getFullYear().toString(),
  period_month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
  period_months: [(new Date().getMonth() + 1).toString().padStart(2, '0')],
  reference_number: '',
  description: '',
};

const months = Array.from({ length: 12 }, (_, i) => ({
  value: (i + 1).toString(),
  label: new Date(0, i).toLocaleString('default', { month: 'long' }),
}));

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
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);

  const { handleAdd, loading, isSuccess } = useAdd<StudentPaymentFormData>({
    queryKey: ['student-payments'],
    endpoint: 'student-payments/',
  });

  // Fetch financial info based on student and selected month
  const firstMonth = formData.period_months[0];
  const { data: financialInfo, refetch: refetchFinancialInfo } = useFetchObject<any>({
    queryKey: ['student-financial-info', formData.student, firstMonth || formData.period_month, formData.period_year],
    endpoint: `student-payments/financial_info/?student=${formData.student}&month=${firstMonth || formData.period_month || new Date().getMonth() + 1}&year=${formData.period_year}`,
    enabled: !!formData.student && !!(firstMonth || formData.period_month),
  });

  // Fetch student info when a student is selected
  useEffect(() => {
    if (!formData.student) {
      setSelectedStudent(null);
      return;
    }
    setLoadingStudent(true);
    fetch(`/api/students/${formData.student}/`)
      .then((res) => res.json())
      .then((data) => {
        setSelectedStudent(data);
        // Auto-fill + lock currency and payment cycle from the student's profile
        if (data.currency) {
          setFormData((prev) => ({ ...prev, currency: data.currency }));
        }
        if (data.payment_cycle) {
          setFormData((prev) => ({ ...prev, payment_cycle: data.payment_cycle }));
        }
        setLoadingStudent(false);
      })
      .catch(() => setLoadingStudent(false));
  }, [formData.student]);

  // When cycle changes to yearly, clear monthly month selection
  // handled inline in onValueChange to avoid eslint react-hooks/exhaustive-deps warning

  // Navigate on success
  useEffect(() => {
    if (isSuccess) {
      navigate('/student-payments');
    }
  }, [isSuccess, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.student) newErrors.student = t('student-payments.validation.student');
    if (!formData.amount || parseFloat(formData.amount) <= 0)
      newErrors.amount = t('student-payments.validation.amount');
    if (!formData.payment_date) newErrors.payment_date = t('student-payments.validation.paymentDate');
    if (!formData.payment_status) newErrors.payment_status = t('student-payments.validation.paymentStatus');
    if (formData.payment_cycle === 'monthly' && formData.period_months.length === 0) {
      newErrors.period_months = 'Select at least one month';
    }
    if (formData.payment_cycle === 'yearly' && !formData.period_year) {
      newErrors.period_year = 'Year is required for yearly cycle';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    // For multi-month, set period_month to first selected month (or leave empty)
    const payload = { ...formData };
    if (formData.payment_cycle === 'monthly' && formData.period_months.length > 1) {
      payload.period_month = formData.period_months[0];
    }
    handleAdd(payload);
  };

  const toggleMonth = (value: string) => {
    setFormData((prev) => {
      const has = prev.period_months.includes(value);
      return {
        ...prev,
        period_months: has
          ? prev.period_months.filter((m) => m !== value)
          : [...prev.period_months, value],
      };
    });
  };

  const cycleIsYearly = formData.payment_cycle === 'yearly';
  const selectedMonthsList = useMemo(
    () => months.filter((m) => formData.period_months.includes(m.value)),
    [formData.period_months]
  );
  const monthsCount = formData.period_months.length;

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      {/* ── Header ── */}
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

          {/* ── Class Level Filter ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="class_level" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('students.classLevel', 'Class Level')}
              </Label>
              <Select
                value={formData.class_level}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, class_level: value, student: '' }));
                  setSelectedStudent(null);
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t('students.selectClassLevel', 'Select Class Level')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
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

            {/* ── Student ── */}
            <div className="space-y-1.5">
              <Label htmlFor="student" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('student-payments.student')} <span className="text-destructive">*</span>
              </Label>
              <Autocomplete
                endpoint={formData.class_level && formData.class_level !== 'all' ? `students?class_level=${formData.class_level}` : 'students'}
                value={formData.student}
                onChange={(value) => {
                  setFormData((prev) => ({ ...prev, student: value }));
                  if (errors.student) setErrors((prev) => ({ ...prev, student: '' }));
                }}
                placeholder={t('student-payments.selectStudent')}
                getOptionLabel={(s) => s.full_name}
                getOptionValue={(s) => s.id.toString()}
              />
              {errors.student && <p className="text-xs text-destructive mt-1">{errors.student}</p>}
            </div>
          </div>

          {/* ── Student Finance Banner ── */}
          {loadingStudent && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RotateCw className="h-4 w-4 animate-spin" /> Loading student data…
            </div>
          )}
          {selectedStudent && !loadingStudent && (
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-4 py-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-800 dark:text-indigo-200 uppercase tracking-wide">
                <Info className="h-3.5 w-3.5" />
                {t('student-payments.financialInfo', 'Financial Information')}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <FinanceBox
                  label={t('students.feeCurrency')}
                  value={selectedStudent.currency || 'AFN'}
                />
                <FinanceBox
                  label={t('students.paymentCycle')}
                  value={
                    <Badge variant="secondary" className="text-[10px]">
                      {selectedStudent.payment_cycle === 'yearly'
                        ? t('students.paymentCycleOptions.yearly', 'Yearly')
                        : t('students.paymentCycleOptions.monthly', 'Monthly')}
                    </Badge>
                  }
                />
                <FinanceBox
                  label={t('students.totalPaid', 'Total Paid')}
                  value={formatCurrency(selectedStudent.total_paid ?? 0, selectedStudent.currency || 'AFN')}
                  valueClass="text-emerald-600 dark:text-emerald-400"
                />
                <FinanceBox
                  label={t('students.remainingBalance', 'Balance Due')}
                  value={formatCurrency(selectedStudent.remaining_balance ?? 0, selectedStudent.currency || 'AFN')}
                  highlight
                  valueClass="text-red-600 dark:text-red-400"
                />
              </div>
            </div>
          )}
          
          {/* ── Period Financial Info ── */}
          {financialInfo && (formData.period_months.length > 0 || formData.period_month) && (
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

          {/* ── Amount & Currency (locked from student) ── */}
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
                  disabled={!!selectedStudent}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, amount: e.target.value }));
                    if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
                  }}
                  placeholder={t('student-payments.enterAmount')}
                  className="h-10 pl-9"
                />
              </div>
              {selectedStudent && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t('students.monthlyFeeLabel', 'Fee')}: {formatCurrency(
                    cycleIsYearly ? (selectedStudent.yearly_fee ?? 0) : (selectedStudent.monthly_fee ?? 0),
                    formData.currency
                  )}
                </p>
              )}
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

          {/* ── Payment Date, Status & Cycle ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div className="space-y-1.5">
              <Label htmlFor="payment_cycle" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('student-payments.paymentCycle')}
              </Label>
              <Select
                value={formData.payment_cycle}
                disabled={!!selectedStudent}
                onValueChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    payment_cycle: value,
                    period_months: value === 'yearly' ? [] : prev.period_months,
                  }));
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={t('student-payments.selectCycle')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">
                    <span className="flex items-center gap-1.5">
                      {t('students.paymentCycleOptions.monthly', 'Monthly')}
                      <Badge variant="outline" className="text-[10px] h-4 ml-1">Per Month</Badge>
                    </span>
                  </SelectItem>
                  <SelectItem value="yearly">
                    <span className="flex items-center gap-1.5">
                      {t('students.paymentCycleOptions.yearly', 'Yearly')}
                      <Badge variant="outline" className="text-[10px] h-4 ml-1">Per Year</Badge>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Period Coverage ── */}
          <div className="rounded-xl border bg-muted/30 px-4 py-3 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <CalendarIcon className="h-3.5 w-3.5" />
              {t('student-payments.periodCoverage', 'Period Coverage')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="period_year" className="text-xs font-medium">
                  {t('student-payments.periodYear', 'Period Year')} {cycleIsYearly && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="period_year"
                  type="number"
                  min="2000"
                  max="2100"
                  value={formData.period_year}
                  onChange={(e) => setFormData((prev) => ({ ...prev, period_year: e.target.value }))}
                  placeholder={t('student-payments.periodYearPlaceholder', 'e.g. 2026')}
                  className="h-10"
                />
                {errors.period_year && <p className="text-xs text-destructive mt-1">{errors.period_year}</p>}
              </div>

              {!cycleIsYearly && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium">
                    {t('student-payments.periodMonth', 'Period Month')} <span className="text-destructive">*</span>
                    {monthsCount > 0 && (
                      <span className="ml-1.5 text-muted-foreground font-normal">
                        ({monthsCount} selected)
                      </span>
                    )}
                  </Label>
                  {monthsCount === 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {months.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => toggleMonth(m.value)}
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
                            onClick={() => toggleMonth(m.value)}
                            className="px-2.5 py-1 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1"
                          >
                            {m.label}
                            <span className="opacity-70">×</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, period_months: [] }))}
                          className="px-2 py-1 text-xs rounded-md border text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          Clear all
                        </button>
                      </div>
                      {formData.amount && (
                        <div className="flex items-center gap-2 text-xs border-t pt-2 mt-1">
                          <span className="text-muted-foreground">{t('student-payments.summary', 'Summary')}:</span>
                          <span className="font-medium">{monthsCount} month{monthsCount > 1 ? 's' : ''} =</span>
                          <span className="font-bold text-indigo-700 dark:text-indigo-400">
                            {formatCurrency(
                              parseFloat(formData.amount || '0') * monthsCount,
                              formData.currency
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {errors.period_months && <p className="text-xs text-destructive mt-1">{errors.period_months}</p>}
                </div>
              )}
            </div>
          </div>

          {/* ── Reference & Description ── */}
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
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t('student-payments.enterDescription')}
              className="h-10"
            />
          </div>

          {/* ── Fee summary ── */}
          {formData.amount && formData.payment_cycle === 'monthly' && monthsCount > 0 && (
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

          {/* ── Actions ── */}
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
