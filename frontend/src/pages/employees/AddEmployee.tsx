import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { ReloadIcon } from '@radix-ui/react-icons';
import { ArrowLeft, Users } from 'lucide-react';
import useAdd from '@/api/useAdd';
import { toNumberOr } from '@/lib/digits';

interface EmployeeFormData {
  full_name: string;
  phone: string;
  address: string;
  position: string;
  salary: number | string;
  currency: string;
  is_active: boolean;
}

const defaultForm: EmployeeFormData = {
  full_name: '',
  phone: '',
  address: '',
  position: '',
  salary: '',
  currency: 'AFN',
  is_active: true,
};

const AddEmployee = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<EmployeeFormData>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { handleAdd, loading, isSuccess } = useAdd<EmployeeFormData>({
    queryKey: ['employees'],
    endpoint: 'employees/',
  });

  useEffect(() => {
    if (isSuccess) {
      navigate('/employees');
    }
  }, [isSuccess, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.full_name.trim()) newErrors.full_name = t('validation.required');
    if (toNumberOr(formData.salary) < 0) newErrors.salary = t('validation.positive');
    if (!formData.currency) newErrors.currency = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    handleAdd({ ...formData, salary: toNumberOr(formData.salary) });
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/employees')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-base font-boldtext-sm">{t('employees.addEmployee')}</h1>
        </div>
      </div>
      
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">{t("employees.fullName")} *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, full_name: e.target.value }));
                    if (errors.full_name) setErrors((prev) => ({ ...prev, full_name: "" }));
                  }}
                  placeholder={t("employees.fullNamePlaceholder")}
                />
                {errors.full_name && <p className="text-base text-destructivetext-xs">{errors.full_name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("employees.phone")}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder={t("employees.phonePlaceholder")}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position">{t("employees.position")}</Label>
                <Select
                  value={formData.position || undefined}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, position: value }))}
                >
                  <SelectTrigger id="position">
                    <SelectValue placeholder={t("employees.positionPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">{t("employees.positionOptions.teacher")}</SelectItem>
                    <SelectItem value="finance">{t("employees.positionOptions.finance")}</SelectItem>
                    <SelectItem value="office_employee">{t("employees.positionOptions.office_employee")}</SelectItem>
                    <SelectItem value="cleaner">{t("employees.positionOptions.cleaner")}</SelectItem>
                    <SelectItem value="security">{t("employees.positionOptions.security")}</SelectItem>
                    <SelectItem value="other">{t("employees.positionOptions.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{t("employees.address")}</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder={t("employees.addressPlaceholder")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary">{t("employees.salary")} *</Label>
                <NumericInput maxDecimals={2}
                  id="salary"
                  value={formData.salary}
                  onValueChange={(v) => {
                    setFormData((prev) => ({ ...prev, salary: v }));
                    if (errors.salary) setErrors((prev) => ({ ...prev, salary: "" }));
                  }}
                  placeholder={t("employees.salaryPlaceholder")}
                />
                {errors.salary && <p className="text-base text-destructivetext-xs">{errors.salary}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">{t("employees.currency")} *</Label>
                <select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, currency: e.target.value }));
                    if (errors.currency) setErrors((prev) => ({ ...prev, currency: "" }));
                  }}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">{t("employees.currencyPlaceholder")}</option>
                  <option value="AFN">AFN - Afghan Afghani</option>
                  <option value="USD">USD - US Dollar</option>
                </select>
                {errors.currency && <p className="text-base text-destructivetext-xs">{errors.currency}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t("employees.status")}</Label>
                <Select
                  value={formData.is_active.toString()}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, is_active: value === "true" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t("employees.active")}</SelectItem>
                    <SelectItem value="false">{t("employees.inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate('/employees')} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <ReloadIcon className="animate-spin mr-2" />
                  {t('common.adding')}
                </>
              ) : (
                t('common.add')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddEmployee;
