import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { RotateCw, ArrowLeft, Building2, MapPin, FileText } from 'lucide-react';
import useAdd from '@/api/useAdd';

interface ShopFormData {
  shop_number: string;
  name: string;
  location: string;
  area: string;
  status: string;
  description?: string;
}

const defaultForm: ShopFormData = {
  shop_number: '',
  name: '',
  location: '',
  area: '',
  status: 'available',
  description: '',
};

const AddShop = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ShopFormData>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { handleAdd, loading, isSuccess } = useAdd<ShopFormData>({
    queryKey: ['shops'],
    endpoint: 'shops/',
  });

  useEffect(() => {
    if (isSuccess) {
      navigate('/shops');
    }
  }, [isSuccess, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.shop_number.trim()) newErrors.shop_number = t('shop-rental.validation.shopNumber');
    if (!formData.name.trim()) newErrors.name = t('shop-rental.validation.name');
    if (!formData.location.trim()) newErrors.location = t('shop-rental.validation.location');
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/shops')} className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('shop-rental.addShop')}</h1>
            <p className="text-sm text-muted-foreground">{t('shop-rental.manageShops', 'Manage Shops')}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {t('shop-rental.shopDetails', 'Shop Details')}
          </CardTitle>
          <CardDescription>{t('shop-rental.shopDetailsDesc', 'Enter shop information')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="shop_number" className="font-semibold">{t("shop-rental.shopNumber")} <span className="text-destructive">*</span></Label>
              <Input id="shop_number" value={formData.shop_number} onChange={(e) => { setFormData((prev) => ({ ...prev, shop_number: e.target.value })); if (errors.shop_number) setErrors((prev) => ({ ...prev, shop_number: "" })); }} placeholder={t("shop-rental.shopNumber")} className="h-10" />
              {errors.shop_number && <p className="text-xs text-destructive">{errors.shop_number}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className="font-semibold">{t("shop-rental.name")} <span className="text-destructive">*</span></Label>
              <Input id="name" value={formData.name} onChange={(e) => { setFormData((prev) => ({ ...prev, name: e.target.value })); if (errors.name) setErrors((prev) => ({ ...prev, name: "" })); }} placeholder={t("shop-rental.name")} className="h-10" />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4" />{t("shop-rental.location")} <span className="text-destructive">*</span></Label>
            <Input id="location" value={formData.location} onChange={(e) => { setFormData((prev) => ({ ...prev, location: e.target.value })); if (errors.location) setErrors((prev) => ({ ...prev, location: "" })); }} placeholder={t("shop-rental.location")} className="h-10" />
            {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="area" className="font-semibold">{t("shop-rental.area")}</Label>
              <Input id="area" type="number" step="0.01" value={formData.area} onChange={(e) => setFormData((prev) => ({ ...prev, area: e.target.value }))} placeholder={t("shop-rental.area")} className="h-10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status" className="font-semibold">{t("shop-rental.status")} <span className="text-destructive">*</span></Label>
              <Select value={formData.status} onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger className="h-10"><SelectValue placeholder={t("shop-rental.selectStatus")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">{t("shop-rental.statusOptions.available")}</SelectItem>
                  <SelectItem value="rented">{t("shop-rental.statusOptions.rented")}</SelectItem>
                  <SelectItem value="maintenance">{t("shop-rental.statusOptions.maintenance")}</SelectItem>
                  <SelectItem value="reserved">{t("shop-rental.statusOptions.reserved")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" />{t("shop-rental.description")}</Label>
            <Input id="description" value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} placeholder={t("shop-rental.description")} className="h-10" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => navigate('/shops')} disabled={loading} className="h-10 px-6">{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={loading} className="h-10 px-6">
              {loading ? (<><RotateCw className="animate-spin mr-2" />{t('common.adding')}</>) : (t('common.add'))}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddShop;
