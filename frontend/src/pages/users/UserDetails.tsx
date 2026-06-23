import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, Edit, Shield, Mail, Phone, MapPin, Building, Calendar, User as UserIcon, Plus, Trash2, Eye, Settings, MoreVertical } from 'lucide-react';
import { ReloadIcon } from '@radix-ui/react-icons';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import useFetchObject from '@/api/useFetchObject';
import useDelete from '@/api/useDelete';
import { normalizeUserRole } from '@/constants/userRoles';

interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: string;
  address?: string;
  is_active: boolean;
  profile_picture?: string;
  company?: {
    id: string;
    name: string;
    code: string;
    type: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  company_details?: {
    id: string;
    name: string;
    code: string;
    type: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  created_at: string;
  updated_at: string;
}

export const UserDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { data: user, isLoading } = useFetchObject<User>({
    queryKey: ['user', id || ''],
    endpoint: `users/${id}/`,
    enabled: !!id,
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['users'],
    endpoint: 'users'
  });

  const getRoleColor = (role: string) => {
    switch (normalizeUserRole(role)) {
      case 'admin':
      case 'super_admin':
        return 'destructive';
      case 'accountant':
      case 'cashier':
        return 'default';
      case 'hr_manager':
      case 'registration_officer':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleDeleteUser = () => {
    if (!user) return;
    const displayName = user.first_name && user.last_name 
      ? `${user.first_name} ${user.last_name}` 
      : user.username;
    handleDelete(user.id, displayName).then(() => {
      navigate('/users');
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center">
        <ReloadIcon className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <p>User not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Enhanced Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg"></div>
        <div className="relative p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/users')}
              className="flex items-center gap-2 hover:bg-white/50"
            >
              <ArrowLeft size={16} />
              {t('user.backToUsers')}
            </Button>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                  <AvatarImage src={user.profile_picture} />
                  <AvatarFallback className="text-base font-bold bg-primary/10">
                    {(user.first_name?.[0] || user.username[0]).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-2 border-white ${
                  user.is_active ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-base font-bold text-foregroundtext-sm">
                  {user.first_name && user.last_name 
                    ? `${user.first_name} ${user.last_name}` 
                    : user.username}
                </h1>
                <div className="flex items-center gap-3">
                  <p className="text-base text-muted-foregroundtext-xs">{user.email}</p>
                  <Badge variant={getRoleColor(user.role)} className="capitalize">
                    {t(`user.roles.${normalizeUserRole(user.role)}`, user.role)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-base text-muted-foreground">
                  <Calendar size={14} />
                  {t('user.memberSince')} {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => navigate('/users/add')}
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                {t('user.addUser')}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/users/${user.id}/edit`)}
                className="flex items-center gap-2"
              >
                <Edit size={16} />
                {t('user.editUser')}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/users/${user.id}/permissions`)}
                className="flex items-center gap-2"
              >
                <Shield size={16} />
                {t('user.managePermissions')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/users/${user.id}`)}>
                    <Eye size={16} className="mr-2" />
                    {t('user.viewDetails')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/users/${user.id}/settings`)}>
                    <Settings size={16} className="mr-2" />
                    {t('user.settings')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                        <Trash2 size={16} className="mr-2" />
                        {t('user.deleteUser')}
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('user.confirmDelete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('user.deleteConfirmation', { name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteUser()} className="bg-red-600 hover:bg-red-700">
                          {t('user.delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* User Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
        {/* Personal Information */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <UserIcon size={20} />
              {t('user.personalInformation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <label className="text-base font-medium text-muted-foreground">{t('user.username')}</label>
                <p className="font-semibold text-base text-base mt-1text-xs">{user.username}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-base font-medium text-muted-foreground">{t('user.firstName')}</label>
                  <p className="font-medium mt-1text-xs">{user.first_name || '-'}</p>
                </div>
                <div>
                  <label className="text-base font-medium text-muted-foreground">{t('user.lastName')}</label>
                  <p className="font-medium mt-1text-xs">{user.last_name || '-'}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-semibold text-base text-muted-foreground uppercase tracking-widetext-sm">{t('user.contactInformation')}</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <Mail size={18} className="text-blue-500" />
                  <div>
                    <p className="text-base text-muted-foregroundtext-xs">{t('user.email')}</p>
                    <p className="font-mediumtext-xs">{user.email}</p>
                  </div>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <Phone size={18} className="text-green-500" />
                    <div>
                      <p className="text-base text-muted-foregroundtext-xs">{t('user.phone')}</p>
                      <p className="font-mediumtext-xs">{user.phone}</p>
                    </div>
                  </div>
                )}
                {user.address && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <MapPin size={18} className="text-red-500 mt-0.5" />
                    <div>
                      <p className="text-base text-muted-foregroundtext-xs">{t('user.address')}</p>
                      <p className="font-mediumtext-xs">{user.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div>
                <label className="text-base font-medium text-muted-foreground">{t('user.accountStatus')}</label>
                <div className="mt-1">
                  <Badge variant={user.is_active ? 'default' : 'secondary'} className="text-base">
                    {user.is_active ? t('user.active') : t('user.inactive')}
                  </Badge>
                </div>
              </div>
              <div className={`h-3 w-3 rounded-full ${
                user.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}></div>
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <Building size={20} />
              {t('user.companyInformation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {user.company_details ? (
              <div className="space-y-6">
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <label className="text-base font-medium text-muted-foreground">{t('user.companyName')}</label>
                  <p className="font-bold text-base text-base mt-1 text-green-700 dark:text-green-300text-xs">{user.company_details.name}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <label className="text-base font-medium text-muted-foreground">{t('user.companyCode')}</label>
                    <p className="font-semibold text-base mt-1text-xs">{user.company_details.code}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <label className="text-base font-medium text-muted-foreground">{t('user.companyType')}</label>
                    <p className="font-semibold text-base mt-1 capitalizetext-xs">{user.company_details.type}</p>
                  </div>
                </div>

                {(user.company_details.email || user.company_details.phone || user.company_details.address) && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base text-muted-foreground uppercase tracking-widetext-sm">{t('user.companyContact')}</h4>
                      {user.company_details.email && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                          <Mail size={18} className="text-blue-500" />
                          <div>
                            <p className="text-base text-muted-foregroundtext-xs">{t('user.email')}</p>
                            <p className="font-mediumtext-xs">{user.company_details.email}</p>
                          </div>
                        </div>
                      )}
                      {user.company_details.phone && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                          <Phone size={18} className="text-green-500" />
                          <div>
                            <p className="text-base text-muted-foregroundtext-xs">{t('user.phone')}</p>
                            <p className="font-mediumtext-xs">{user.company_details.phone}</p>
                          </div>
                        </div>
                      )}
                      {user.company_details.address && (
                        <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                          <MapPin size={18} className="text-red-500 mt-0.5" />
                          <div>
                            <p className="text-base text-muted-foregroundtext-xs">{t('user.address')}</p>
                            <p className="font-mediumtext-xs">{user.company_details.address}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Building size={32} className="text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-base mb-2text-sm">{t('user.noCompany')}</h3>
                <p className="text-muted-foregroundtext-xs">{t('user.noCompanyDescription')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card className="xl:col-span-1 hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
            <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <Calendar size={20} />
              {t('user.accountInformation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-l-4 border-purple-500">
                <label className="text-base font-medium text-muted-foreground">{t('user.accountCreated')}</label>
                <p className="font-semibold text-base text-base mt-1text-xs">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-base text-muted-foregroundtext-xs">
                  {new Date(user.created_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-l-4 border-blue-500">
                <label className="text-base font-medium text-muted-foreground">{t('user.lastUpdated')}</label>
                <p className="font-semibold text-base text-base mt-1text-xs">
                  {new Date(user.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-base text-muted-foregroundtext-xs">
                  {new Date(user.updated_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-base font-medium text-muted-foreground">{t('user.userRole')}</label>
                    <p className="font-semibold text-base text-base mt-1 capitalizetext-xs">{t(`user.roles.${normalizeUserRole(user.role)}`, user.role)}</p>
                  </div>
                  <Badge variant={getRoleColor(user.role)} className="text-base px-3 py-1">
                    {t(`user.roles.${normalizeUserRole(user.role)}`, user.role)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog />
    </div>
  );
};