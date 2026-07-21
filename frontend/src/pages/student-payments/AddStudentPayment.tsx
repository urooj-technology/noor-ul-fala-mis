import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { RotateCw, ArrowLeft, DollarSign, Info, FileSpreadsheet, Check, ChevronDown, X } from 'lucide-react';
import { useCalendar } from '@/contexts/CalendarContext';
import { getMonthNames } from '@/utils/calendar';
import useFetchObjects from '@/api/useFetchObjects';
import useFetchObject from '@/api/useFetchObject';
import useAdd from '@/api/useAdd';
import DatePicker from '@/components/ui/date-picker-calendar';

// Static class level options
const CLASS_LEVELS = [
  { id: 'KG', level: '0', name: 'Kindergarten' },
  { id: '1', level: '1', name: 'Class 1' },
  { id: '2', level: '2', name: 'Class 2' },
  { id: '3', level: '3', name: 'Class 3' },
  { id: '4', level: '4', name: 'Class 4' },
  { id: '5', level: '5', name: 'Class 5' },
  { id: '6', level: '6', name: 'Class 6' },
  { id: '7', level: '7', name: 'Class 7' },
  { id: '8', level: '8', name: 'Class 8' },
  { id: '9', level: '9', name: 'Class 9' },
  { id: '10', level: '10', name: 'Class 10' },
  { id: '11', level: '11', name: 'Class 11' },
  { id: '12', level: '12', name: 'Class 12' },
];

interface FeeAssignment {
  id: number;
  fee_type: number | null;
  fee_type_details?: {
    id: number;
    name: string;
    code: string;
    category: string;
  };
  amount: string;
  currency: string;
  paid_amount: string;
  remaining_amount: string;
  payment_plan: number;
  is_mandatory: boolean;
}

