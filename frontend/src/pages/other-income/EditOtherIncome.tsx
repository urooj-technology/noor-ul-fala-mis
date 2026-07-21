import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Autocomplete } from '@/components/ui/autocomplete';
import DatePicker from '@/components/ui/date-picker-calendar';
import { useLanguage } from '@/contexts/LanguageContext';
import { RotateCw, ArrowLeft, DollarSign, Tag, FileText, Building2 } from 'lucide-react';
import useUpdate from '@/api/useUpdate';
import useFetchObject from '@/api/useFetchObject';

interface OtherIncomeFormData {
  income_category: string;
  amount: string;
  currency: string;
  income_date: string;
  source: string;
  description?: string;
}

const EditOtherIncome = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState<OtherIncomeFormData>({
    income_category: '',
    amount: '',
    currency: 'AFN',
    income_date: new Date().toISOString().split('T')[0],
    source: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, isLoading: fetching } = useFetchObject({
    queryKey: ['other-income', id],
    endpoint: `other-incomes/${id}/`,
  });

  const { handleUpdate, loading, isSuccess } = useUpdate({ queryKey: ['other-incomes'] });

  useEffect(() => {
    if (data) {
      setFormData({
        income_category: data.income_category?.id?.toString() || data.income_category?.toString() || '',
        amount: data.amount?.toString() || '',
        currency: data.currency?.toString() || 'AFN',
        income_date: data.income_date ? data.income_date.slice(0, 10) : new Date().toISOString().split('T')[0],
        source: data.source || '',
        description: data.description || '',
      });
    }
  }, [data]);

  useEffect(() => {
    if (isSuccess) navigate('/other-incomes');
  }, [isSuccess, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.income_category) newErrors.income_category = t('other-income.validation.category');
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = t('other-income.validation.amount');
    if (!formData.income_date) newErrors.income_date = t('other-income.validation.incomeDate');
    if (!formData.source.trim()) newErrors.source = t('other-income.validation.source');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const submitData = new FormData();
    submitData.append('income_category', formData.income_category);
    submitData.append('amount', formData.amount);
    submitData.append('income_date', formData.income_date);
    submitData.append('currency', formData.currency);
    submitData.append('source', formData.source);
    if (formData.description?.trim()) submitData.append('description', formData.description.trim());

    handleUpdate(id, submitData);
  };

  if (fetching) return <div className="container mx-auto py-6 text-center">{t('common.loading')}</div>;

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/other-incomes')} className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('other-income.editIncome')}</h1>
            <p className="text-sm text-muted-foreground">{t('other-income.manageIncomes', 'Manage Other Incomes')}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            {t('other-income.editIncome')}
          </CardTitle>
          <CardDescription>{t('other-income.incomeDetailsDescEdit', 'Update income entry information')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="income_category" className="font-semibold flex items-center gap-2"><Tag className="h-4 w-4" />{t("other-income.category")} <span className="text-destructive">*</span></Label>
              <Autocomplete endpoint="income-categories/" value={formData.income_category} onChange={(value) => { setFormData((prev) => ({ ...prev, income_category: value })); if (errors.income_category) setErrors((prev) => ({ ...prev, income_category: "" })); }} placeholder={t("other-income.selectCategory")} getOptionLabel={(c) => c.name} getOptionValue={(c) => c.id.toString()} />
              {errors.income_category && <p className="text-xs text-destructive">{errors.income_category}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount" className="font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" />{t("other-income.amount")} <span className="text-destructive">*</span></Label>
              <NumericInput maxDecimals={2} id="amount" value={formData.amount} onChange={(e) => { setFormData((prev) => ({ ...prev, amount: e.target.value })); if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" })); }} placeholder={t("other-income.enterAmount")} className="h-10" />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="currency" className="font-semibold">{t("other-income.currency")} <span className="text-destructive">*</span></Label>
              <Select value={formData.currency} onValueChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AFN">{t("other-income.afn")}</SelectItem>
                  <SelectItem value="USD">{t("other-income.usd")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <DatePicker
                value={formData.income_date}
                onChange={(date) => {
                  setFormData((prev) => ({ ...prev, income_date: date }));
                  if (errors.income_date) setErrors((prev) => ({ ...prev, income_date: "" }));
                }}
                label={t("other-income.incomeDate")}
                placeholder={t("other-income.incomeDate", "تاریخ درآمد")}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source" className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" />{t("other-income.source")} <span className="text-destructive">*</span></Label>
            <Input id="source" value={formData.source} onChange={(e) => { setFormData((prev) => ({ ...prev, source: e.target.value })); if (errors.source) setErrors((prev) => ({ ...prev, source: "" })); }} placeholder={t("other-income.enterSource")} className="h-10" />
            {errors.source && <p className="text-xs text-destructive">{errors.source}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" />{t("other-income.description")}</Label>
            <Input id="description" value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} placeholder={t("other-income.enterDescription")} className="h-10" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => navigate('/other-incomes')} disabled={loading} className="h-10 px-6">{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={loading} className="h-10 px-6">
              {loading ? <><RotateCw className="animate-spin mr-2" />{t('common.updating')}</> : t('common.update')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditOtherIncome;
