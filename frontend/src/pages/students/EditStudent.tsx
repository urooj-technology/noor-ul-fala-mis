import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import useUpdate from '@/api/useUpdate';
import useFetchObject from '@/api/useFetchObject';
import {
  StudentForm,
  StudentFormData,
  ExistingFiles,
} from '@/components/students/StudentForm';
import { StudentDocumentField } from '@/components/students/StudentDocumentUploadField';

const EditStudent = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState<StudentFormData>({
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
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previews, setPreviews] = useState<Partial<Record<StudentDocumentField | 'photo', string>>>({});
  const [existingFiles, setExistingFiles] = useState<ExistingFiles>({});

  const { data, isLoading: fetching } = useFetchObject({
    queryKey: ['student', id],
    endpoint: `students/${id}/`,
  });

  const { handleUpdate, loading, isSuccess } = useUpdate({
    queryKey: ['students'],
  });

  useEffect(() => {
    if (isSuccess) {
      navigate('/students');
      // Force refetch in StudentList
      window.dispatchEvent(new Event('student-updated'));
    }
  }, [isSuccess, navigate]);

  useEffect(() => {
    if (data) {
      setFormData({
        full_name: data.full_name || '',
        father_name: data.father_name || '',
        grandfather_name: data.grandfather_name || '',
        date_of_birth: data.date_of_birth ? data.date_of_birth.slice(0, 10) : new Date().toISOString().split('T')[0],
        gender: data.gender || 'male',
        tazkira_number: data.tazkira_number || '',
        permanent_address: data.permanent_address || '',
        current_address: data.current_address || '',
        province: data.province || '',
        district: data.district || '',
        area: data.area || '',
        parent_phone: data.parent_phone || '',
        student_phone: data.student_phone || '',
        alternative_phone: data.alternative_phone || '',
        email: data.email || '',
        registration_number: data.registration_number || '',
        registration_date: data.registration_date
          ? data.registration_date.slice(0, 10)
          : new Date().toISOString().split('T')[0],
        status: data.status || 'active',
        fee_type: data.fee_type || 'paid',
        transportation: data.transportation || 'school_bus',
        class_level: data.class_level_details ? String(data.class_level_details.id) : '',
        photo: null,
        tazkira_copy: null,
        parent_tazkira_copy: null,
        previous_result_card: null,
        payment_receipt: null,
      });
      setExistingFiles({
        photo: data.photo || undefined,
        tazkira_copy: data.tazkira_copy || undefined,
        parent_tazkira_copy: data.parent_tazkira_copy || undefined,
        previous_result_card: data.previous_result_card || undefined,
        payment_receipt: data.payment_receipt || undefined,
      });
    }
  }, [data]);

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
      setExistingFiles((prev) => ({ ...prev, [field]: undefined }));
    } else {
      setPreviews((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const clearFile = (field: StudentDocumentField | 'photo') => {
    setFormData((prev) => ({ ...prev, [field]: null }));
    setPreviews((prev) => ({ ...prev, [field]: undefined }));
    setExistingFiles((prev) => ({ ...prev, [field]: undefined }));
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
    if (!validateForm() || !id) return;

    const submitData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        submitData.append(key, value as string | Blob);
      }
    });
    handleUpdate(id, submitData);
  };

  if (fetching) {
    return <div className="container mx-auto py-6 text-center">{t('common.loading')}</div>;
  }

  return (
    <StudentForm
      mode="edit"
      formData={formData}
      errors={errors}
      previews={previews}
      existingFiles={existingFiles}
      loading={loading}
      onFieldChange={onFieldChange}
      onClearError={onClearError}
      onFileChange={handleFileChange}
      onClearFile={clearFile}
      onSubmit={handleSubmit}
    />
  );
};

export default EditStudent;
