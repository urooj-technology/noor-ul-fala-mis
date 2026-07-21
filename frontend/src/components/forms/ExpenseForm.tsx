import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import DatePicker from '@/components/ui/date-picker-calendar';
import { toNumberOr } from '@/lib/digits';

interface Expense {
  id: string;
  expenseNumber: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  employee: string;
  department: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  receiptUrl?: string;
  notes?: string;
}

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Omit<Expense, 'id'>) => void;
  expense?: Expense | null;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  isOpen,
  onClose,
  onSave,
  expense
}) => {
  const { t } = useLanguage();
  
  const [formData, setFormData] = useState({
    expenseNumber: '',
    category: '',
    description: '',
    amount: '' as string | number,
    expenseDate: '',
    employee: '',
    department: '',
    status: 'pending' as 'pending' | 'approved' | 'rejected' | 'paid',
    receiptUrl: '',
    notes: ''
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        expenseNumber: expense.expenseNumber,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        expenseDate: expense.expenseDate,
        employee: expense.employee,
        department: expense.department,
        status: expense.status,
        receiptUrl: expense.receiptUrl || '',
        notes: expense.notes || ''
      });
    } else {
      setFormData({
        expenseNumber: `EXP-${Date.now().toString().slice(-6)}`,
        category: '',
        description: '',
        amount: '',
        expenseDate: new Date().toISOString().split('T')[0],
        employee: '',
        department: '',
        status: 'pending',
        receiptUrl: '',
        notes: ''
      });
    }
  }, [expense, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, amount: toNumberOr(formData.amount) });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {expense ? t('expenses.edit', 'Edit Expense') : t('expenses.add', 'Add Expense')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expenseNumber">{t('expenses.expenseNumber', 'Expense Number')}</Label>
              <Input
                id="expenseNumber"
                value={formData.expenseNumber}
                onChange={(e) => handleChange('expenseNumber', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="category">{t('expenses.category', 'Category')}</Label>
              <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('expenses.selectCategory', 'Select category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="travel">{t('expenses.categories.travel', 'Travel')}</SelectItem>
                  <SelectItem value="office_supplies">{t('expenses.categories.officeSupplies', 'Office Supplies')}</SelectItem>
                  <SelectItem value="meals">{t('expenses.categories.meals', 'Meals')}</SelectItem>
                  <SelectItem value="transportation">{t('expenses.categories.transportation', 'Transportation')}</SelectItem>
                  <SelectItem value="equipment">{t('expenses.categories.equipment', 'Equipment')}</SelectItem>
                  <SelectItem value="other">{t('expenses.categories.other', 'Other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="employee">{t('expenses.employee', 'Employee')}</Label>
              <Input
                id="employee"
                value={formData.employee}
                onChange={(e) => handleChange('employee', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="department">{t('expenses.department', 'Department')}</Label>
              <Select value={formData.department} onValueChange={(value) => handleChange('department', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('expenses.selectDepartment', 'Select department')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">{t('expenses.departments.sales', 'Sales')}</SelectItem>
                  <SelectItem value="administration">{t('expenses.departments.administration', 'Administration')}</SelectItem>
                  <SelectItem value="it">{t('expenses.departments.it', 'IT')}</SelectItem>
                  <SelectItem value="hr">{t('expenses.departments.hr', 'HR')}</SelectItem>
                  <SelectItem value="finance">{t('expenses.departments.finance', 'Finance')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">{t('expenses.amount', 'Amount')}</Label>
              <NumericInput maxDecimals={2}
                id="amount"
                value={formData.amount}
                onValueChange={(v) => handleChange('amount', v)}
                required
              />
            </div>

            <div>
              <DatePicker
                label={t('expenses.expenseDate', 'Expense Date')}
                value={formData.expenseDate}
                onChange={(d) => handleChange('expenseDate', d)}
                required
              />
            </div>

            <div>
              <Label htmlFor="status">{t('expenses.status', 'Status')}</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('expenses.selectStatus', 'Select status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('expenses.status.pending', 'Pending')}</SelectItem>
                  <SelectItem value="approved">{t('expenses.status.approved', 'Approved')}</SelectItem>
                  <SelectItem value="rejected">{t('expenses.status.rejected', 'Rejected')}</SelectItem>
                  <SelectItem value="paid">{t('expenses.status.paid', 'Paid')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="receiptUrl">{t('expenses.receiptUrl', 'Receipt URL')}</Label>
              <Input
                id="receiptUrl"
                value={formData.receiptUrl}
                onChange={(e) => handleChange('receiptUrl', e.target.value)}
                placeholder={t('expenses.receiptPlaceholder', 'URL to receipt (optional)')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">{t('expenses.description', 'Description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder={t('expenses.descriptionPlaceholder', 'Expense description...')}
              rows={2}
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">{t('expenses.notes', 'Notes')}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder={t('expenses.notesPlaceholder', 'Additional notes (optional)...')}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit">
              {expense ? t('common.update', 'Update') : t('common.save', 'Save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};