interface Student {
  id: number;
  full_name: string;
  registration_number: string;
  fee_type?: string;
  class_level?: string | null;
  class_level_details?: {
    id: string;
    name: string;
    level: string;
  };
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

// ─── Multi-Select Month Dropdown ─────────────────────────────────────────────
interface MonthMultiSelectProps {
  months: { value: string; label: string }[];
  selectedMonths: string[];
  maxMonths: number;
  disabled?: boolean;
  onToggle: (monthValue: string) => void;
  currency: string;
  paymentAmount: string;
}

const MonthMultiSelect: React.FC<MonthMultiSelectProps> = ({
  months,
  selectedMonths,
  maxMonths,
  disabled,
  onToggle,
  currency,
  paymentAmount,
}) => {
  const [open, setOpen] = useState(false);
  const selectedLabels = months.filter((m) => selectedMonths.includes(m.value)).map((m) => m.label);

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between h-9 text-xs font-normal hover:bg-muted/50"
          >
            <span className="truncate">
              {selectedMonths.length === 0
                ? 'Select months…'
                : selectedMonths.length === 1
                ? selectedLabels[0]
                : `${selectedMonths.length} months selected`}
            </span>
            <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-0" align="start" sideOffset={4}>
          <Command>
            <CommandInput placeholder="Search month…" className="h-8 text-xs" />
            <CommandList>
              <CommandEmpty>No month found.</CommandEmpty>
              <CommandGroup>
                <ScrollArea>
                  {months.map((month) => {
                    const isSelected = selectedMonths.includes(month.value);
                    const wouldExceed = !isSelected && selectedMonths.length >= maxMonths;
                    return (
                      <CommandItem
                        key={month.value}
                        value={month.label}
                        disabled={wouldExceed}
                        onSelect={() => {
                          if (!wouldExceed || isSelected) {
                            onToggle(month.value);
                          }
                        }}
                        className="flex items-center gap-2 text-xs cursor-pointer"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-muted-foreground/40'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </span>
                        <span className="flex-1">{month.label}</span>
                        {isSelected && (
                          <span className="text-[10px] text-muted-foreground">
                            {formatCurrency(parseFloat(paymentAmount) || 0, currency)}
                          </span>
                        )}
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
                      className="text-[10px] h-5 gap-0.5 pr-1 pl-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
                    >
                      {ml?.label}
                      <button
                        className="ml-0.5 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-800 p-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggle(mv);
                        }}
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
      {selectedMonths.length > 0 && (
        <div className="text-[10px] text-muted-foreground flex items-center justify-between">
          <span>
            {selectedMonths.length} / {maxMonths} months
          </span>
        </div>
      )}
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const AddStudentPayment = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { calendarType } = useCalendar();
  const lang = t('language.code') as 'fa' | 'ps';

  // Step state
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [feeAssignments, setFeeAssignments] = useState<FeeAssignment[]>([]);
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);

  // Form state
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentYear, setPaymentYear] = useState<string>(new Date().getFullYear().toString());
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Use useAdd hook for creating payments
  const { handleAdd, loading, isSuccess } = useAdd<any>({
    queryKey: 'student-payments',
    endpoint: 'student-payments/create_payments',
  });

  // Fetch students by level
  const { data: studentsData, isLoading: loadingStudents } = useFetchObjects<{ results: Student[]; count: number }>({
    queryKey: ['students-by-level', selectedLevel, 'active'],
    endpoint: 'students',
    enabled: !!selectedLevel,
    params: {
      class_level: selectedLevel,
      status: 'active',
      page_size: 100,
    },
  });

  const studentsInLevel = studentsData?.results || [];

  // Fetch student financial summary
  const { data: financialSummary } = useFetchObject<any>({
    queryKey: ['student-financial-summary', selectedStudent?.id],
    endpoint: selectedStudent ? `students/${selectedStudent.id}/financial_summary/` : '',
    enabled: !!selectedStudent,
  });

  // Fetch fee assignments
  const { data: feeAssignmentsData } = useFetchObject<any>({
    queryKey: ['student-fee-assignments', selectedStudent?.id, selectedLevel],
    endpoint: selectedStudent
      ? `student-payments/student_fee_assignments/?student=${selectedStudent.id}` +
        (selectedLevel && selectedLevel !== 'all' ? `&class_level=${selectedLevel}` : '')
      : '',
    enabled: !!selectedStudent,
  });

  // Initialize payment entries
  useEffect(() => {
    if (feeAssignmentsData?.total_assignments) {
      const assignments = feeAssignmentsData.total_assignments;
      setFeeAssignments(assignments);

      const entries: PaymentEntry[] = assignments.map((a: FeeAssignment) => ({
        assignment_id: a.id,
        fee_type_name: a.fee_type_details?.name || 'Unknown',
        amount: a.amount,
        paid: a.paid_amount,
        remaining: a.remaining_amount,
        payment_plan: a.payment_plan || 1,
        selected_months: [],
        payment_amount: '',
        currency: a.currency,
      }));
      setPaymentEntries(entries);
    }
  }, [feeAssignmentsData]);

  // Update student financial data
  useEffect(() => {
    if (selectedStudent && financialSummary) {
      setSelectedStudent((prev) => ({
        ...prev!,
        total_paid: financialSummary.total_payments || '0',
        remaining_balance: financialSummary.remaining_balance || '0',
      }));
    }
  }, [financialSummary]);

  // Handle success - navigate only, toast is handled by useAdd
  useEffect(() => {
    if (isSuccess) {
      navigate('/student-payments');
    }
  }, [isSuccess, navigate]);

  // Toggle month selection
  const toggleMonth = (entryIndex: number, monthValue: string) => {
    setPaymentEntries((prev) => {
      const updated = [...prev];
      const entry = updated[entryIndex];
      const hasMonth = entry.selected_months.includes(monthValue);

      if (!hasMonth && entry.selected_months.length >= entry.payment_plan) {
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
      return sum + amount;
    }, 0);
  }, [paymentEntries]);

  // Validate and submit
  const handleSubmit = () => {
    const validEntries = paymentEntries.filter(
      (e) => e.selected_months.length > 0 && parseFloat(e.payment_amount) > 0
    );

    if (validEntries.length === 0) {
      return;
    }

    // Build payments payload for create_payments endpoint
    const paymentsPayload = validEntries.map((entry) => ({
      assignment_id: entry.assignment_id,
      amount: entry.payment_amount,
      period_months: entry.selected_months,
    }));

    const payload = {
      student: selectedStudent?.id,
      payment_date: paymentDate,
      period_year: paymentYear,
      currency: paymentEntries[0]?.currency || 'AFN',
      payment_status: 'completed',
      reference_number: referenceNumber,
      description: description,
      payments: paymentsPayload,
    };

    handleAdd(payload);
  };

  const months = getCalendarMonths(calendarType, lang);

  const totalSelectedMonths = useMemo(() => {
    return paymentEntries.reduce((sum, entry) => sum + entry.selected_months.length, 0);
  }, [paymentEntries]);

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-screen-2xl px-4 sm:px-6 lg:px-8">
      {/* Header */}
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

      {/* ── Step 1: Select Level & Student ───────────────────────────────── */}
      <Card className="border-t-4 border-t-indigo-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs">
              1
            </span>
            {t('student-payments.selectLevel', 'Select Class Level')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('students.classLevel')}
              </Label>
              <Autocomplete
                options={CLASS_LEVELS}
                value={selectedLevel}
                onChange={(value) => {
                  setSelectedLevel(value as string);
                  setSelectedStudent(null);
                  setFeeAssignments([]);
                  setPaymentEntries([]);
                }}
                placeholder={t('students.selectClassLevel')}
                getOptionLabel={(c) => c.name}
                getOptionValue={(c) => c.id.toString()}
                sortOptions={(a: any, b: any) => Number(a.level) - Number(b.level)}
              />
            </div>

            {selectedLevel && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('students.student', 'Student')}
                </Label>
                <Autocomplete
                  options={studentsInLevel}
                  value={selectedStudent?.id?.toString() || ''}
                  onChange={(value, option) => {
                    if (option && option.id) {
                      setSelectedStudent(option);
                      setSelectedLevel(option.class_level_details?.level || '');
                    } else {
                      setSelectedStudent(null);
                      setFeeAssignments([]);
                      setPaymentEntries([]);
                    }
                  }}
                  placeholder={loadingStudents ? 'Loading...' : t('students.selectStudent')}
                  getOptionLabel={(s) => `${s.full_name} (${s.registration_number}) — ${s.fee_type === 'paid' ? t('students.feeTypeOptions.paid', 'Paid') : t('students.feeTypeOptions.free', 'Free')}`}
                  getOptionValue={(s) => s.id.toString()}
                  renderOption={(s) => (
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="truncate">{s.full_name} ({s.registration_number})</span>
                      <Badge variant={s.fee_type === 'paid' ? 'default' : 'secondary'} className="shrink-0 text-[10px]">
                        {s.fee_type === 'paid'
                          ? t('students.feeTypeOptions.paid', 'Paid')
                          : t('students.feeTypeOptions.free', 'Free')}
                      </Badge>
                    </div>
                  )}
                />
              </div>
            )}
          </div>

          {selectedStudent && totalSelectedMonths > 0 && (
            <div className="mt-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-3 py-2">
              <div className="text-xs text-muted-foreground">
                {t('student-payments.totalMonthsSelected', 'Total months selected')}:
                <span className="font-semibold">{totalSelectedMonths}</span>
              </div>
            </div>
          )}

          {selectedStudent && (
            <div className="mt-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-800 dark:text-indigo-200 uppercase tracking-wide mb-2">
                <Info className="h-3.5 w-3.5" />
                {t('student-payments.studentFinancialInfo', 'Student Financial Summary')}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">{t('students.studentName')}</div>
                  <div className="font-medium">{selectedStudent.full_name}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">{t('students.classLevel')}</div>
                  <div className="font-medium">{selectedStudent.class_level_details?.name || '-'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">{t('students.feeType', 'Fee Type')}</div>
                  <div>
                    <Badge variant={selectedStudent.fee_type === 'paid' ? 'default' : 'secondary'} className="text-xs">
                      {selectedStudent.fee_type === 'paid' 
                        ? t('students.feeTypeOptions.paid', 'Paid') 
                        : t('students.feeTypeOptions.free', 'Free')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">{t('students.totalPaid')}</div>
                  <div className="font-medium text-emerald-600">
                    {formatCurrency(selectedStudent.total_paid, selectedStudent.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">{t('students.remainingBalance')}</div>
                  <div className="font-bold text-red-600">
                    {formatCurrency(selectedStudent.remaining_balance, selectedStudent.currency)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Step 2: Fee Assignments & Payment ────────────────────────────── */}
      {selectedStudent && feeAssignments.length > 0 && (
        <Card className="border-t-4 border-t-emerald-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs">
                2
              </span>
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
                    <th className="p-2.5 text-center whitespace-nowrap min-w-[200px]">
                      {t('student-payments.selectMonths', 'Select Months')}
                    </th>
                    <th className="p-2.5 text-right whitespace-nowrap min-w-[140px]">
                      {t('student-payments.paymentAmount', 'Payment Amount')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paymentEntries.map((entry, index) => {
                    const remaining = parseFloat(entry.remaining);
                    const isPaid = remaining <= 0;
                    const monthCount = entry.selected_months.length;
                    // Amount is the payment amount (not multiplied or divided by months)
                    const totalForEntry = parseFloat(entry.payment_amount) || 0;

                    return (
                      <tr
                        key={entry.assignment_id}
                        className={`border-b transition-colors ${isPaid ? 'bg-muted/20' : 'hover:bg-muted/10'}`}
                      >
                        {/* Fee Type */}
                        <td className="p-2.5 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {entry.fee_type_name}
                            {isPaid && (
                              <Badge variant="outline" className="text-emerald-600 text-[10px]">
                                {t('common.paid')}
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="p-2.5 text-right whitespace-nowrap">
                          {formatCurrency(entry.amount, entry.currency)}
                        </td>

                        {/* Paid */}
                        <td className="p-2.5 text-right text-emerald-600 whitespace-nowrap">
                          {formatCurrency(entry.paid, entry.currency)}
                        </td>

                        {/* Remaining */}
                        <td
                          className={`p-2.5 text-right font-medium whitespace-nowrap ${
                            remaining > 0 ? 'text-red-600' : 'text-emerald-600'
                          }`}
                        >
                          {formatCurrency(entry.remaining, entry.currency)}
                        </td>

                        {/* Payment Plan */}
                        <td className="p-2.5 text-center">
                          <Badge variant="outline" className="text-[10px]">
                            {entry.payment_plan} {t('students.months', 'mo')}
                          </Badge>
                        </td>

                        {/* ── Month Multi-Select Dropdown ── */}
                        <td className="p-2.5">
                          <MonthMultiSelect
                            months={months}
                            selectedMonths={entry.selected_months}
                            maxMonths={entry.payment_plan}
                            disabled={isPaid}
                            onToggle={(mv) => toggleMonth(index, mv)}
                            currency={entry.currency}
                            paymentAmount={entry.payment_amount}
                          />
                        </td>

                        {/* Payment Amount Input */}
                        <td className="p-2.5">
                          <Input
                            type="number"
                            step="0.01"
                            value={entry.payment_amount}
                            onChange={(e) => updatePaymentAmount(index, e.target.value)}
                            placeholder="0.00"
                            className="h-9 text-xs w-full"
                            disabled={isPaid || entry.selected_months.length === 0}
                          />
                          {monthCount > 0 && entry.payment_amount && (
                            <div className="text-[10px] text-muted-foreground mt-1 text-right font-medium">
                              {formatCurrency(totalForEntry, entry.currency)}
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
                    <td className="p-2.5 text-right">
                      {formatCurrency(
                        paymentEntries.reduce((s, e) => s + parseFloat(e.amount), 0),
                        paymentEntries[0]?.currency || 'AFN'
                      )}
                    </td>
                    <td className="p-2.5 text-right text-emerald-600">
                      {formatCurrency(
                        paymentEntries.reduce((s, e) => s + parseFloat(e.paid), 0),
                        paymentEntries[0]?.currency || 'AFN'
                      )}
                    </td>
                    <td className="p-2.5 text-right text-red-600">
                      {formatCurrency(
                        paymentEntries.reduce((s, e) => s + parseFloat(e.remaining), 0),
                        paymentEntries[0]?.currency || 'AFN'
                      )}
                    </td>
                    <td className="p-2.5" />
                    <td className="p-2.5" />
                    <td className="p-2.5 text-right text-lg">
                      {formatCurrency(totalPayment, paymentEntries[0]?.currency || 'AFN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ── Payment Details Form ──────────────────────────────────── */}
            {totalPayment > 0 && (
              <div className="mt-6 space-y-5">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium">
                      {t('student-payments.totalPayment', 'Total Payment')}:
                      <span className="font-bold text-lg ml-2">
                        {formatCurrency(totalPayment, paymentEntries[0]?.currency || 'AFN')}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('student-payments.paymentDate')}
                    </Label>
                    <DatePicker
                      value={paymentDate}
                      onChange={(date) => setPaymentDate(date?.toISOString().slice(0, 10) || '')}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('student-payments.year', 'Year')}
                    </Label>
                    <Input
                      type="text"
                      value={paymentYear}
                      onChange={(e) => setPaymentYear(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('student-payments.referenceNumber')}
                    </Label>
                    <Input
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="e.g. BANK-2026-001"
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t('student-payments.description')}
                  </Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('student-payments.enterDescription')}
                    className="h-16"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" onClick={() => navigate('/student-payments')} disabled={loading}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {loading ? (
                      <>
                        <RotateCw className="h-4 w-4 animate-spin" />
                        {t('common.processing', 'Processing...')}
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        {t('student-payments.createPayments', 'Create Payments')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Empty State ───────────────────────────────────────────────── */}
      {selectedStudent && feeAssignments.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-sm font-medium">{t('student-payments.noFeeAssignments', 'No Fee Assignments')}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t(
                'student-payments.noFeeAssignmentsDesc',
                'This student has no fee assignments. Please add fee assignments first.'
              )}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate(`/student-fee-assignments/add?student=${selectedStudent.id}`)}
            >
              {t('students.addFeeAssignment', 'Add Fee Assignment')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AddStudentPayment;
