import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Users, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import DataTable, { TableColumn, TableAction, FilterOption } from '@/components/ui/data-table';
import { useLanguage } from '@/contexts/LanguageContext';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';
import { USER_ROLE_OPTIONS, normalizeUserRole } from '@/constants/userRoles';

export const UserList = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: usersData, isLoading } = useFetchObjects<{
    results: any[];
    count: number;
    next: string | null;
    previous: string | null;
  }>({
    queryKey: ['users', currentPage.toString(), pageSize.toString(), searchTerm, roleFilter, statusFilter],
    endpoint: 'users/',
    params: {
      page: currentPage,
      page_size: pageSize,
      ...(searchTerm && { search: searchTerm }),
      ...(roleFilter !== 'all' && { role: roleFilter }),
      ...(statusFilter !== 'all' && { is_active: statusFilter === 'active' })
    }
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['users'],
    endpoint: 'users'
  });

  const users = usersData?.results || [];
  const totalItems = usersData?.count || 0;

  const handleEdit = (user: any) => {
    navigate(`/users/${user.id}/edit`);
  };

  const handleDetails = (user: any) => {
    navigate(`/users/${user.id}`);
  };

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

  const columns: TableColumn[] = [
    {
      key: 'profile',
      title: t('user.user'),
      render: (value, record) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={record.profile_picture} />
            <AvatarFallback>
              {(record.first_name?.[0] || record.username[0]).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">
              {record.first_name && record.last_name 
                ? `${record.first_name} ${record.last_name}` 
                : record.username}
            </div>
            <div className="text-base text-muted-foreground">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'username',
      title: t('user.username'),
    },
    {
      key: 'phone',
      title: t('user.phone'),
      render: (value) => value || '-',
    },
    {
      key: 'role',
      title: t('user.role'),
      render: (value) => (
        <Badge variant={getRoleColor(value)}>
          {t(`user.roles.${normalizeUserRole(value)}`, value)}
        </Badge>
      ),
    },

    {
      key: 'is_active',
      title: t('user.status'),
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? t('user.active') : t('user.inactive')}
        </Badge>
      ),
    },
  ];

  const rowActions: TableAction[] = [
    {
      key: 'view',
      label: t('user.viewDetails'),
      icon: <Eye className="h-4 w-4" />,
      onClick: handleDetails,
      tooltip: t('user.viewDetails')
    },
    {
      key: 'edit',
      label: t('common.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('user.editUserAction')
    },
    {
      key: 'permissions',
      label: t('user.permissions'),
      icon: <Shield className="h-4 w-4" />,
      onClick: (record) => navigate(`/users/${record.id}/permissions`),
      tooltip: t('user.managePermissions')
    },
    {
      key: 'delete',
      label: t('common.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record) => {
        const displayName = record.first_name && record.last_name 
          ? `${record.first_name} ${record.last_name}` 
          : record.username;
        handleDelete(record.id, displayName);
      },
      variant: 'ghost',
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('user.deleteUser')
    }
  ];

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const filters: FilterOption[] = [
    {
      key: 'role',
      label: t('user.role'),
      placeholder: t('user.filterByRole'),
      width: 'sm:w-40',
      options: USER_ROLE_OPTIONS.map((role) => ({
        value: role.value,
        label: t(role.labelKey),
      })),
    },
    {
      key: 'status',
      label: t('common.status'),
      placeholder: t('user.filterByStatus'),
      width: 'sm:w-40',
      options: [
        { value: 'active', label: t('common.active') },
        { value: 'inactive', label: t('common.inactive') }
      ]
    }
  ];

  const filterValues = {
    role: roleFilter,
    status: statusFilter
  };

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'role') {
      setRoleFilter(value);
      setCurrentPage(1);
    } else if (key === 'status') {
      setStatusFilter(value);
      setCurrentPage(1);
    }
  };

  const handleClearFilters = () => {
    setRoleFilter('all');
    setStatusFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveFilters = roleFilter !== 'all' || statusFilter !== 'all' || searchTerm;

  return (
    <div className="space-y-6 p-6">
      <DataTable
        data={users}
        columns={columns}
        loading={isLoading}
        title={t('user.userManagement')}
        subtitle={t('user.manageUsers')}
        icon={<Users className="h-5 w-5" />}
        headerActions={
          <Button onClick={() => navigate('/users/add')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('user.addUserButton')}
          </Button>
        }
        searchable
        searchPlaceholder={t('user.searchUsers')}
        searchValue={searchTerm}
        onSearch={handleSearch}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        showClearFilters={hasActiveFilters}
        clearFiltersLabel={t('user.clearFilters')}
        onClearFilters={handleClearFilters}
        rowActions={rowActions}
        pagination={{
          current: currentPage,
          pageSize,
          total: totalItems,
          onPageChange: setCurrentPage,
          showSizeChanger: true,
          pageSizeOptions: [10, 25, 50, 100],
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(1);
          }
        }}
        emptyIcon={<Users className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('user.noUsersFound')}
        emptyDescription={searchTerm ? t('user.tryAdjustingSearch') : t('user.addFirstUser')}
        loadingText={t('user.loadingUsers')}
        maxHeight="75vh"
        stickyHeader={true}
      />

      <ConfirmDialog />
    </div>
  );
};