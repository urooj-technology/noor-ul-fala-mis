import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, Tag } from 'lucide-react';
import useAdd from '@/api/useAdd';
import useUpdate from '@/api/useUpdate';
import useFetchObject from '@/api/useFetchObject';

const AddEquipmentCategory = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [formData, setFormData] = useState({ name: '', description: '', is_active: true });

  const { data } = useFetchObject({ queryKey: ['equipment-category', id], endpoint: `equipment-categories/${id}/`, enabled: isEdit });
  const { handleAdd, isSuccess: addSuccess, loading: adding } = useAdd({ queryKey: ['equipment-categories'], endpoint: 'equipment-categories/' });
  const { handleUpdate, isSuccess: updateSuccess, loading: updating } = useUpdate({ queryKey: ['equipment-categories'] });

  useEffect(() => { if (data) setFormData({ name: data.name || '', description: data.description || '', is_active: data.is_active ?? true }); }, [data]);
  useEffect(() => { if (addSuccess || updateSuccess) navigate('/equipment-categories'); }, [addSuccess, updateSuccess, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (isEdit && id) handleUpdate(id, formData);
    else handleAdd(formData);
  };

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/equipment-categories')}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold">{isEdit ? t('equipment.editCategory') : t('equipment.addCategory')}</h1>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5" />{t('equipment.categoryName')}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>{t('equipment.categoryName')}</Label><Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>{t('equipment.description')}</Label><Textarea value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/equipment-categories')}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={adding || updating}>{t('common.save')}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddEquipmentCategory;
