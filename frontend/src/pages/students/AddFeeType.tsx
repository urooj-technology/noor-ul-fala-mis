import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { RotateCw, ArrowLeft, Tag, DollarSign } from 'lucide-react';
import useAdd from '@/api/useAdd';
import useUpdate from '@/api/useUpdate';
import useFetchObject from '@/api/useFetchObject';

const AddFeeType = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'other',
    description: '',
    is_active: true,
    is_mandatory: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, isLoading: fetching } = useFetchObject({
    queryKey: ['fee-type', id || ''],
    endpoint: `fee-types/${id}/`,
    enabled: isEdit,
  });

  const { handleAdd, loading: adding, isSuccess: addSuccess } = useAdd({
    queryKey: ['fee-types'],
    endpoint: 'fee-types/',
  });

  const { handleUpdate, loading: updating, isSuccess: updateSuccess } = useUpdate({
    queryKey: ['fee-types'],
  });

  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name || '',
        code: data.code || '',
        category: data.category || 'other',
        description: data.description || '',
        is_active: data.is_active ?? true,
        is_mandatory: data.is_mandatory ?? true,
      });
    }
  }, [data]);

  useEffect(() => {
    if (addSuccess || updateSuccess) navigate('/fee-types');
  }, [addSuccess, updateSuccess, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = t('validation.required');
    if (!formData.code) newErrors.code = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (isEdit && id) {
      handleUpdate(id, formData);
    } else {
      handleAdd(formData);
    }
  };

  const categories = [
    { value: 'admission', label: t('students.feeCategories.admission', 'Admission Fee') },
    { value: 'book', label: t('students.feeCategories.book', 'Book Fee') },
    { value: 'uniform', label: t('students.feeCategories.uniform', 'Uniform Fee') },
    { value: 'transportation', label: t('students.feeCategories.transportation', 'Transportation Fee') },
    { value: 'exam', label: t('students.feeCategories.exam', 'Exam Fee') },
    { value: 'other', label: t('students.feeCategories.other', 'Other Fee') },
  ];

  if (fetching) return <div className="container mx-auto py-6 text-center">{t('common.loading')}</div>;

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/fee-types')} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? t('students.editFeeType', 'Edit Fee Type') : t('students.addFeeType', 'Add Fee Type')}</h1>
          <p className="text-sm text-muted-foreground">{t('students.manageFeeTypes', 'Manage fee types')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            {t('students.feeTypeInformation', 'Fee Type Information')}
          </CardTitle>
          <CardDescription>{isEdit ? t('students.editFeeTypeDesc', 'Update fee type details') : t('students.addFeeTypeDesc', 'Create a new fee type')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-semibold">{t('students.feeName', 'Fee Name')} <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => { setFormData(prev => ({ ...prev, name: e.target.value })); if (errors.name) setErrors(prev => ({ ...prev, name: '' })); }}
                  placeholder="e.g. Monthly Tuition"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="code" className="font-semibold">{t('students.code', 'Code')} <span className="text-destructive">*</span></Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => { setFormData(prev => ({ ...prev, code: e.target.value })); if (errors.code) setErrors(prev => ({ ...prev, code: '' })); }}
                  placeholder="e.g. TUITION"
                />
                {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="font-semibold">{t('students.category', 'Category')}</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full h-10 px-3 border rounded-md bg-background"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="font-semibold">{t('students.description', 'Description')}</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4"
                />
                <span>{t('students.active', 'Active')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_mandatory}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_mandatory: e.target.checked }))}
                  className="h-4 w-4"
                />
                <span>{t('students.mandatory', 'Mandatory')}</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate('/fee-types')} disabled={adding || updating}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={adding || updating}>
                {adding || updating ? <><RotateCw className="animate-spin mr-2" />{t('common.saving')}</> : t('common.save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddFeeType;
