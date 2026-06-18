import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { RotateCw, ArrowLeft, Calendar, Tag, CheckCircle } from 'lucide-react';
import useAdd from '@/api/useAdd';
import DatePicker from '@/components/ui/date-picker-calendar';

interface FiscalYearFormData {
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
}

const AddFiscalYear = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FiscalYearFormData>({
    name: '',
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end_date: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
    is_closed: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { handleAdd, loading, isSuccess } = useAdd<FiscalYearFormData>({
    queryKey: ['fiscal-years'],
    endpoint: 'fiscal-years/',
  });

  useEffect(() => {
    if (isSuccess) navigate('/fiscal-years');
  }, [isSuccess, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (!formData.start_date) newErrors.start_date = t('validation.required');
    if (!formData.end_date) newErrors.end_date = t('validation.required');
    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      newErrors.dateRange = t('accounting.startDateMustBeBeforeEndDate');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    handleAdd(formData);
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/fiscal-years')} className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('accounting.addFiscalYear')}</h1>
            <p className="text-sm text-muted-foreground">{t('accounting.manageFiscalYears', 'Manage Fiscal Years')}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {t('accounting.fiscalYearDetails', 'Fiscal Year Details')}
          </CardTitle>
          <CardDescription>{t('accounting.fiscalYearDetailsDesc', 'Create a new fiscal year')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-semibold flex items-center gap-2"><Tag className="h-4 w-4" />{t("accounting.fiscalYearName")} <span className="text-destructive">*</span></Label>
            <Input id="name" value={formData.name} onChange={(e) => { setFormData((prev) => ({ ...prev, name: e.target.value })); if (errors.name) setErrors((prev) => ({ ...prev, name: "" })); }} placeholder={t("accounting.fiscalYearNamePlaceholder")} className="h-10" />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <DatePicker
                label={t("accounting.fiscalYearStartDate")}
                required
                value={formData.start_date}
                onChange={(d) => { setFormData((prev) => ({ ...prev, start_date: d })); if (errors.start_date) setErrors((prev) => ({ ...prev, start_date: "" })); }}
                placeholder={t('accounting.selectDate', 'Select date')}
              />
              {errors.start_date && <p className="text-xs text-destructive">{errors.start_date}</p>}
            </div>
            <div className="space-y-2">
              <DatePicker
                label={t("accounting.fiscalYearEndDate")}
                required
                value={formData.end_date}
                onChange={(d) => { setFormData((prev) => ({ ...prev, end_date: d })); if (errors.end_date) setErrors((prev) => ({ ...prev, end_date: "" })); }}
                placeholder={t('accounting.selectDate', 'Select date')}
              />
              {errors.end_date && <p className="text-xs text-destructive">{errors.end_date}</p>}
            </div>
          </div>

          {errors.dateRange && <div className="p-4 bg-red-100 text-red-800 rounded-md text-sm">{errors.dateRange}</div>}

          <div className="space-y-2">
            <Label htmlFor="is_closed" className="font-semibold flex items-center gap-2"><CheckCircle className="h-4 w-4" />{t("accounting.isClosed")}</Label>
            <Select value={formData.is_closed.toString()} onValueChange={(value) => setFormData((prev) => ({ ...prev, is_closed: value === "true" }))}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="false">{t("accounting.open")}</SelectItem>
                <SelectItem value="true">{t("accounting.closed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => navigate('/fiscal-years')} disabled={loading} className="h-10 px-6">{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={loading} className="h-10 px-6">
              {loading ? <><RotateCw className="animate-spin mr-2" />{t('common.adding')}</> : t('common.add')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddFiscalYear;
