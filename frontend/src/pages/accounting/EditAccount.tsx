import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { RotateCw, ArrowLeft, Wallet, Hash, FolderTree, DollarSign } from 'lucide-react';
import useUpdate from '@/api/useUpdate';
import useFetchObject from '@/api/useFetchObject';

interface AccountFormData {
  name: string;
  code: string;
  account_type: string;
  parent?: string;
  is_active: boolean;
  is_detail: boolean;
  currency: string;
}

const ACCOUNT_TYPES = [
  { value: 'asset', labelKey: 'accounting.asset' },
  { value: 'liability', labelKey: 'accounting.liability' },
  { value: 'equity', labelKey: 'accounting.equity' },
  { value: 'income', labelKey: 'accounting.income' },
  { value: 'expense', labelKey: 'accounting.expense' },
];

const EditAccount = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    code: '',
    account_type: '',
    parent: undefined,
    is_active: true,
    is_detail: true,
    currency: 'AFN',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, isLoading: fetching } = useFetchObject({
    queryKey: ['account', id],
    endpoint: `accounts/${id}/`,
  });

  const { handleUpdate, loading, isSuccess } = useUpdate({ queryKey: ['accounts'] });

  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name || '',
        code: data.code || '',
        account_type: data.account_type || '',
        parent: data.parent || undefined,
        is_active: data.is_active ?? true,
        is_detail: data.is_detail ?? true,
        currency: data.currency || 'AFN',
      });
    }
  }, [data]);

  useEffect(() => {
    if (isSuccess) navigate('/accounts');
  }, [isSuccess, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.account_type) newErrors.account_type = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    handleUpdate(id, formData);
  };

  if (fetching) return <div className="container mx-auto py-6 text-center">{t('common.loading')}</div>;

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/accounts')} className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('accounting.editAccount')}</h1>
            <p className="text-sm text-muted-foreground">{t('accounting.manageAccounts', 'Manage Accounts')}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            {t('accounting.accountDetails', 'Account Details')}
          </CardTitle>
          <CardDescription>{t('accounting.accountDetailsDescEdit', 'Update account information')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-semibold flex items-center gap-2"><Wallet className="h-4 w-4" />{t("accounting.accountName")} <span className="text-destructive">*</span></Label>
              <Input id="name" value={formData.name} onChange={(e) => { setFormData((prev) => ({ ...prev, name: e.target.value })); if (errors.name) setErrors((prev) => ({ ...prev, name: "" })); }} placeholder={t("accounting.accountNamePlaceholder")} className="h-10" />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="code" className="font-semibold flex items-center gap-2"><Hash className="h-4 w-4" />{t("accounting.accountCode")} <span className="text-destructive">*</span></Label>
              <Input id="code" value={formData.code} onChange={(e) => { setFormData((prev) => ({ ...prev, code: e.target.value })); if (errors.code) setErrors((prev) => ({ ...prev, code: "" })); }} placeholder={t("accounting.accountCodePlaceholder")} className="h-10" />
              {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="account_type" className="font-semibold flex items-center gap-2"><FolderTree className="h-4 w-4" />{t("accounting.accountType")} <span className="text-destructive">*</span></Label>
              <Select value={formData.account_type} onValueChange={(value) => { setFormData((prev) => ({ ...prev, account_type: value })); if (errors.account_type) setErrors((prev) => ({ ...prev, account_type: "" })); }}>
                <SelectTrigger className="h-10"><SelectValue placeholder={t("accounting.accountTypePlaceholder", "Select account type")} /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{t(type.labelKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.account_type && <p className="text-xs text-destructive">{errors.account_type}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent" className="font-semibold">{t("accounting.parentAccount")}</Label>
              <Select value={formData.parent || '__none__'} onValueChange={(value) => setFormData((prev) => ({ ...prev, parent: value === '__none__' ? undefined : value }))}>
                <SelectTrigger className="h-10"><SelectValue placeholder={t("accounting.parentAccountPlaceholder")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("common.none")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="currency" className="font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" />{t("accounting.currency")} <span className="text-destructive">*</span></Label>
              <Select value={formData.currency} onValueChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AFN">{t("accounting.afn")}</SelectItem>
                  <SelectItem value="USD">{t("accounting.usd")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="is_active" className="font-semibold">{t("accounting.isActive")}</Label>
              <Select value={formData.is_active.toString()} onValueChange={(value) => setFormData((prev) => ({ ...prev, is_active: value === "true" }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">{t("common.yes")}</SelectItem>
                  <SelectItem value="false">{t("common.no")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="is_detail" className="font-semibold">{t("accounting.isDetail")}</Label>
              <Select value={formData.is_detail.toString()} onValueChange={(value) => setFormData((prev) => ({ ...prev, is_detail: value === "true" }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">{t("common.yes")}</SelectItem>
                  <SelectItem value="false">{t("common.no")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => navigate('/accounts')} disabled={loading} className="h-10 px-6">{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={loading} className="h-10 px-6">
              {loading ? <><RotateCw className="animate-spin mr-2" />{t('common.updating')}</> : t('common.update')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditAccount;
