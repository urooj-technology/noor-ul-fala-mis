import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import useAdd from '@/api/useAdd';
import {
  StudentForm,
  StudentFormData,
} from '@/components/students/StudentForm';
import { StudentDocumentField } from '@/components/students/StudentDocumentUploadField';

const defaultForm: StudentFormData = {
  full_name: '',
  father_name: '',
  grandfather_name: '',
  date_of_birth: new Date().toISOString().split('T')[0],
  gender: 'male',
  tazkira_number: '',
  permanent_address: '',
  current_address: '',
  province: '',
  district: '',
  area: '',
  parent_phone: '',
  student_phone: '',
  alternative_phone: '',
  email: '',
  registration_number: '',
  registration_date: new Date().toISOString().split('T')[0],
  status: 'active',
  fee_type: 'paid',
  transportation: 'school_bus',
  class_level: '',
  photo: null,
  tazkira_copy: null,
  parent_tazkira_copy: null,
  previous_result_card: null,
  payment_receipt: null,
};

const AddStudent = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<StudentFormData>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previews, setPreviews] = useState<Partial<Record<StudentDocumentField | 'photo', string>>>({});

  const { handleAdd, loading, isSuccess } = useAdd<StudentFormData>({
    queryKey: 'students',
    endpoint: 'students/',
  });

  useEffect(() => {
    if (isSuccess) navigate('/students');
  }, [isSuccess, navigate]);

  const onFieldChange = <K extends keyof StudentFormData>(key: K, value: StudentFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const onClearError = (key: string) => {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleFileChange = (field: StudentDocumentField | 'photo', file: File | null) => {
    setFormData((prev) => ({ ...prev, [field]: file }));
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } else {
      setPreviews((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const clearFile = (field: StudentDocumentField | 'photo') => {
    setFormData((prev) => ({ ...prev, [field]: null }));
    setPreviews((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.full_name.trim()) newErrors.full_name = t('students.validation.fullName');
    if (!formData.father_name.trim()) newErrors.father_name = t('students.validation.fatherName');
    if (!formData.tazkira_number.trim()) newErrors.tazkira_number = t('students.validation.tazkiraNumber');
    if (!formData.registration_number.trim()) {
      newErrors.registration_number = t('students.validation.registrationNumber');
    }
    if (!formData.registration_date) newErrors.registration_date = t('students.validation.registrationDate');
    if (!formData.parent_phone.trim()) newErrors.parent_phone = t('students.validation.phone');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const submitData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        submitData.append(key, value as string | Blob);
      }
    });
    handleAdd(submitData);
  };

  return (
    <StudentForm
      mode="add"
      formData={formData}
      errors={errors}
      previews={previews}
      loading={loading}
      onFieldChange={onFieldChange}
      onClearError={onClearError}
      onFileChange={handleFileChange}
      onClearFile={clearFile}
      onSubmit={handleSubmit}
    />
  );
};

export default AddStudent;
