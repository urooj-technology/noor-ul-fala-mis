import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ReloadIcon } from '@radix-ui/react-icons';
import { ArrowLeft, DollarSign, User } from 'lucide-react';
import DatePicker from '@/components/ui/date-picker-calendar';
import useUpdate from '@/api/useUpdate';
import useFetchObjects from '@/api/useFetchObjects';
import { AdvanceFormData, Employee } from '@/types/advance';
import { Currency } from '@/types/common';

interface EmployeeFinancialSummary {
  total_salary: number;
  advanced_paid: number;
  payroll_paid: number;
  overall_paid: number;
  remaining_amount: number;
  currency?: { id: string; code: string; symbol?: string; };
}

const getCurrentMonth = () => {
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  return months[new Date().getMonth()];
};

const EditAdvance = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [formData, setFormData] = useState<AdvanceFormData>({
    employee: '',
    amount: 0,
    currency: '',
    reason: '',
    year: new Date().getFullYear(),
    month: getCurrentMonth(),
    payment_date: new Date().toISOString().slice(0, 10),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [financialSummary, setFinancialSummary] = useState<EmployeeFinancialSummary | null>(null);

  const { data: advance, isLoading: advanceLoading } = useFetchObjects<any>({
    queryKey: ['advance', id],
    endpoint: `advances/${id}`,
  });

  const { handleUpdate, loading, isSuccess } = useUpdate<AdvanceFormData>({
    queryKey: ['advances'],
  });

  const months = [
    { value: 'january', label: t('advance.months.january') },
    { value: 'february', label: t('advance.months.february') },
    { value: 'march', label: t('advance.months.march') },
    { value: 'april', label: t('advance.months.april') },
    { value: 'may', label: t('advance.months.may') },
    { value: 'june', label: t('advance.months.june') },
    { value: 'july', label: t('advance.months.july') },
    { value: 'august', label: t('advance.months.august') },
    { value: 'september', label: t('advance.months.september') },
    { value: 'october', label: t('advance.months.october') },
    { value: 'november', label: t('advance.months.november') },
    { value: 'december', label: t('advance.months.december') },
  ];

  useEffect(() => {
    if (advance) {
      setFormData({
        employee: advance.employee?.toString() || '',
        amount: advance.amount || 0,
        currency: advance.currency?.toString() || '',
        reason: advance.reason || '',
        year: advance.year || new Date().getFullYear(),
        month: advance.month || '',
        payment_date: advance.payment_date ? advance.payment_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      });
    }
  }, [advance]);

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
      navigate('/advance');
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
      console.error('Error fetching financial summary:', error);
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
    if (!formData.employee) newErrors.employee = t('advance.validation.employee');
    if (!formData.amount || formData.amount <= 0) newErrors.amount = t('advance.validation.amount');
    if (!formData.currency) newErrors.currency = t('advance.validation.currency');
    if (!formData.year) newErrors.year = t('advance.validation.year');
    if (!formData.month) newErrors.month = t('advance.validation.month');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !advance) return;
    handleUpdate(advance.id, formData);
  };

  if (advanceLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center">
        <ReloadIcon className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/advance')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          <h1 className="text-base font-boldtext-sm">{t('advance.editAdvance')}</h1>
        </div>
      </div>
      
      <Card>
        <CardContent className="pt-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="employee">{t('advance.employee')} *</Label>
                <Autocomplete
                  endpoint="employees" getOptionLabel={(employee) => `${employee.full_name}${employee.position ? ` (${employee.position})` : ''}`} getOptionValue={(employee) => employee.id.toString()}
                  value={formData.employee}
                  onChange={(value) => {
                    setFormData((prev) => ({ ...prev, employee: value?.toString() || '' }));
                    if (errors.employee) setErrors((prev) => ({ ...prev, employee: '' }));
                  }}
                  placeholder={t('advance.selectEmployee')}
                />
                {errors.employee && <p className="text-base text-destructivetext-xs">{errors.employee}</p>}
              </div>
              <div>
                <Label htmlFor="month">{t('advance.month')} *</Label>
                <Select
                  value={formData.month}
                  onValueChange={(value) => {
                    setFormData((prev) => ({ ...prev, month: value }));
                    if (errors.month) setErrors((prev) => ({ ...prev, month: '' }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('advance.selectMonth')} />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.month && <p className="text-base text-destructivetext-xs">{errors.month}</p>}
              </div>
              <div>
                <Label htmlFor="year">{t('advance.year')} *</Label>
                <Input
                  id="year"
                  type="number"
                  min="2020"
                  max="2030"
                  value={formData.year}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }));
                    if (errors.year) setErrors((prev) => ({ ...prev, year: '' }));
                  }}
                />
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="amount">{t('advance.amount')} *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }));
                    if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
                  }}
                  placeholder={t('advance.enterAmount')}
                />
                {errors.amount && <p className="text-base text-destructivetext-xs">{errors.amount}</p>}
              </div>

              <div>
                <Label htmlFor="currency">{t('advance.currency')} *</Label>
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
                <Label htmlFor="payment_date">{t('advance.paymentDate')} *</Label>
                <DatePicker
                  value={formData.payment_date}
                  onChange={(date) => setFormData((prev) => ({ ...prev, payment_date: date?.toISOString().slice(0, 10) || '' }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="reason">{t('advance.reason')}</Label>
              <Textarea
                id="reason"
                value={formData.reason || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder={t('advance.enterReason')}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/advance')} disabled={loading}>
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

export default EditAdvance;
