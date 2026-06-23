import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import useAdd from '@/api/useAdd';
import { UserForm, UserFormValues } from '@/components/users/UserForm';
import { DEFAULT_USER_ROLE } from '@/constants/userRoles';

type UserSubmitData = Omit<UserFormValues, 'confirmPassword'>;

const AddUser = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<UserFormValues>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: DEFAULT_USER_ROLE,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { handleAdd, loading, isSuccess } = useAdd<UserSubmitData>({
    queryKey: 'users',
    endpoint: 'users/',
  });

  useEffect(() => {
    if (isSuccess) navigate('/users');
  }, [isSuccess, navigate]);

  const onFieldChange = <K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const onClearError = (key: string) => {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) newErrors.username = t('user.usernameRequired');
    if (!formData.email.trim()) newErrors.email = t('user.emailRequired');
    if (!formData.password?.trim()) newErrors.password = t('user.passwordRequired');
    else if (formData.password.length < 6) newErrors.password = t('user.passwordMinLength');
    if (!formData.confirmPassword?.trim()) newErrors.confirmPassword = t('user.confirmPasswordRequired');
    else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('user.passwordsDoNotMatch');
    }
    if (!formData.first_name.trim()) newErrors.first_name = t('user.firstNameRequired');
    if (!formData.last_name.trim()) newErrors.last_name = t('user.lastNameRequired');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = t('user.emailInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const { confirmPassword: _, ...submitData } = formData;
    handleAdd(submitData);
  };

  return (
    <UserForm
      mode="add"
      formData={formData}
      errors={errors}
      loading={loading}
      showPassword={showPassword}
      showConfirmPassword={showConfirmPassword}
      onShowPasswordToggle={() => setShowPassword((v) => !v)}
      onShowConfirmPasswordToggle={() => setShowConfirmPassword((v) => !v)}
      onFieldChange={onFieldChange}
      onClearError={onClearError}
      onSubmit={handleSubmit}
    />
  );
};

export default AddUser;
