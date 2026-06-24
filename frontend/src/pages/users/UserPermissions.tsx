import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  ArrowLeft,
  Save,
  Shield,
  Users,
  Building,
  Package,
  ShoppingCart,
  FileText,
  DollarSign,
  Clock,
  TrendingUp,
  Settings,
  Lock,
  LayoutDashboard,
  Eye,
  Plus,
  Edit,
  Trash2,
  Search,
  Grid,
  List,
  RotateCcw,
} from 'lucide-react';
import useFetchObjects from '@/api/useFetchObjects';
import useAdd from '@/api/useAdd';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Permission {
  id: string;
  name: string;
  codename: string;
  module: string;
  description: string;
  granted: boolean;
}

interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

const formatText = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template
  );

export const UserPermissions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'granted' | 'denied'>('all');

  const { data: user, isLoading: userLoading } = useFetchObjects<User>({
    queryKey: ['user', id || ''],
    endpoint: `users/${id}`,
    enabled: !!id,
  });

  const { data: permissionsData, isLoading: permissionsLoading, refetch } = useFetchObjects<Permission[]>({
    queryKey: ['user-permissions', id || ''],
    endpoint: `users/${id}/permissions/user-permissions`,
    enabled: !!id,
  });

  const { handleAdd, loading: saving, isSuccess } = useAdd<{ permissions: Array<{ permission_id: string; granted: string }> }>({
    queryKey: 'user-permissions',
    endpoint: `users/${id}/permissions/bulk-update`,
    customSuccessMessage: t('user.permissionsUpdatedSuccess'),
    customErrorMessage: t('user.failedToSavePermissions'),
    showSuccessToast: true,
    showErrorToast: true,
  });

  const {
    handleAdd: setupDefaultPermissions,
    loading: settingUpPermissions,
    isSuccess: setupPermissionsSuccess,
  } = useAdd({
    queryKey: 'user-permissions',
    endpoint: 'permissions/setup-defaults/',
    customSuccessMessage: t('user.setupPermissionsSuccessGeneric'),
    customErrorMessage: t('user.setupPermissionsFailed'),
    showSuccessToast: true,
    showErrorToast: true,
  });

  useEffect(() => {
    if (permissionsData) {
      setPermissions(permissionsData);
    }
  }, [permissionsData]);

  useEffect(() => {
    if (isSuccess) {
      refetch();
    }
  }, [isSuccess, refetch]);

  useEffect(() => {
    if (setupPermissionsSuccess) {
      refetch();
    }
  }, [setupPermissionsSuccess, refetch]);

  const getModuleLabel = (module: string) =>
    t(`user.permissionModules.${module}`, module);

  const getPermissionLabel = (permission: Permission) =>
    t(`user.permissionNames.${permission.codename}`, permission.name);

  const handlePermissionChange = (permissionId: string, granted: boolean) => {
    setPermissions((prev) =>
      prev.map((perm) => (perm.id === permissionId ? { ...perm, granted } : perm))
    );
  };

  const handleModuleAllChange = (module: string, granted: boolean) => {
    setPermissions((prev) =>
      prev.map((perm) => (perm.module === module ? { ...perm, granted } : perm))
    );
  };

  const isModuleAllSelected = (modulePermissions: Permission[]) =>
    modulePermissions.length > 0 && modulePermissions.every((perm) => perm.granted);

  const isModulePartiallySelected = (modulePermissions: Permission[]) =>
    modulePermissions.some((perm) => perm.granted) &&
    !modulePermissions.every((perm) => perm.granted);

  const handleSave = () => {
    const permissionsPayload = permissions.map((perm) => ({
      permission_id: perm.id,
      granted: perm.granted.toString(),
    }));
    handleAdd({ permissions: permissionsPayload });
  };

  const filteredPermissions = useMemo(() => {
    return permissions.filter((permission) => {
      const label = getPermissionLabel(permission).toLowerCase();
      const moduleLabel = getModuleLabel(permission.module).toLowerCase();
      const matchesSearch =
        searchTerm === '' ||
        label.includes(searchTerm.toLowerCase()) ||
        permission.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.codename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        moduleLabel.includes(searchTerm.toLowerCase());

      const matchesFilter =
        filterStatus === 'all' ||
        (filterStatus === 'granted' && permission.granted) ||
        (filterStatus === 'denied' && !permission.granted);

      return matchesSearch && matchesFilter;
    });
  }, [permissions, searchTerm, filterStatus, t]);

  const groupedPermissions = filteredPermissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const getModuleIcon = (module: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      dashboard: <LayoutDashboard className="w-5 h-5" />,
      users: <Users className="w-5 h-5" />,
      students: <Users className="w-5 h-5" />,
      hr: <Users className="w-5 h-5" />,
      payroll: <DollarSign className="w-5 h-5" />,
      expenses: <DollarSign className="w-5 h-5" />,
      accounting: <FileText className="w-5 h-5" />,
      rental: <Building className="w-5 h-5" />,
      income: <TrendingUp className="w-5 h-5" />,
      equipment: <Package className="w-5 h-5" />,
      reports: <TrendingUp className="w-5 h-5" />,
      system: <Settings className="w-5 h-5" />,
      companies: <Building className="w-5 h-5" />,
      products: <Package className="w-5 h-5" />,
      sales: <ShoppingCart className="w-5 h-5" />,
      attendance: <Clock className="w-5 h-5" />,
      permissions: <Lock className="w-5 h-5" />,
    };
    return iconMap[module] || <Shield className="w-5 h-5" />;
  };

  const getPermissionIcon = (codename: string) => {
    if (codename.includes('view')) return <Eye className="w-4 h-4" />;
    if (codename.includes('create') || codename.includes('add')) return <Plus className="w-4 h-4" />;
    if (codename.includes('edit')) return <Edit className="w-4 h-4" />;
    if (codename.includes('delete')) return <Trash2 className="w-4 h-4" />;
    return <Shield className="w-4 h-4" />;
  };

  const loading = userLoading || permissionsLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-muted border-t-primary mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">{t('user.loadingPermissions')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/60 bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate('/users')}
                className="h-10 w-10"
              >
                <ArrowLeft size={18} />
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <div className="h-8 w-8 rounded-md border border-border/60 bg-muted/40 flex items-center justify-center">
                    <Shield className="text-primary" size={16} />
                  </div>
                  <h1 className="text-lg font-semibold">{t('user.userPermissions')}</h1>
                </div>
                {user && (
                  <p className="text-sm text-muted-foreground ml-11 truncate">
                    {user.first_name} {user.last_name} • {user.username}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={settingUpPermissions}>
                    <RotateCcw size={16} className="mr-2" />
                    {settingUpPermissions ? t('user.settingUpPermissions') : t('user.setupDefaultPermissions')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('user.setupDefaultPermissionsTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('user.setupDefaultPermissionsDescription')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('user.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => setupDefaultPermissions({})}>
                      {t('user.setupDefaultPermissionsConfirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={handleSave} disabled={saving}>
                <Save size={16} className="mr-2" />
                {saving ? t('user.saving') : t('user.saveChanges')}
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder={t('user.searchPermissionsPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex items-center gap-1 rounded-md p-1 border border-border/60">
                <Button
                  variant={filterStatus === 'all' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setFilterStatus('all')}
                >
                  {t('user.filterAll')}
                </Button>
                <Button
                  variant={filterStatus === 'granted' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setFilterStatus('granted')}
                >
                  <span className="hidden sm:inline">{t('user.filterGranted')}</span>
                  <span className="sm:hidden">{t('user.filterGrantedShort')}</span>
                </Button>
                <Button
                  variant={filterStatus === 'denied' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setFilterStatus('denied')}
                >
                  <span className="hidden sm:inline">{t('user.filterDenied')}</span>
                  <span className="sm:hidden">{t('user.filterDeniedShort')}</span>
                </Button>
              </div>

              <div className="flex items-center gap-1 rounded-md p-1 border border-border/60">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="p-2"
                >
                  <Grid size={16} />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="p-2"
                >
                  <List size={16} />
                </Button>
              </div>

              <div className="hidden sm:flex items-center px-3 py-2 rounded-md border border-border/60 text-sm text-muted-foreground">
                {formatText(t('user.permissionsResultsCount'), {
                  shown: filteredPermissions.length,
                  total: permissions.length,
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="space-y-4">
          {Object.keys(groupedPermissions).length === 0 && (searchTerm || filterStatus !== 'all') && (
            <div className="text-center py-16 border border-border/60 rounded-lg bg-card">
              <div className="w-16 h-16 rounded-lg border border-border/60 bg-muted/30 mx-auto mb-4 flex items-center justify-center">
                <Search size={24} className="text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-2">{t('user.noSearchResults')}</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                {t('user.noSearchResultsDescription')}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                  {t('user.clearSearch')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setFilterStatus('all')}>
                  {t('user.showAll')}
                </Button>
              </div>
            </div>
          )}

          {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
            <div
              key={module}
              className="rounded-lg border border-border/60 bg-card"
            >
              <div className="px-5 py-4 border-b border-border/60">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md border border-border/60 bg-muted/30 flex items-center justify-center text-muted-foreground">
                      {getModuleIcon(module)}
                    </div>
                    <div>
                      <h3 className="font-medium">{getModuleLabel(module)}</h3>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span>
                          {formatText(t('user.permissionsCount'), {
                            count: modulePermissions.length,
                          })}
                        </span>
                        <span>•</span>
                        <span>
                          {formatText(t('user.activeCount'), {
                            count: modulePermissions.filter((p) => p.granted).length,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2">
                    <Checkbox
                      id={`all-${module}`}
                      checked={isModuleAllSelected(modulePermissions)}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = isModulePartiallySelected(modulePermissions);
                        }
                      }}
                      onCheckedChange={(checked) =>
                        handleModuleAllChange(module, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={`all-${module}`}
                      className="text-sm font-medium cursor-pointer select-none"
                    >
                      {t('user.selectAll')}
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-5">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {modulePermissions.map((permission) => (
                      <label
                        key={permission.id}
                        htmlFor={permission.id}
                        className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                          permission.granted
                            ? 'border-primary/30 bg-primary/5'
                            : 'border-border/60 bg-background hover:bg-muted/30'
                        }`}
                      >
                        <Checkbox
                          id={permission.id}
                          checked={permission.granted}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(permission.id, checked as boolean)
                          }
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded border border-border/60 flex items-center justify-center text-muted-foreground">
                              {getPermissionIcon(permission.codename)}
                            </div>
                            <span className="text-sm font-medium">
                              {getPermissionLabel(permission)}
                            </span>
                          </div>
                          <code className="text-xs text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border/40 font-mono">
                            {permission.codename}
                          </code>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {modulePermissions.map((permission) => (
                      <label
                        key={permission.id}
                        htmlFor={permission.id}
                        className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                          permission.granted
                            ? 'border-primary/30 bg-primary/5'
                            : 'border-border/60 bg-background hover:bg-muted/30'
                        }`}
                      >
                        <Checkbox
                          id={permission.id}
                          checked={permission.granted}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(permission.id, checked as boolean)
                          }
                        />
                        <div className="w-8 h-8 rounded-md border border-border/60 flex items-center justify-center text-muted-foreground">
                          {getPermissionIcon(permission.codename)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                              {getPermissionLabel(permission)}
                            </span>
                            <code className="text-xs text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border/40 font-mono">
                              {permission.codename}
                            </code>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {permissions.length === 0 && !loading && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center border border-border/60 rounded-lg bg-card py-12">
            <div className="w-16 h-16 rounded-lg border border-border/60 bg-muted/30 mx-auto mb-4 flex items-center justify-center">
              <Shield size={28} className="text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-2">{t('user.noPermissionsFound')}</h3>
            <p className="text-sm text-muted-foreground mb-6">{t('user.noPermissionsAvailable')}</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={settingUpPermissions}>
                  <RotateCcw size={16} className="mr-2" />
                  {t('user.setupDefaultPermissions')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('user.setupDefaultPermissionsTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('user.setupDefaultPermissionsDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('user.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => setupDefaultPermissions({})}>
                    {t('user.setupDefaultPermissionsConfirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
};
