import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { RotateCw, ArrowLeft, Info, DollarSign } from 'lucide-react';
import useUpdate from '@/api/useUpdate';
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

const EditStudentPayment = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<StudentPaymentFormData>({
    student: '',
    class_level: 'all',
    amount: '',
    currency: 'AFN',
    payment_date: new Date().toISOString().split('T')[0],
    payment_status: 'pending',
    payment_cycle: 'monthly',
    period_year: new Date().getFullYear().toString(),
    period_month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    reference_number: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);

  const { id } = useParams();
  const { data, loading: fetching } = useFetchObject({
    queryKey: ['student-payment', id],
    endpoint: `student-payments/${id}/`,
  });

  const { handleUpdate, loading, isSuccess } = useUpdate({
    queryKey: ['student-payments'],
  });

  // Navigate on success
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
      const cycle = data.payment_cycle || 'monthly';
      const periodM = data.period_month ? String(data.period_month).padStart(2, '0') : (new Date().getMonth() + 1).toString().padStart(2, '0');
      setFormData({
        student: data.student?.toString() || '',
        class_level: data.student_details?.class_level?.id?.toString() || 'all',
        amount: data.amount?.toString() || '',
        currency: data.currency?.toString() || 'AFN',
        payment_date: data.payment_date ? data.payment_date.slice(0, 10) : new Date().toISOString().split('T')[0],
        payment_status: data.payment_status || 'pending',
        payment_cycle: cycle,
        period_year: data.period_year || new Date().getFullYear().toString(),
        period_month: periodM,
        reference_number: data.reference_number || '',
        description: data.description || '',
      });
    }
  }, [data]);

  useEffect(() => {
    if (!formData.student) {
      setSelectedStudent(null);
      return;
    }
    fetch(`/api/students/${formData.student}/`)
      .then((res) => res.json())
      .then((data) => {
        setSelectedStudent(data);
        if (data.currency) setFormData((prev) => ({ ...prev, currency: data.currency }));
        if (data.payment_cycle) setFormData((prev) => ({ ...prev, payment_cycle: data.payment_cycle }));
      })
      .catch(() => {});
  }, [formData.student]);

  // Fetch financial info based on student and month
  const { data: financialInfo } = useFetchObject<any>({
    queryKey: ['student-financial-info', formData.student, formData.period_month, formData.period_year],
    endpoint: `student-payments/financial_info/?student=${formData.student}&month=${formData.period_month || new Date().getMonth() + 1}&year=${formData.period_year}`,
    enabled: !!formData.student && !!formData.period_month,
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.student) newErrors.student = t('student-payments.validation.student');
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = t('student-payments.validation.amount');
    if (!formData.payment_date) newErrors.payment_date = t('student-payments.validation.paymentDate');
    if (!formData.payment_status) newErrors.payment_status = t('student-payments.validation.paymentStatus');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    handleUpdate(id, formData);
  };

  const cycleIsYearly = formData.payment_cycle === 'yearly';

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

          {/* ── Class Level & Student ── */}
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
          {selectedStudent && (
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-4 py-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-800 dark:text-indigo-200 uppercase tracking-wide">
                <Info className="h-3.5 w-3.5" />
                {t('student-payments.financialInfo', 'Financial Information')}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">{t('students.feeCurrency')}</div>
                  <div className="text-sm font-bold">{selectedStudent.currency || 'AFN'}</div>
                </div>
                <div className="bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">{t('students.paymentCycle')}</div>
                  <Badge variant="secondary" className="text-[10px]">{cycleIsYearly ? t('students.paymentCycleOptions.yearly', 'Yearly') : t('students.paymentCycleOptions.monthly', 'Monthly')}</Badge>
                </div>
                <div className="bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">{t('students.totalPaid', 'Total Paid')}</div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(selectedStudent.total_paid ?? 0, selectedStudent.currency || 'AFN')}
                  </div>
                </div>
                <div className="bg-indigo-100/60 dark:bg-indigo-800/30 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">{t('students.remainingBalance', 'Balance Due')}</div>
                  <div className="text-sm font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(selectedStudent.remaining_balance ?? 0, selectedStudent.currency || 'AFN')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Period Financial Info ── */}
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

          {/* ── Amount & Currency (locked) ── */}
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
                disabled={!!selectedStudent}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, amount: e.target.value }));
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
                }}
                placeholder={t('student-payments.enterAmount')}
                className="h-10"
              />
              {selectedStudent && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t('students.monthlyFeeLabel', 'Fee')}: {formatCurrency(cycleIsYearly ? (selectedStudent.yearly_fee ?? 0) : (selectedStudent.monthly_fee ?? 0), formData.currency)}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div className="space-y-1.5">
              <Label htmlFor="payment_cycle" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('student-payments.paymentCycle')}
              </Label>
              <Select value={formData.payment_cycle} disabled={!!selectedStudent}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, payment_cycle: value }))}>
                <SelectTrigger className="h-10"><SelectValue placeholder={t('student-payments.selectCycle')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t('students.paymentCycleOptions.monthly', 'Monthly')}</SelectItem>
                  <SelectItem value="yearly">{t('students.paymentCycleOptions.yearly', 'Yearly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="period_year" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('student-payments.periodYear', 'Period Year')}
              </Label>
              <Input id="period_year" type="number" min="2000" max="2100" value={formData.period_year}
                onChange={(e) => setFormData((prev) => ({ ...prev, period_year: e.target.value }))}
                placeholder={t('student-payments.periodYearPlaceholder', 'e.g. 2026')} className="h-10" />
            </div>
            {!cycleIsYearly && (
              <div className="space-y-1.5">
                <Label htmlFor="period_month" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('student-payments.periodMonth', 'Period Month')}
                </Label>
                <Select value={formData.period_month}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, period_month: value }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder={t('student-payments.selectMonth')} /></SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
            <Input id="description" value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t('student-payments.enterDescription')} className="h-10" />
          </div>

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

const months = Array.from({ length: 12 }, (_, i) => ({
  value: (i + 1).toString(),
  label: new Date(0, i).toLocaleString('default', { month: 'long' }),
}));

export default EditStudentPayment;
