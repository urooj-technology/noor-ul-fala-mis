import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Autocomplete } from '@/components/ui/autocomplete';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, Package } from 'lucide-react';
import useAdd from '@/api/useAdd';
import useUpdate from '@/api/useUpdate';
import useFetchObject from '@/api/useFetchObject';
import useFetchObjects from '@/api/useFetchObjects';

const AddEquipment = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category: '',
    unit_price: '',
    brand: '',
    model: '',
    description: '',
    is_active: true,
    initial_quantity: '0',
    initial_stock_category: '1',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: categoriesData } = useFetchObjects<{ results: { id: number; name: string }[] }>({
    queryKey: ['equipment-categories-options'],
    endpoint: 'equipment-categories/',
    params: { page_size: 200, is_active: true },
  });

  const { data, isLoading: fetching } = useFetchObject({
    queryKey: ['equipment', id],
    endpoint: `equipment/${id}/`,
    enabled: isEdit,
  });

  const { handleAdd, loading: adding, isSuccess: addSuccess } = useAdd({
    queryKey: 'equipment',
    endpoint: 'equipment/',
  });

  const { handleUpdate, loading: updating, isSuccess: updateSuccess } = useUpdate({
    queryKey: 'equipment',
    endpoint: 'equipment',
  });

  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name || '',
        barcode: data.barcode || '',
        category: String(data.category || ''),
        unit_price: String(data.unit_price || ''),
        brand: data.brand || '',
        model: data.model || '',
        description: data.description || '',
        is_active: data.is_active ?? true,
        initial_quantity: '0',
        initial_stock_category: '1',
      });
    }
  }, [data]);

  useEffect(() => {
    if (addSuccess || updateSuccess) navigate('/equipment');
  }, [addSuccess, updateSuccess, navigate]);

  const categories = categoriesData?.results || [];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = t('equipment.validation.name');
    if (!formData.barcode.trim()) newErrors.barcode = t('equipment.validation.barcode');
    if (!formData.category) newErrors.category = t('equipment.validation.category');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload: Record<string, unknown> = {
      name: formData.name.trim(),
      barcode: formData.barcode.trim(),
      category: Number(formData.category),
      unit_price: formData.unit_price || '0',
      brand: formData.brand || '',
      model: formData.model || '',
      description: formData.description || '',
      is_active: formData.is_active,
    };

    if (!isEdit) {
      payload.initial_quantity = parseInt(formData.initial_quantity, 10) || 0;
      payload.initial_stock_category = parseInt(formData.initial_stock_category, 10) || 1;
      handleAdd(payload);
    } else if (id) {
      handleUpdate({ id, data: payload });
    }
  };

  const stockLevelOptions = [
    { value: '1', label: t('equipment.stockCategory1') },
    { value: '2', label: t('equipment.stockCategory2') },
    { value: '3', label: t('equipment.stockCategory3') },
    { value: '4', label: t('equipment.stockCategory4') },
  ];

  if (fetching) {
    return <div className="container mx-auto py-6 text-center">{t('common.loading')}</div>;
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/equipment')} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? t('equipment.editEquipment') : t('equipment.addEquipment')}</h1>
          <p className="text-sm text-muted-foreground">{isEdit ? t('equipment.editEquipmentDesc') : t('equipment.addEquipmentDesc')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {t('equipment.equipmentInformation')}
          </CardTitle>
          <CardDescription>{t('equipment.referencePriceNote')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>{t('equipment.name')} <span className="text-destructive">*</span></Label>
                <Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label>{t('equipment.barcode')} <span className="text-destructive">*</span></Label>
                <Input value={formData.barcode} onChange={(e) => setFormData((p) => ({ ...p, barcode: e.target.value }))} className="font-mono" />
                {errors.barcode && <p className="text-xs text-destructive">{errors.barcode}</p>}
              </div>
              <div className="space-y-2">
                <Label>{t('equipment.equipmentTypeCategory')} <span className="text-destructive">*</span></Label>
                <Autocomplete
                  options={categories}
                  value={formData.category}
                  onChange={(v) => setFormData((p) => ({ ...p, category: v as string }))}
                  placeholder={t('equipment.selectEquipmentTypeCategory')}
                  getOptionLabel={(c) => c.name}
                  getOptionValue={(c) => c.id.toString()}
                />
                {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
              </div>
              <div className="space-y-2">
                <Label>{t('equipment.referencePrice')}</Label>
                <Input type="number" min="0" value={formData.unit_price} onChange={(e) => setFormData((p) => ({ ...p, unit_price: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('equipment.brand')}</Label>
                <Input value={formData.brand} onChange={(e) => setFormData((p) => ({ ...p, brand: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('equipment.model')}</Label>
                <Input value={formData.model} onChange={(e) => setFormData((p) => ({ ...p, model: e.target.value }))} />
              </div>
              {!isEdit && (
                <>
                  <div className="space-y-2">
                    <Label>{t('equipment.initialQuantity')}</Label>
                    <Input type="number" min="0" value={formData.initial_quantity} onChange={(e) => setFormData((p) => ({ ...p, initial_quantity: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('equipment.depreciationCategory')}</Label>
                    <Autocomplete
                      options={stockLevelOptions}
                      value={formData.initial_stock_category}
                      onChange={(v) => setFormData((p) => ({ ...p, initial_stock_category: v as string }))}
                      placeholder={t('equipment.selectDepreciationCategory')}
                      getOptionLabel={(o) => o.label}
                      getOptionValue={(o) => o.value}
                    />
                    <p className="text-xs text-muted-foreground">{t('equipment.initialQuantityHint')}</p>
                  </div>
                </>
              )}
              <div className="space-y-2 sm:col-span-2">
                <Label>{t('equipment.description')}</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/equipment')}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={adding || updating}>
                {isEdit ? t('common.save') : t('equipment.addEquipment')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddEquipment;
