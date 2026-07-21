import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { Calculator, DollarSign, Clock, Minus, Plus } from 'lucide-react';
import DatePicker from '@/components/ui/date-picker-calendar';
import { toNumberOr } from '@/lib/digits';

interface Employee {
  id: string;
  name: string;
  employeeId: string;
  position: string;
  basicSalary: number;
}

interface PayrollRecord {
  id?: string;
  employeeId: string;
  employeeName: string;
  position: string;
  month: string;
  year: number | string;
  basicSalary: number | string;
  bonus: number | string;
  overtime: number | string;
  deductions: number | string;
  netSalary: number;
  paymentDate: string;
  status: 'pending' | 'paid' | 'cancelled';
}

interface PayrollFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payroll: PayrollRecord) => void;
  editingPayroll?: PayrollRecord | null;
  employees: Employee[];
}

export const PayrollForm: React.FC<PayrollFormProps> = ({
  isOpen,
  onClose,
  onSave,
  editingPayroll,
  employees
}) => {
  const { t } = useLanguage();

  const [formData, setFormData] = useState<PayrollRecord>({
    employeeId: '',
    employeeName: '',
    position: '',
    month: '',
    year: new Date().getFullYear(),
    basicSalary: 0,
    bonus: 0,
    overtime: 0,
    deductions: 0,
    netSalary: 0,
    paymentDate: '',
    status: 'pending'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    if (editingPayroll) {
      setFormData(editingPayroll);
    } else {
      setFormData({
        employeeId: '',
        employeeName: '',
        position: '',
        month: '',
        year: new Date().getFullYear(),
        basicSalary: 0,
        bonus: 0,
        overtime: 0,
        deductions: 0,
        netSalary: 0,
        paymentDate: '',
        status: 'pending'
      });
    }
    setErrors({});
  }, [editingPayroll, isOpen]);

  const calculateNetSalary = () => {
    const grossSalary =
      toNumberOr(formData.basicSalary) +
      toNumberOr(formData.bonus) +
      toNumberOr(formData.overtime);
    const netSalary = grossSalary - toNumberOr(formData.deductions);
    setFormData(prev => ({ ...prev, netSalary }));
  };

  useEffect(() => {
    calculateNetSalary();
  }, [formData.basicSalary, formData.bonus, formData.overtime, formData.deductions]);

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee) {
      setFormData(prev => ({
        ...prev,
        employeeId,
        employeeName: employee.name,
        position: employee.position,
        basicSalary: employee.basicSalary
      }));
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employeeId) newErrors.employeeId = t('validation.required', 'This field is required');
    if (!formData.month) newErrors.month = t('validation.required', 'This field is required');
    if (!formData.year) newErrors.year = t('validation.required', 'This field is required');
    if (toNumberOr(formData.basicSalary) <= 0) newErrors.basicSalary = 'Basic salary must be greater than 0';
    if (!formData.paymentDate) newErrors.paymentDate = t('validation.required', 'This field is required');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave({
        ...formData,
        year: toNumberOr(formData.year, new Date().getFullYear()),
        basicSalary: toNumberOr(formData.basicSalary),
        bonus: toNumberOr(formData.bonus),
        overtime: toNumberOr(formData.overtime),
        deductions: toNumberOr(formData.deductions),
        netSalary: toNumberOr(formData.netSalary),
      });
    }
  };

  const grossSalary =
    toNumberOr(formData.basicSalary) +
    toNumberOr(formData.bonus) +
    toNumberOr(formData.overtime);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {editingPayroll ? t('payroll.editPayroll', 'Edit Payroll') : t('payroll.addPayroll', 'Add Payroll')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Employee Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee">{t('payroll.employee', 'Employee')} *</Label>
              <Select
                value={formData.employeeId}
                onValueChange={handleEmployeeChange}
                disabled={!!editingPayroll}
              >
                <SelectTrigger className={errors.employeeId ? 'border-destructive' : ''}>
                  <SelectValue placeholder={t('payroll.selectEmployee', 'Select Employee')} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <div>
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-base text-muted-foreground">{employee.employeeId} - {employee.position}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.employeeId && <p className="text-base text-destructivetext-xs">{errors.employeeId}</p>}
            </div>

            <div className="space-y-2">
              <Label>{t('payroll.position', 'Position')}</Label>
              <Input
                value={formData.position}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          {/* Pay Period */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">{t('payroll.month', 'Month')} *</Label>
              <Select
                value={formData.month}
                onValueChange={(value) => handleChange('month', value)}
              >
                <SelectTrigger className={errors.month ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.month && <p className="text-base text-destructivetext-xs">{errors.month}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">{t('payroll.year', 'Year')} *</Label>
              <NumericInput allowDecimal={false}
                id="year"
                value={formData.year}
                onValueChange={(v) => handleChange('year', v)}
                className={errors.year ? 'border-destructive' : ''}
              />
              {errors.year && <p className="text-base text-destructivetext-xs">{errors.year}</p>}
            </div>

            <div className="space-y-2">
              <DatePicker
                label={`${t('payroll.paymentDate', 'Payment Date')} *`}
                value={formData.paymentDate}
                onChange={(d) => handleChange('paymentDate', d)}
                error={errors.paymentDate}
              />
            </div>
          </div>

          <Separator />

          {/* Salary Components */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold flex items-center gap-2text-sm">
              <Calculator className="h-5 w-5" />
              {t('payroll.payrollSummary', 'Payroll Summary')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Earnings */}
              <div className="space-y-4">
                <h4 className="font-medium text-green-600 flex items-center gap-2text-sm">
                  <Plus className="h-4 w-4" />
                  Earnings
                </h4>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="basicSalary">{t('payroll.basicSalary', 'Basic Salary')} *</Label>
                    <NumericInput maxDecimals={2}
                      id="basicSalary"
                      value={formData.basicSalary}
                      onValueChange={(v) => handleChange('basicSalary', v)}
                      className={errors.basicSalary ? 'border-destructive' : ''}
                    />
                    {errors.basicSalary && <p className="text-base text-destructivetext-xs">{errors.basicSalary}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bonus">{t('payroll.bonus', 'Bonus')}</Label>
                    <NumericInput maxDecimals={2}
                      id="bonus"
                      value={formData.bonus}
                      onValueChange={(v) => handleChange('bonus', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="overtime" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {t('payroll.overtime', 'Overtime')}
                    </Label>
                    <NumericInput maxDecimals={2}
                      id="overtime"
                      value={formData.overtime}
                      onValueChange={(v) => handleChange('overtime', v)}
                    />
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="space-y-4">
                <h4 className="font-medium text-red-600 flex items-center gap-2text-sm">
                  <Minus className="h-4 w-4" />
                  Deductions
                </h4>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="deductions">{t('payroll.deductions', 'Deductions')}</Label>
                    <NumericInput maxDecimals={2}
                      id="deductions"
                      value={formData.deductions}
                      onValueChange={(v) => handleChange('deductions', v)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Salary Summary */}
            <div className="bg-muted/50 p-4 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-base text-muted-foregroundtext-xs">{t('payroll.grossSalary', 'Gross Salary')}</p>
                  <p className="text-base font-semibold text-base text-green-600text-xs">${grossSalary.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-base text-muted-foregroundtext-xs">Total Deductions</p>
                  <p className="text-base font-semibold text-base text-red-600text-xs">-${formData.deductions.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-base text-muted-foregroundtext-xs">{t('payroll.netSalary', 'Net Salary')}</p>
                  <p className="text-base font-bold text-base text-primarytext-xs">${formData.netSalary.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">{t('common.status', 'Status')}</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'pending' | 'paid' | 'cancelled') => handleChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">
                  <Badge variant="secondary">Pending</Badge>
                </SelectItem>
                <SelectItem value="paid">
                  <Badge variant="default">Paid</Badge>
                </SelectItem>
                <SelectItem value="cancelled">
                  <Badge variant="destructive">Cancelled</Badge>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit">
              {t('common.save', 'Save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};