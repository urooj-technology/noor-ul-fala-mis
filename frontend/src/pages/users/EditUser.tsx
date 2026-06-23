import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import useUpdate from '@/api/useUpdate';
import useFetchObject from '@/api/useFetchObject';
import { UserForm, UserFormValues } from '@/components/users/UserForm';
import { DEFAULT_USER_ROLE, normalizeUserRole } from '@/constants/userRoles';
import { RotateCw } from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: string;
  is_active: boolean;
}

type UserUpdateData = Omit<UserFormValues, 'confirmPassword'>;

const EditUser = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [formData, setFormData] = useState<UserFormValues>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: DEFAULT_USER_ROLE,
    is_active: true,
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { data: user, isLoading: userLoading } = useFetchObject<User>({
    queryKey: ['user', id || ''],
    endpoint: `users/${id}/`,
    enabled: !!id,
  });

  const { handleUpdate, loading, isSuccess } = useUpdate<UserUpdateData>({
    queryKey: ['users'],
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        role: normalizeUserRole(user.role),
        is_active: user.is_active,
        password: '',
        confirmPassword: '',
      });
      setErrors({});
    }
  }, [user]);

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
    if (!formData.first_name.trim()) newErrors.first_name = t('user.firstNameRequired');
    if (!formData.last_name.trim()) newErrors.last_name = t('user.lastNameRequired');

    if (formData.password?.trim()) {
      if (formData.password.length < 6) newErrors.password = t('user.passwordMinLength');
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('user.passwordsDoNotMatch');
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = t('user.emailInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !id) return;

    const { confirmPassword: _, ...submitData } = formData;
    if (!submitData.password?.trim()) {
      delete submitData.password;
    }
    handleUpdate(id, submitData);
  };

  if (userLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center gap-2 text-muted-foreground">
        <RotateCw className="h-5 w-5 animate-spin" />
        {t('common.loading')}
      </div>
    );
  }

  return (
    <UserForm
      mode="edit"
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

export default EditUser;
