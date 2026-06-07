import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Autocomplete } from '@/components/ui/autocomplete';
import DatePicker from '@/components/ui/date-picker-calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendar, CalendarType } from '@/contexts/CalendarContext';
import { ReloadIcon } from '@radix-ui/react-icons';
import { ArrowLeft, DollarSign, User } from 'lucide-react';
import useUpdate from '@/api/useUpdate';
import useFetchObjects from '@/api/useFetchObjects';
import { Employee } from '@/types/advance';
import { Currency } from '@/types/common';

interface PayrollFormData {
  employee: string;
  month: string;
  year: number;
  salary: number;
  currency: string;
  payment_date: string;
}

interface EmployeeFinancialSummary {
  total_salary: number;
  advanced_paid: number;
  payroll_paid: number;
  overall_paid: number;
  remaining_amount: number;
  currency?: { id: string; code: string; symbol?: string; };
}

const EditPayroll = () => {
  const { t, language } = useLanguage();
  const { calendarType } = useCalendar();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  // Get current year based on calendar type
  const currentCalendarYear = calendarType === 'shamsi' ? 1403 : new Date().getFullYear();

  const [formData, setFormData] = useState<PayrollFormData>({
    employee: '',
    month: 'january',
    year: currentCalendarYear,
    salary: 0,
    currency: '',
    payment_date: new Date().toISOString().slice(0, 10),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [financialSummary, setFinancialSummary] = useState<EmployeeFinancialSummary | null>(null);

  const { data: payroll, isLoading: payrollLoading } = useFetchObjects<any>({
    queryKey: ['payroll', id],
    endpoint: `payrolls/${id}`,
  });

  const { handleUpdate, loading, isSuccess } = useUpdate<PayrollFormData>({
    queryKey: ['payrolls'],
  });

  // Get months based on calendar type
  const shamsiMonths = [
    { value: 1, label: t('calendar.shamsiMonth1', 'حمل') },
    { value: 2, label: t('calendar.shamsiMonth2', 'ثور') },
    { value: 3, label: t('calendar.shamsiMonth3', 'جوزا') },
    { value: 4, label: t('calendar.shamsiMonth4', 'سرطان') },
    { value: 5, label: t('calendar.shamsiMonth5', 'اسد') },
    { value: 6, label: t('calendar.shamsiMonth6', 'سنبله') },
    { value: 7, label: t('calendar.shamsiMonth7', 'میزان') },
    { value: 8, label: t('calendar.shamsiMonth8', 'عقرب') },
    { value: 9, label: t('calendar.shamsiMonth9', 'قوس') },
    { value: 10, label: t('calendar.shamsiMonth10', 'جدی') },
    { value: 11, label: t('calendar.shamsiMonth11', 'دلو') },
    { value: 12, label: t('calendar.shamsiMonth12', 'حوت') }
  ];

  const qamariMonths = [
    { value: 1, label: t('calendar.qamariMonth1', 'محرم الحرام') },
    { value: 2, label: t('calendar.qamariMonth2', 'صفر المظفر') },
    { value: 3, label: t('calendar.qamariMonth3', 'ربيع الاول') },
    { value: 4, label: t('calendar.qamariMonth4', 'ربيع الثاني') },
    { value: 5, label: t('calendar.qamariMonth5', 'جمادی الاول') },
    { value: 6, label: t('calendar.qamariMonth6', 'جمادی الثاني') },
    { value: 7, label: t('calendar.qamariMonth7', 'رجب المرجب') },
    { value: 8, label: t('calendar.qamariMonth8', 'شعبان المعظم') },
    { value: 9, label: t('calendar.qamariMonth9', 'رمضان المبارک') },
    { value: 10, label: t('calendar.qamariMonth10', 'شوال المکرم') },
    { value: 11, label: t('calendar.qamariMonth11', 'ذی القعده') },
    { value: 12, label: t('calendar.qamariMonth12', 'ذی الحجه') }
  ];

  const months = calendarType === 'shamsi' ? shamsiMonths : qamariMonths;
  
  // Helper to convert numeric month to month name for backend
  const getMonthName = (monthNum: number) => {
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    return monthNames[monthNum - 1] || 'january';
  };

  // Years based on calendar type
  const years = Array.from({ length: 10 }, (_, i) => currentCalendarYear - 5 + i);

  const calendarLabels = {
    shamsi: { month: t('calendar.monthShamsi', 'ماه'), year: t('calendar.yearShamsi', 'سال') },
    qamari: { month: t('calendar.monthQamari', 'ماه'), year: t('calendar.yearQamari', 'سال') },
  };

  useEffect(() => {
    if (payroll) {
      setFormData({
        employee: payroll.employee?.toString() || '',
        month: payroll.month || 'january',
        year: payroll.year || new Date().getFullYear(),
        salary: Number(payroll.salary) || 0,
        currency: payroll.currency?.toString() || '',
        payment_date: payroll.payment_date ? payroll.payment_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      });
    }
  }, [payroll]);

  useEffect(() => {
    if (formData.employee && formData.month && formData.year) {
      fetchEmployeeFinancialSummary();
    }
  }, [formData.employee, formData.month, formData.year]);

  useEffect(() => {
    if (financialSummary?.currency?.code) {
      setFormData(prev => ({ ...prev, currency: financialSummary.currency.code }));
    }
  }, [financialSummary]);

  useEffect(() => {
    if (isSuccess) {
      navigate('/payroll');
    }
  }, [isSuccess, navigate]);

  const fetchEmployeeFinancialSummary = async () => {
    if (!formData.employee || !formData.month || !formData.year) return;
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/employees/${formData.employee}/financial_summary/?month=${formData.month}&year=${formData.year}`,
        {
          headers: {
            'Authorization': `Token ${user?.token}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setFinancialSummary(data);
      } else {
        setFinancialSummary({
          salary: employee.salary || 0,
          totalAdvances: 0,
          totalPayrolls: 0,
          remainingAmount: employee.salary || 0,
        });
      }
    } catch (error) {
      setFinancialSummary({
        salary: employee.salary || 0,
        totalAdvances: 0,
        totalPayrolls: 0,
        remainingAmount: employee.salary || 0,
      });
    }
  };



  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.employee) newErrors.employee = t('payroll.validation.employee');
    if (!formData.month) newErrors.month = t('payroll.validation.month');
    if (!formData.year || (calendarType === 'shamsi' ? formData.year < 1350 : formData.year < 2000)) newErrors.year = t('payroll.validation.year');
    if (!formData.salary || formData.salary <= 0) newErrors.salary = 'Salary must be greater than 0';
    if (!formData.currency) newErrors.currency = t('payroll.validation.currency');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !payroll) return;
    
    const payload = {
      employee: formData.employee,
      month: getMonthName(formData.month),
      year: formData.year,
      salary: formData.salary || 0,
      currency: formData.currency,
      payment_date: formData.payment_date,
    };
    
    handleUpdate(payroll.id, payload);
  };

  if (payrollLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center">
        <ReloadIcon className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/payroll')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          <h1 className="text-base font-boldtext-sm">{t('payroll.editPayroll')}</h1>
        </div>
      </div>
      
      <Card>
        <CardContent className="pt-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label>{t('payroll.employee')} *</Label>
                <Autocomplete
                  endpoint="employees" getOptionLabel={(employee) => `${employee.full_name}${employee.position ? ` (${employee.position})` : ''}`} getOptionValue={(employee) => employee.id.toString()}
                  value={formData.employee}
                  onChange={(value) => {
                    setFormData((prev) => ({ ...prev, employee: value?.toString() || '' }));
                    if (errors.employee) setErrors((prev) => ({ ...prev, employee: '' }));
                  }}
                  placeholder={t('payroll.selectEmployee')}
                />
                {errors.employee && <p className="text-base text-destructivetext-xs">{errors.employee}</p>}
              </div>
              <div>
                <Label>{calendarLabels[calendarType].month} *</Label>
                <Select value={formData.month.toString()} onValueChange={val => {
                  setFormData(prev => ({ ...prev, month: parseInt(val) }));
                  if (errors.month) setErrors(prev => ({ ...prev, month: '' }));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('payroll.selectMonth')} />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.month && <p className="text-base text-destructivetext-xs">{errors.month}</p>}
              </div>
              <div>
                <Label>{calendarLabels[calendarType].year} *</Label>
                <Select value={formData.year.toString()} onValueChange={val => {
                  setFormData(prev => ({ ...prev, year: parseInt(val) }));
                  if (errors.year) setErrors(prev => ({ ...prev, year: '' }));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder={calendarLabels[calendarType].year} />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.year && <p className="text-base text-destructivetext-xs">{errors.year}</p>}
              </div>
            </div>

            {financialSummary && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-center">
                      <div className="text-xs text-gray-600">Total Salary</div>
                      <div className="text-sm font-semibold text-blue-600">
                        {financialSummary.currency?.code || ''} {Number(financialSummary.total_salary || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600">Advanced Paid</div>
                      <div className="text-sm font-semibold text-orange-600">
                        {financialSummary.currency?.code || ''} {Number(financialSummary.advanced_paid || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600">Payroll Paid</div>
                      <div className="text-sm font-semibold text-green-600">
                        {financialSummary.currency?.code || ''} {Number(financialSummary.payroll_paid || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600">Overall Paid</div>
                      <div className="text-sm font-semibold text-red-600">
                        {financialSummary.currency?.code || ''} {Number(financialSummary.overall_paid || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600">Remaining</div>
                      <div className="text-sm font-semibold text-purple-600">
                        {financialSummary.currency?.code || ''} {Number(financialSummary.remaining_amount || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{t('payroll.salary')} *</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={formData.salary || ''} 
                  onChange={e => {
                    setFormData(prev => ({ ...prev, salary: e.target.value === '' ? 0 : parseFloat(e.target.value) }));
                    if (errors.salary) setErrors(prev => ({ ...prev, salary: '' }));
                  }}
                  placeholder={`Max: ${(financialSummary?.remaining_amount || 0).toFixed(2)}`}
                  className="bg-blue-50 border-blue-200"
                />
                <p className="text-base text-gray-500 mt-1">Remaining amount: {financialSummary?.currency?.symbol || ''}{(financialSummary?.remaining_amount || 0).toFixed(2)} {financialSummary?.currency?.code || ''}</p>
                {errors.salary && <p className="text-base text-destructivetext-xs">{errors.salary}</p>}
              </div>
              <div>
                <Label>{t('payroll.currency')} *</Label>
                <select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full p-2 border rounded-md bg-gray-100"
                  disabled
                >
                  <option value="">Select Currency</option>
                  <option value="AFN">AFN - Afghan Afghani</option>
                  <option value="USD">USD - US Dollar</option>
                </select>
                {errors.currency && <p className="text-base text-destructivetext-xs">{errors.currency}</p>}
              </div>
              <div>
  
                <DatePicker
                  value={formData.payment_date}
                  onChange={(date) => setFormData(prev => ({ ...prev, payment_date: date }))}
                  label={t('payroll.paymentDate')}
                />
              </div>
            </div>



            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/payroll')} disabled={loading}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <ReloadIcon className="animate-spin mr-2" />
                    {t('common.updating')}
                  </>
                ) : (
                  t('common.update')
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditPayroll;
