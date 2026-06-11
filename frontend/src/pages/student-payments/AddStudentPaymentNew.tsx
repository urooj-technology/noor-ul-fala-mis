import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Autocomplete } from '@/components/ui/autocomplete';
import { useLanguage } from '@/contexts/LanguageContext';
import { RotateCw, ArrowLeft, DollarSign, Info, Check, ChevronDown, X, AlertCircle } from 'lucide-react';
import { useCalendar } from '@/contexts/CalendarContext';
import { getMonthNames } from '@/utils/calendar';
import { useToast } from '@/components/ui/use-toast';
import useFetchObjects from '@/api/useFetchObjects';
import useAdd from '@/api/useAdd';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import DatePicker from '@/components/ui/date-picker-calendar';

interface FeeAssignment {
  id: number;
  fee_type: number | null;
  fee_type_details?: { id: number; name: string; code: string; category: string };
  amount: string;
  currency: string;
  paid_amount: string;
  remaining_amount: string;
  payment_plan: number;
}

interface Student {
  id: number;
  full_name: string;
  registration_number: string;
  class_level?: number | null;
  class_level_details?: { id: number; name: string; level: string };
  currency: string;
  total_paid?: string;
  remaining_balance?: string;
}

interface PaymentEntry {
  assignment_id: number;
  fee_type_name: string;
  amount: string;
  paid: string;
  remaining: string;
  payment_plan: number;
  selected_months: string[];
  payment_amount: string;
  currency: string;
  paid_months: string[];
}

const getCalendarMonths = (calendarType: any, lang: 'fa' | 'ps' = 'fa') =>
  getMonthNames(calendarType, lang).map((label, i) => ({ value: (i + 1).toString().padStart(2, '0'), label }));

