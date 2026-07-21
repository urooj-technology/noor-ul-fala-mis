import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Autocomplete } from '@/components/ui/autocomplete';
import DatePicker from '@/components/ui/date-picker-calendar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { RotateCw, ArrowLeft, Receipt, DollarSign, Calendar, Tag, User, FileText } from 'lucide-react';
import useUpdate from '@/api/useUpdate';
import useFetchObject from '@/api/useFetchObject';

const EditExpense = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    expense_date: new Date().toISOString().slice(0, 10),
    currency: '',
    description: '',
    user: '',
    receipt: null as File | null
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, isLoading: fetching } = useFetchObject({
    queryKey: ['expense', id],
    endpoint: `expenses/${id}/`,
  });

  const { handleUpdate, loading, isSuccess } = useUpdate({ queryKey: ['expenses'] });

  useEffect(() => {
    if (data) {
      setFormData({
        category: data.category?.toString() || '',
        amount: data.amount?.toString() || '',
        expense_date: data.expense_date ? data.expense_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        currency: data.currency?.toString() || '',
        description: data.description || '',
        user: data.user?.toString() || '',
        receipt: null
      });
    }
  }, [data]);

  useEffect(() => {
    if (isSuccess) navigate('/expenses');
  }, [isSuccess, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.category) newErrors.category = t('validation.required');
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = t('validation.positive');
    if (!formData.expense_date) newErrors.expense_date = t('validation.required');
    if (!formData.currency) newErrors.currency = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !id) return;

    const submitData = new FormData();
    submitData.append('category', formData.category);
    submitData.append('amount', formData.amount);
    submitData.append('expense_date', formData.expense_date);
    submitData.append('currency', formData.currency);
    if (formData.description?.trim()) submitData.append('description', formData.description.trim());
    if (formData.user) submitData.append('user', formData.user);
    if (formData.receipt) submitData.append('receipt', formData.receipt);

    handleUpdate(id, submitData);
  };

  if (fetching) return <div className="container mx-auto py-6 text-center">{t('common.loading')}</div>;

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/expenses')} className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('expenses.editExpense')}</h1>
            <p className="text-sm text-muted-foreground">{t('expenses.manageExpenses', 'Manage expenses')}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            {t('expenses.expenseDetails', 'Expense Details')}
          </CardTitle>
          <CardDescription>{t('expenses.editExpenseDesc', 'Update expense information')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="category" className="font-semibold flex items-center gap-2"><Tag className="h-4 w-4" />{t('expenses.category')} <span className="text-destructive">*</span></Label>
                <Autocomplete
                  endpoint="expense-categories/"
                  value={formData.category}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, category: value }));
                    if (errors.category) setErrors(prev => ({ ...prev, category: '' }));
                  }}
                  placeholder={t('expenses.selectCategory')}
                  labelKey="name"
                  valueKey="id"
                />
                {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" />{t('expenses.amount')} <span className="text-destructive">*</span></Label>
                <NumericInput maxDecimals={2}
                  id="amount"
                  value={formData.amount}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, amount: e.target.value }));
                    if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }));
                  }}
                  placeholder={t('expenses.enterAmount')}
                  className="h-10"
                />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="currency" className="font-semibold">{t('expenses.currency')} <span className="text-destructive">*</span></Label>
                <select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full h-10 px-3 border rounded-md bg-background"
                >
                  <option value="">Select Currency</option>
                  <option value="AFN">AFN - Afghan Afghani</option>
                  <option value="USD">USD - US Dollar</option>
                </select>
                {errors.currency && <p className="text-xs text-destructive">{errors.currency}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense_date" className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" />{t('expenses.expenseDate')} <span className="text-destructive">*</span></Label>
                <DatePicker
                  value={formData.expense_date}
                  onChange={(date) => {
                    setFormData(prev => ({ ...prev, expense_date: date }));
                    if (errors.expense_date) setErrors(prev => ({ ...prev, expense_date: '' }));
                  }}
                  label={t('expenses.expenseDate')}
                  placeholder={t('expenses.expenseDate', 'تاریخ مصرف')}
                />
                {errors.expense_date && <p className="text-xs text-destructive">{errors.expense_date}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="user" className="font-semibold flex items-center gap-2"><User className="h-4 w-4" />{t('expenses.user')}</Label>
                <Autocomplete
                  endpoint="users/"
                  value={formData.user}
                  onChange={(value) => setFormData(prev => ({ ...prev, user: value }))}
                  placeholder={t('expenses.selectUser')}
                  labelKey="username"
                  valueKey="id"
                  disabled={!user?.is_staff}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receipt" className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" />{t('expenses.receipt')}</Label>
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setFormData(prev => ({ ...prev, receipt: e.target.files?.[0] || null }))}
                  className="h-10"
                />
                {data?.receipt && (
                  <p className="text-xs text-muted-foreground">
                    Current: <a href={data.receipt} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Receipt</a>
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="font-semibold">{t('expenses.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('expenses.enterDescription')}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate('/expenses')} disabled={loading} className="h-10 px-6">{t('common.cancel')}</Button>
              <Button type="submit" disabled={loading} className="h-10 px-6">
                {loading ? <><RotateCw className="animate-spin mr-2" />{t('common.updating')}</> : t('common.update')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditExpense;
