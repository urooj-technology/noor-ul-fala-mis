import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { RotateCw, ArrowLeft, Users, Eye, EyeOff, Shield, Mail, User as UserIcon, Phone } from 'lucide-react';
import { USER_ROLE_OPTIONS } from '@/constants/userRoles';

export interface UserFormValues {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  is_active: boolean;
  password?: string;
  confirmPassword?: string;
}

interface UserFormProps {
  mode: 'add' | 'edit';
  formData: UserFormValues;
  errors: Record<string, string>;
  loading: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
  onShowPasswordToggle: () => void;
  onShowConfirmPasswordToggle: () => void;
  onFieldChange: <K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) => void;
  onClearError: (key: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const UserForm: React.FC<UserFormProps> = ({
  mode,
  formData,
  errors,
  loading,
  showPassword,
  showConfirmPassword,
  onShowPasswordToggle,
  onShowConfirmPasswordToggle,
  onFieldChange,
  onClearError,
  onSubmit,
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isAdd = mode === 'add';

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/users')} className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isAdd ? t('user.addUser') : t('user.editUser')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('user.manageUsers')}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t('user.userDetails')}
          </CardTitle>
          <CardDescription>
            {isAdd ? t('user.addUserDesc', 'Create a new system user') : t('user.editUserDesc', 'Update user information')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="font-semibold flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  {t('user.username')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => {
                    onFieldChange('username', e.target.value);
                    onClearError('username');
                  }}
                  placeholder={t('user.enterUsername')}
                  className="h-10"
                />
                {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {t('user.email')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    onFieldChange('email', e.target.value);
                    onClearError('email');
                  }}
                  placeholder={t('user.enterEmail')}
                  className="h-10"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="font-semibold">
                  {t('user.firstName')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => {
                    onFieldChange('first_name', e.target.value);
                    onClearError('first_name');
                  }}
                  placeholder={t('user.enterFirstName')}
                  className="h-10"
                />
                {errors.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name" className="font-semibold">
                  {t('user.lastName')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => {
                    onFieldChange('last_name', e.target.value);
                    onClearError('last_name');
                  }}
                  placeholder={t('user.enterLastName')}
                  className="h-10"
                />
                {errors.last_name && <p className="text-xs text-destructive">{errors.last_name}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {isAdd ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="font-semibold">
                      {t('user.password')} <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password || ''}
                        onChange={(e) => {
                          onFieldChange('password', e.target.value);
                          onClearError('password');
                        }}
                        placeholder={t('user.enterPassword')}
                        className="h-10 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={onShowPasswordToggle}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                    </div>
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="font-semibold">
                      {t('user.confirmPassword')} <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword || ''}
                        onChange={(e) => {
                          onFieldChange('confirmPassword', e.target.value);
                          onClearError('confirmPassword');
                        }}
                        placeholder={t('user.confirmPassword')}
                        className="h-10 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={onShowConfirmPasswordToggle}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="font-semibold">
                      {t('user.newPassword')}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password || ''}
                        onChange={(e) => {
                          onFieldChange('password', e.target.value);
                          onClearError('password');
                        }}
                        placeholder={t('user.enterNewPassword')}
                        className="h-10 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={onShowPasswordToggle}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                    </div>
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="font-semibold">
                      {t('user.confirmNewPassword')}
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword || ''}
                        onChange={(e) => {
                          onFieldChange('confirmPassword', e.target.value);
                          onClearError('confirmPassword');
                        }}
                        placeholder={t('user.confirmNewPassword')}
                        className="h-10 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={onShowConfirmPasswordToggle}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="phone" className="font-semibold flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {t('user.phone')}
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => onFieldChange('phone', e.target.value)}
                  placeholder={t('user.enterPhone')}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {t('user.role')} <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.role} onValueChange={(value) => onFieldChange('role', value)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder={t('user.selectRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {t(role.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => onFieldChange('is_active', checked as boolean)}
              />
              <Label htmlFor="is_active">{t('user.isActive')}</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/users')}
                disabled={loading}
                className="h-10 px-6"
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={loading} className="h-10 px-6">
                {loading ? (
                  <>
                    <RotateCw className="animate-spin mr-2 h-4 w-4" />
                    {isAdd ? t('common.adding') : t('common.updating')}
                  </>
                ) : isAdd ? (
                  t('common.add')
                ) : (
                  t('common.update')
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