function formatCurrency(amount: number | string | undefined, currency: string = 'AFN') {
  const val = typeof amount === 'string' ? parseFloat(amount) || 0 : (amount ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(val);
}

// Multi-select month dropdown
const MonthMultiSelect: React.FC<{
  months: { value: string; label: string }[];
  selectedMonths: string[];
  maxMonths: number;
  disabled?: boolean;
  paidMonths: string[];
  onToggle: (monthValue: string) => void;
  currency: string;
  paymentAmount: string;
}> = ({ months, selectedMonths, maxMonths, disabled, paidMonths, onToggle, currency, paymentAmount }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between h-8 text-xs font-normal hover:bg-muted/50"
          >
            <span className="truncate">
              {selectedMonths.length === 0
                ? 'Select months…'
                : selectedMonths.length === 1
                ? months.find(m => m.value === selectedMonths[0])?.label
                : `${selectedMonths.length} months`}
            </span>
            <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start" sideOffset={4}>
          <Command>
            <CommandInput placeholder="Search month…" className="h-8 text-xs" />
            <CommandList>
              <CommandEmpty>No month found.</CommandEmpty>
              <CommandGroup>
                <ScrollArea className="max-h-[200px]">
                  {months.map((month) => {
                    const isSelected = selectedMonths.includes(month.value);
                    const isPaid = paidMonths.includes(month.value);
                    const wouldExceed = !isSelected && selectedMonths.length >= maxMonths;
                    return (
                      <CommandItem
                        key={month.value}
                        value={month.label}
                        disabled={wouldExceed || isPaid}
                        onSelect={() => {
                          if (!wouldExceed && !isPaid) onToggle(month.value);
                        }}
                        className="flex items-center gap-2 text-xs cursor-pointer"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : isPaid
                              ? 'bg-blue-500 border-blue-500 text-white'
                              : 'border-muted-foreground/40'
                          }`}
                        >
                          {(isSelected || isPaid) && <Check className="h-3 w-3" />}
                        </span>
                        <span className="flex-1">{month.label}</span>
                        {isPaid && <Badge variant="outline" className="text-[9px] text-blue-600">Paid</Badge>}
                      </CommandItem>
                    );
                  })}
                </ScrollArea>
              </CommandGroup>
            </CommandList>
          </Command>
          {selectedMonths.length > 0 && (
            <>
              <Separator />
              <div className="px-3 py-2 flex flex-wrap gap-1">
                {selectedMonths.map((mv) => {
                  const ml = months.find((m) => m.value === mv);
                  return (
                    <Badge
                      key={mv}
                      variant="secondary"
                      className="text-[10px] h-5 gap-0.5 pr-1 pl-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200"
                    >
                      {ml?.label}
                      <button
                        className="ml-0.5 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-800 p-0.5"
                        onClick={(e) => { e.stopPropagation(); onToggle(mv); }}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

const AddStudentPayment = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { calendarType } = useCalendar();
  const lang = t('language.code') as 'fa' | 'ps';

  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [feeAssignments, setFeeAssignments] = useState<any[]>([]);
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentYear, setPaymentYear] = useState<string>(new Date().getFullYear().toString());
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Fetch students by level
  const { data: studentsData, isLoading: loadingStudents } = useFetchObjects<{ results: Student[] }>({
    queryKey: ['students-by-level', selectedLevel, 'active'],
    endpoint: 'students',
    enabled: !!selectedLevel,
    params: { class_level: selectedLevel, status: 'active', page_size: 100 },
  });

  const studentsInLevel = studentsData?.results || [];

  // Fetch fee assignments with payment tracking using useFetchObjects
  const { data: feeAssignmentsData, refetch: refetchAssignments } = useFetchObjects<any>({
    queryKey: ['student-fee-assignments-months', selectedStudent?.id, paymentYear],
    endpoint: selectedStudent ? `student-payments/student_fee_assignments_with_months/` : '',
    enabled: !!selectedStudent,
    params: selectedStudent ? { student: selectedStudent.id, year: paymentYear } : {},
  });

  // Update fee assignments when data changes
  useEffect(() => {
    if (feeAssignmentsData?.assignments) {
      setFeeAssignments(feeAssignmentsData.assignments);
      const entries: PaymentEntry[] = feeAssignmentsData.assignments.map((a: any) => ({
        assignment_id: a.id,
        fee_type_name: a.fee_type_details?.name || 'Unknown',
        amount: a.amount,
        paid: a.total_paid || '0',
        remaining: a.remaining_amount || '0',
        payment_plan: a.payment_plan || 1,
        selected_months: [],
        payment_amount: '',
        currency: a.currency,
        paid_months: a.paid_month_values || [],
      }));
      setPaymentEntries(entries);
    }
  }, [feeAssignmentsData]);

  // Toggle month selection
  const toggleMonth = (entryIndex: number, monthValue: string) => {
    setPaymentEntries((prev) => {
      const updated = [...prev];
      const entry = updated[entryIndex];
      const hasMonth = entry.selected_months.includes(monthValue);

      if (!hasMonth && entry.selected_months.length >= entry.payment_plan) {
        toast({ title: 'Limit Reached', description: `This fee allows maximum ${entry.payment_plan} month(s)`, variant: 'destructive' });
        return prev;
      }

      entry.selected_months = hasMonth
        ? entry.selected_months.filter((m) => m !== monthValue)
        : [...entry.selected_months, monthValue].sort();

      return updated;
    });
  };

  // Update payment amount
  const updatePaymentAmount = (entryIndex: number, amount: string) => {
    setPaymentEntries((prev) => {
      const updated = [...prev];
      updated[entryIndex].payment_amount = amount;
      return updated;
    });
  };

  // Calculate total payment
  const totalPayment = useMemo(() => {
    return paymentEntries.reduce((sum, entry) => {
      const amount = parseFloat(entry.payment_amount) || 0;
      const months = entry.selected_months.length || 1;
      return sum + amount * months;
    }, 0);
  }, [paymentEntries]);

  // Submit payments using useAdd hook
  const { handleAdd, loading } = useAdd<any>({
    queryKey: ['student-payments'],
    endpoint: 'student-payments/create_payments',
    customSuccessMessage: 'Payments created successfully',
  });

  const handleSubmit = async () => {
    const validEntries = paymentEntries.filter((e) => e.selected_months.length > 0 && parseFloat(e.payment_amount) > 0);

    if (validEntries.length === 0) {
      toast({ title: 'Validation Error', description: 'Please select at least one fee with months and amount', variant: 'destructive' });
      return;
    }

    // Validate payments don't exceed remaining balance
    for (const entry of validEntries) {
      const remaining = parseFloat(entry.remaining);
      const paying = parseFloat(entry.payment_amount) * entry.selected_months.length;
      if (paying > remaining) {
        toast({ title: 'Overpayment Error', description: `Payment for ${entry.fee_type_name} exceeds remaining balance`, variant: 'destructive' });
        return;
      }
    }

    // Prepare payments data for single API call
    const paymentsData = validEntries.map((entry) => ({
      assignment_id: entry.assignment_id,
      amount: parseFloat(entry.payment_amount),
      period_months: entry.selected_months,
    }));

    const submitData = {
      student: selectedStudent.id,
      payment_date: paymentDate,
      period_year: paymentYear,
      currency: validEntries[0]?.currency || currency,
      payment_status: 'completed',
      reference_number: referenceNumber,
      description: description,
      payments: paymentsData,
    };

    handleAdd(submitData);

    // Reset form after successful submission
    setTimeout(() => {
      setPaymentEntries((prev) => prev.map((e) => ({ ...e, selected_months: [], payment_amount: '' })));
      setReferenceNumber('');
      setDescription('');
      refetchAssignments();
    }, 500);
  };

  const months = getCalendarMonths(calendarType, lang);

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-screen-2xl px-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/student-payments')} className="rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-bold">{t('student-payments.addPayment', 'Add Student Payment')}</h1>
      </div>

      {/* Step 1: Select Level & Student */}
      <Card className="border-t-4 border-t-indigo-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs">1</span>
            {t('students.selectLevelAndStudent', 'Select Class Level & Student')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('students.classLevel')} <span className="text-destructive">*</span>
              </Label>
              <Autocomplete
                endpoint="class-levels"
                value={selectedLevel}
                onChange={(value) => { setSelectedLevel(value as string); setSelectedStudent(null); setFeeAssignments([]); setPaymentEntries([]); }}
                placeholder={t('students.selectClassLevel')}
                getOptionLabel={(c) => c.name}
                getOptionValue={(c) => c.id.toString()}
              />
            </div>
            {selectedLevel && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('students.student')} <span className="text-destructive">*</span>
                </Label>
                <Autocomplete
                  options={studentsInLevel}
                  value={selectedStudent?.id?.toString() || ''}
                  onChange={(value, option) => { if (option && option.id) setSelectedStudent(option); else setSelectedStudent(null); }}
                  placeholder={loadingStudents ? 'Loading...' : t('students.selectStudent')}
                  getOptionLabel={(s) => `${s.full_name} (${s.registration_number})`}
                  getOptionValue={(s) => s.id.toString()}
                />
              </div>
            )}
          </div>

          {selectedStudent && feeAssignmentsData && (
            <div className="mt-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-800 dark:text-indigo-200 uppercase tracking-wide mb-2">
                <Info className="h-3.5 w-3.5" />
                {t('student-payments.studentFinancialInfo', 'Student Financial Summary')}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div><div className="text-[10px] text-muted-foreground uppercase">{t('students.studentName')}</div><div className="font-medium">{selectedStudent.full_name}</div></div>
                <div><div className="text-[10px] text-muted-foreground uppercase">{t('students.classLevel')}</div><div className="font-medium">{selectedStudent.class_level_details?.name || '-'}</div></div>
                <div><div className="text-[10px] text-muted-foreground uppercase">{t('students.totalPaid')}</div><div className="font-medium text-emerald-600">{formatCurrency(feeAssignmentsData.total_paid, feeAssignmentsData.currency)}</div></div>
                <div><div className="text-[10px] text-muted-foreground uppercase">{t('students.remainingBalance')}</div><div className="font-bold text-red-600">{formatCurrency(feeAssignmentsData.total_remaining, feeAssignmentsData.currency)}</div></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Fee Assignments & Payment */}
      {selectedStudent && paymentEntries.length > 0 && (
        <Card className="border-t-4 border-t-emerald-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs">2</span>
              {t('student-payments.feeAssignments', 'Fee Assignments & Payment')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30 text-muted-foreground border-b">
                    <th className="p-2.5 text-left whitespace-nowrap">{t('students.feeType')}</th>
                    <th className="p-2.5 text-right whitespace-nowrap">{t('student-payments.amount')}</th>
                    <th className="p-2.5 text-right whitespace-nowrap">{t('student-payments.paidAmount')}</th>
                    <th className="p-2.5 text-right whitespace-nowrap">{t('student-payments.remainingAmount')}</th>
                    <th className="p-2.5 text-center whitespace-nowrap">{t('students.paymentPlan')}</th>
                    <th className="p-2.5 text-center whitespace-nowrap min-w-[180px]">{t('student-payments.selectMonths')}</th>
                    <th className="p-2.5 text-right whitespace-nowrap min-w-[120px]">{t('student-payments.paymentAmount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentEntries.map((entry, index) => {
                    const remaining = parseFloat(entry.remaining);
                    const isPaid = remaining <= 0;
                    const monthCount = entry.selected_months.length;
                    const totalForEntry = (parseFloat(entry.payment_amount) || 0) * monthCount;

                    return (
                      <tr key={entry.assignment_id} className={`border-b transition-colors ${isPaid ? 'bg-muted/20' : 'hover:bg-muted/10'}`}>
                        <td className="p-2.5 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {entry.fee_type_name}
                            {isPaid && <Badge variant="outline" className="text-emerald-600 text-[10px]">{t('common.paid')}</Badge>}
                          </div>
                        </td>
                        <td className="p-2.5 text-right whitespace-nowrap">{formatCurrency(entry.amount, entry.currency)}</td>
                        <td className="p-2.5 text-right text-emerald-600 whitespace-nowrap">{formatCurrency(entry.paid, entry.currency)}</td>
                        <td className={`p-2.5 text-right font-medium whitespace-nowrap ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {formatCurrency(entry.remaining, entry.currency)}
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge variant="outline" className="text-[10px]">{entry.payment_plan} {t('students.months', 'mo')}</Badge>
                        </td>
                        <td className="p-2.5">
                          <MonthMultiSelect
                            months={months}
                            selectedMonths={entry.selected_months}
                            maxMonths={entry.payment_plan}
                            disabled={isPaid}
                            paidMonths={entry.paid_months}
                            onToggle={(mv) => toggleMonth(index, mv)}
                            currency={entry.currency}
                            paymentAmount={entry.payment_amount}
                          />
                        </td>
                        <td className="p-2.5">
                          <Input
                            type="number"
                            step="0.01"
                            value={entry.payment_amount}
                            onChange={(e) => updatePaymentAmount(index, e.target.value)}
                            placeholder="0.00"
                            className="h-8 text-xs w-full"
                            disabled={isPaid || entry.selected_months.length === 0}
                          />
                          {monthCount > 0 && entry.payment_amount && (
                            <div className="text-[10px] text-muted-foreground mt-1 text-right font-medium">
                              {formatCurrency(totalForEntry, entry.currency)} ({monthCount} × {formatCurrency(parseFloat(entry.payment_amount) || 0, entry.currency)})
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/20 font-bold">
                    <td className="p-2.5">{t('common.totals', 'Totals')}</td>
                    <td className="p-2.5 text-right">{formatCurrency(paymentEntries.reduce((s, e) => s + parseFloat(e.amount), 0), paymentEntries[0]?.currency || 'AFN')}</td>
                    <td className="p-2.5 text-right text-emerald-600">{formatCurrency(paymentEntries.reduce((s, e) => s + parseFloat(e.paid), 0), paymentEntries[0]?.currency || 'AFN')}</td>
                    <td className="p-2.5 text-right text-red-600">{formatCurrency(paymentEntries.reduce((s, e) => s + parseFloat(e.remaining), 0), paymentEntries[0]?.currency || 'AFN')}</td>
                    <td className="p-2.5" /><td className="p-2.5" />
                    <td className="p-2.5 text-right text-lg">{formatCurrency(totalPayment, paymentEntries[0]?.currency || 'AFN')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Payment Details */}
            {totalPayment > 0 && (
              <div className="mt-6 space-y-4">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium">{t('student-payments.totalPayment')}: <span className="font-bold text-lg ml-2">{formatCurrency(totalPayment, paymentEntries[0]?.currency || 'AFN')}</span></span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('student-payments.paymentDate')}</Label>
                    <DatePicker value={paymentDate} onChange={(date) => setPaymentDate(date?.toISOString().slice(0, 10) || '')} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('student-payments.year', 'Year')}</Label>
                    <Input type="text" value={paymentYear} onChange={(e) => setPaymentYear(e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('student-payments.referenceNumber')}</Label>
                    <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="e.g. PAY-2026-001" className="h-9" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('student-payments.description')}</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes" className="h-9" />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" onClick={() => navigate('/student-payments')} disabled={loading}>{t('common.cancel')}</Button>
                  <Button onClick={handleSubmit} disabled={loading} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                    {loading ? <><RotateCw className="h-4 w-4 animate-spin" />{t('common.processing')}</> : <><Check className="h-4 w-4" />{t('student-payments.createPayments')}</>}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {selectedStudent && paymentEntries.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-sm font-medium">{t('student-payments.noFeeAssignments')}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t('student-payments.noFeeAssignmentsDesc')}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/bulk-fee-assignment')}>{t('students.addFeeAssignment')}</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AddStudentPayment;
