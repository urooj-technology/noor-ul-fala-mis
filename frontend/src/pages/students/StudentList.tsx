import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, User, GraduationCap, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Autocomplete } from '@/components/ui/autocomplete';
import DataTable, { TableColumn, TableAction } from '@/components/ui/data-table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar, CalendarProvider } from '@/contexts/CalendarContext';
import { formatDateByCalendarType } from '@/utils/calendar';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';

interface StudentItem {
  id: number | string;
  registration_number?: string;
  full_name?: string;
  father_name?: string;
  class_level_details?: { name?: string };
  payment_cycle?: string;
  monthly_fee?: number;
  yearly_fee?: number;
  status?: string;
  currency?: string;
  phone?: string;
}

interface PaginatedResponse {
  results: StudentItem[];
  count: number;
}

export const StudentList = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const lang = t('language.code') as 'fa' | 'ps';
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classLevelFilter, setClassLevelFilter] = useState('');
  const [paymentCycleFilter, setPaymentCycleFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number | string>>(new Set());

  const { data: studentsData, isLoading } = useFetchObjects<PaginatedResponse>({
    queryKey: ['students', currentPage.toString(), pageSize.toString(), searchTerm, statusFilter, classLevelFilter, paymentCycleFilter],
    endpoint: 'students/',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm,
      ...(statusFilter && { status: statusFilter }),
      ...(classLevelFilter && { class_level: classLevelFilter }),
      ...(paymentCycleFilter && { payment_cycle: paymentCycleFilter }),
    },
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['students'],
    endpoint: 'students'
  });

  const students = studentsData?.results || [];
  const totalItems = studentsData?.count || 0;

  // Convert Set to array for DataTable
  const selectedRows = useMemo(() => Array.from(selectedStudentIds), [selectedStudentIds]);

  const handleSelectionChange = (ids: (string | number)[]) => {
    setSelectedStudentIds(new Set(ids));
  };

  const handleEdit = (student: { id: number | string }) => {
    navigate(`/students/${student.id}/edit`);
  };

  const handleDetails = (student: { id: number | string }) => {
    navigate(`/students/${student.id}`);
  };

  const handleBulkChangeClass = () => {
    const ids = Array.from(selectedStudentIds).join(',');
    navigate(`/students/bulk-change-class?ids=${ids}`);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      graduated: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      suspended: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      transferred: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    };
    return (
      <Badge variant={colors[status] ? 'default' : 'secondary'}>
        {t(`students.statusOptions.${status}`) || status}
      </Badge>
    );
  };

  const getPaymentCycleBadge = (cycle: string) => {
    const isMonthly = cycle === 'monthly';
    return (
      <Badge variant={isMonthly ? 'outline' : 'secondary'}>
        {isMonthly ? t('students.paymentCycleOptions.monthly') : t('students.paymentCycleOptions.yearly')}
      </Badge>
    );
  };

  const columns: TableColumn[] = [
    {
      key: 'registration_number',
      title: t('students.registrationNumber'),
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="font-semibold text-xs">{value || t('common.notAvailable')}</span>
        </div>
      )
    },
    {
      key: 'full_name',
      title: t('students.fullName'),
      render: (value) => <span className="text-xs">{value || t('common.notAvailable')}</span>
    },
    {
      key: 'father_name',
      title: t('students.fatherName'),
      render: (value) => <span className="text-xs">{value || t('common.notAvailable')}</span>
    },
    {
      key: 'class_level_details',
      title: t('students.classLevel'),
      render: (value) => (
        <div className="flex items-center gap-1">
          <GraduationCap className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">{value?.name || t('students.notSet')}</span>
        </div>
      )
    },
    {
      key: 'payment_cycle',
      title: t('students.paymentCycle'),
      render: (value) => getPaymentCycleBadge(value || 'monthly')
    },
    {
      key: 'status',
      title: t('students.status'),
      render: (value) => getStatusBadge(value || 'inactive')
    },
    {
      key: 'phone',
      title: t('students.phone'),
      render: (value) => <span className="text-xs">{value || t('common.notAvailable')}</span>
    }
  ];

  const rowActions: TableAction[] = [
    {
      key: 'view',
      label: t('students.viewDetails'),
      icon: <Eye className="h-4 w-4" />,
      onClick: handleDetails,
      tooltip: t('students.viewDetails')
    },
    {
      key: 'edit',
      label: t('students.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('students.editStudent')
    },
    {
      key: 'delete',
      label: t('students.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record) => handleDelete(record.id, record.full_name || t('students.student')),
      variant: 'ghost',
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('students.deleteStudent')
    }
  ];

  const statusOptions = [
    { value: 'active', label: t('students.statusOptions.active') },
    { value: 'inactive', label: t('students.statusOptions.inactive') },
    { value: 'graduated', label: t('students.statusOptions.graduated') },
    { value: 'suspended', label: t('students.statusOptions.suspended') },
    { value: 'transferred', label: t('students.statusOptions.transferred') },
  ];

  const paymentCycleOptions = [
    { value: 'monthly', label: t('students.paymentCycleOptions.monthly') },
    { value: 'yearly', label: t('students.paymentCycleOptions.yearly') },
  ];

  const customFilters = [
    {
      key: 'class_level',
      label: t('students.classLevel'),
      component: (
        <Autocomplete
          endpoint="class-levels"
          value={classLevelFilter}
          onChange={(value) => {
            setClassLevelFilter(value as string);
            setCurrentPage(1);
          }}
          placeholder={t('students.selectClassLevel')}
          getOptionLabel={(c) => c.name}
          getOptionValue={(c) => c.id.toString()}
        />
      )
    },
    {
      key: 'status',
      label: t('students.status'),
      component: (
        <Autocomplete
          options={statusOptions}
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value as string);
            setCurrentPage(1);
          }}
          placeholder={t('students.selectStatus')}
          getOptionLabel={(s) => s.label}
          getOptionValue={(s) => s.value}
        />
      )
    },
    {
      key: 'payment_cycle',
      label: t('students.paymentCycle'),
      component: (
        <Autocomplete
          options={paymentCycleOptions}
          value={paymentCycleFilter}
          onChange={(value) => {
            setPaymentCycleFilter(value as string);
            setCurrentPage(1);
          }}
          placeholder={t('students.selectPaymentCycle')}
          getOptionLabel={(p) => p.label}
          getOptionValue={(p) => p.value}
        />
      )
    }
  ];

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setClassLevelFilter('');
    setPaymentCycleFilter('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter || classLevelFilter || paymentCycleFilter || searchTerm;

  return (
    <div className="space-y-6 p-6">
      <CalendarProvider>
      {/* Bulk Actions Bar - Shows when students are selected */}
      {selectedStudentIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium">
            {selectedStudentIds.size} {t('students.studentsSelected', 'students selected')}
          </span>
          <Button size="sm" onClick={handleBulkChangeClass}>
            <GraduationCap className="mr-2 h-4 w-4" />
            {t('students.changeClassLevel', 'Change Class Level')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSelectedStudentIds(new Set())}>
            {t('common.clearSelection', 'Clear Selection')}
          </Button>
        </div>
      )}

      <DataTable
        data={students}
        columns={columns}
        loading={isLoading}
        title={t('students.students')}
        subtitle={t('students.manageStudents')}
        icon={<User className="h-5 w-5" />}
        headerActions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              {t('common.print', 'Print')}
            </Button>
            <Button onClick={() => navigate('/students/add')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('students.addStudent')}
            </Button>
          </div>
        }
        selectable
        selectedRows={selectedRows}
        onSelectionChange={handleSelectionChange}
        searchable
        searchPlaceholder={t('students.searchStudents')}
        searchValue={searchTerm}
        onSearch={handleSearch}
        customFilters={customFilters}
        showClearFilters={hasActiveFilters}
        clearFiltersLabel={t('students.clearFilters')}
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
        emptyIcon={<User className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('students.noStudentsFound')}
        emptyDescription={searchTerm ? t('students.tryAdjustingSearch') : t('students.addFirstStudent')}
        loadingText={t('students.loadingStudents')}
        maxHeight="75vh"
        stickyHeader={true}
      />

      <ConfirmDialog />
      </CalendarProvider>
    </div>
  );
};

export default StudentList;
