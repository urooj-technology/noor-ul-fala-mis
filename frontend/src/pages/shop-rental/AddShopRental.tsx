import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Autocomplete } from '@/components/ui/autocomplete';
import { useLanguage } from '@/contexts/LanguageContext';
import { RotateCw, ArrowLeft, Building2, User, Calendar, DollarSign, FileText } from 'lucide-react';
import useAdd from '@/api/useAdd';
import DatePicker from '@/components/ui/date-picker-calendar';

interface ShopRentalFormData {
  shop: string;
  tenant: string;
  start_date: string;
  end_date: string;
  monthly_rent: string;
  currency: string;
  rental_status: string;
  security_deposit: string;
  description?: string;
}

const defaultForm: ShopRentalFormData = {
  shop: '',
  tenant: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
  monthly_rent: '',
  currency: 'AFN',
  rental_status: 'active',
  security_deposit: '',
  description: '',
};

const AddShopRental = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ShopRentalFormData>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { handleAdd, loading, isSuccess } = useAdd<ShopRentalFormData>({
    queryKey: ['shop-rentals'],
    endpoint: 'shop-rentals/',
  });

  useEffect(() => {
    if (isSuccess) {
      navigate('/shop-rentals');
    }
  }, [isSuccess, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.shop) newErrors.shop = t('shop-rental.validation.shop');
    if (!formData.tenant) newErrors.tenant = t('shop-rental.validation.tenant');
    if (!formData.start_date) newErrors.start_date = t('shop-rental.validation.startDate');
    if (!formData.end_date) newErrors.end_date = t('shop-rental.validation.endDate');
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/shop-rentals')} className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('shop-rental.addRental')}</h1>
            <p className="text-sm text-muted-foreground">{t('shop-rental.manageRentals', 'Manage Rentals')}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {t('shop-rental.rentalDetails', 'Rental Details')}
          </CardTitle>
          <CardDescription>{t('shop-rental.rentalDetailsDesc', 'Create a new shop rental agreement')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="shop" className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" />{t("shop-rental.shop")} <span className="text-destructive">*</span></Label>
              <Autocomplete endpoint="shops/" value={formData.shop} onChange={(value) => { setFormData((prev) => ({ ...prev, shop: value })); if (errors.shop) setErrors((prev) => ({ ...prev, shop: "" })); }} placeholder={t("shop-rental.selectShop")} getOptionLabel={(s) => s.name} getOptionValue={(s) => s.id.toString()} />
              {errors.shop && <p className="text-xs text-destructive">{errors.shop}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant" className="font-semibold flex items-center gap-2"><User className="h-4 w-4" />{t("shop-rental.tenant")} <span className="text-destructive">*</span></Label>
              <Autocomplete endpoint="tenants/" value={formData.tenant} onChange={(value) => { setFormData((prev) => ({ ...prev, tenant: value })); if (errors.tenant) setErrors((prev) => ({ ...prev, tenant: "" })); }} placeholder={t("shop-rental.selectTenant")} getOptionLabel={(t) => t.full_name} getOptionValue={(t) => t.id.toString()} />
              {errors.tenant && <p className="text-xs text-destructive">{errors.tenant}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" />{t("shop-rental.startDate")} <span className="text-destructive">*</span></Label>
              <DatePicker
                value={formData.start_date}
                onChange={(date) => { setFormData((prev) => ({ ...prev, start_date: date?.toISOString().slice(0, 10) || '' })); if (errors.start_date) setErrors((prev) => ({ ...prev, start_date: "" })); }}
                className="h-10"
              />
              {errors.start_date && <p className="text-xs text-destructive">{errors.start_date}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date" className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" />{t("shop-rental.endDate")} <span className="text-destructive">*</span></Label>
              <DatePicker
                value={formData.end_date}
                onChange={(date) => { setFormData((prev) => ({ ...prev, end_date: date?.toISOString().slice(0, 10) || '' })); if (errors.end_date) setErrors((prev) => ({ ...prev, end_date: "" })); }}
                className="h-10"
              />
              {errors.end_date && <p className="text-xs text-destructive">{errors.end_date}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="monthly_rent" className="font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" />{t("shop-rental.monthlyRent")} <span className="text-destructive">*</span></Label>
              <Input id="monthly_rent" type="number" step="0.01" value={formData.monthly_rent} onChange={(e) => setFormData((prev) => ({ ...prev, monthly_rent: e.target.value }))} placeholder={t("shop-rental.monthlyRent")} className="h-10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency" className="font-semibold">{t("shop-rental.currency")} <span className="text-destructive">*</span></Label>
              <Select value={formData.currency} onValueChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AFN">{t("shop-rental.afn")}</SelectItem>
                  <SelectItem value="USD">{t("shop-rental.usd")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="rental_status" className="font-semibold">{t("shop-rental.rentalStatus")} <span className="text-destructive">*</span></Label>
              <Select value={formData.rental_status} onValueChange={(value) => setFormData((prev) => ({ ...prev, rental_status: value }))}>
                <SelectTrigger className="h-10"><SelectValue placeholder={t("shop-rental.selectRentalStatus")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("shop-rental.rentalStatusOptions.active")}</SelectItem>
                  <SelectItem value="expired">{t("shop-rental.rentalStatusOptions.expired")}</SelectItem>
                  <SelectItem value="cancelled">{t("shop-rental.rentalStatusOptions.cancelled")}</SelectItem>
                  <SelectItem value="renewed">{t("shop-rental.rentalStatusOptions.renewed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="security_deposit" className="font-semibold">{t("shop-rental.securityDeposit")}</Label>
              <Input id="security_deposit" type="number" step="0.01" value={formData.security_deposit} onChange={(e) => setFormData((prev) => ({ ...prev, security_deposit: e.target.value }))} placeholder={t("shop-rental.securityDeposit")} className="h-10" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" />{t("shop-rental.description")}</Label>
            <Input id="description" value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} placeholder={t("shop-rental.description")} className="h-10" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => navigate('/shop-rentals')} disabled={loading} className="h-10 px-6">{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={loading} className="h-10 px-6">
              {loading ? (<><RotateCw className="animate-spin mr-2" />{t('common.adding')}</>) : (t('common.add'))}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddShopRental;
