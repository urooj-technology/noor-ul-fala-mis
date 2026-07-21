import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, User, GraduationCap, Printer, DollarSign, FileBarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Autocomplete } from '@/components/ui/autocomplete';
import { DatePicker } from '@/components/ui/date-picker';
import DataTable, { TableColumn, TableAction } from '@/components/ui/data-table';
import { PermissionButton } from '@/components/ui/permission-button';
import { useCrudPermissions } from '@/hooks/useCrudPermissions';
import { useLanguage } from '@/contexts/LanguageContext';
import { CalendarProvider } from '@/contexts/CalendarContext';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';
import StudentPrint from './StudentPrint';
import StudentBulkPrint from './StudentBulkPrint';

// Static class level options
const CLASS_LEVELS = [
  { id: 'KG', level: '0', name: 'Kindergarten' },
  { id: '1', level: '1', name: 'Class 1' },
  { id: '2', level: '2', name: 'Class 2' },
  { id: '3', level: '3', name: 'Class 3' },
  { id: '4', level: '4', name: 'Class 4' },
  { id: '5', level: '5', name: 'Class 5' },
  { id: '6', level: '6', name: 'Class 6' },
  { id: '7', level: '7', name: 'Class 7' },
  { id: '8', level: '8', name: 'Class 8' },
  { id: '9', level: '9', name: 'Class 9' },
  { id: '10', level: '10', name: 'Class 10' },
  { id: '11', level: '11', name: 'Class 11' },
  { id: '12', level: '12', name: 'Class 12' },
];

interface FinancialSummary {
  total_fee?: string | number;
  total_payments?: string | number;
  total_paid?: string | number;
  remaining_balance?: string | number;
  currency?: string;
  class_level?: string;
  class_level_id?: number;
}

interface StudentItem {
  id: number | string;
  registration_number?: string;
  full_name?: string;
  father_name?: string;
  class_level_details?: { name?: string };
  status?: string;
  fee_type?: string;
  phone?: string;
  total_fee?: string | number;
  total_paid?: string | number;
  remaining_balance?: string | number;
  financial_summary?: FinancialSummary;
}

interface PaginatedResponse {
  results: StudentItem[];
  count: number;
}

// Helper function to format currency
function formatCurrency(amount: string | number | undefined, currency: string = 'AFN'): string {
  const val = typeof amount === 'string' ? parseFloat(amount) || 0 : (amount ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}



type RegistrationPeriod = '' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export const StudentList = () => {
  const { t } = useLanguage();
  const { canEdit, canDelete, canExport } = useCrudPermissions('students');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classLevelFilter, setClassLevelFilter] = useState('');
  const [registrationPeriodFilter, setRegistrationPeriodFilter] = useState<RegistrationPeriod>('');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number | string>>(new Set());
  const [printStudent, setPrintStudent] = useState<StudentItem | null>(null);
  const [bulkPrintStudents, setBulkPrintStudents] = useState<(number | string)[]>([]);

  const isRegistrationFilterActive = Boolean(registrationPeriodFilter);
  const isCustomPeriodReady = registrationPeriodFilter !== 'custom' || (Boolean(customDateFrom) && Boolean(customDateTo));

  const { data: studentsData, isLoading } = useFetchObjects<PaginatedResponse>({
    queryKey: [
      'students',
      currentPage.toString(),
      pageSize.toString(),
      searchTerm,
      statusFilter,
      classLevelFilter,
      registrationPeriodFilter,
      customDateFrom,
      customDateTo,
    ],
    endpoint: 'students/',
    enabled: !isRegistrationFilterActive || isCustomPeriodReady,
    params: {
      search: searchTerm,
      ...(statusFilter && { status: statusFilter }),
      ...(classLevelFilter && { class_level: classLevelFilter }),
      ...(isRegistrationFilterActive && isCustomPeriodReady && {
        registration_period: registrationPeriodFilter,
        ...(registrationPeriodFilter === 'custom' && {
          registration_date_from: customDateFrom,
          registration_date_to: customDateTo,
        }),
      }),
      ...(!isRegistrationFilterActive && {
        page: currentPage,
        page_size: pageSize,
      }),
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

  const handlePrint = (student: StudentItem) => {
    setPrintStudent(student);
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
      key: 'fee_type',
      title: t('students.feeType', 'Fee Type'),
      render: (value) => {
        const isPaid = value === 'paid';
        return (
          <Badge variant={isPaid ? 'default' : 'secondary'} className="text-xs">
            {isPaid ? t('students.feeTypeOptions.paid', 'Paid') : t('students.feeTypeOptions.free', 'Free')}
          </Badge>
        );
      }
    },
    {
      key: 'total_fee',
      title: t('students.totalFee', 'Total Fee'),
      render: (_, record) => {
        const total = parseFloat(String(record.total_fee || record.financial_summary?.total_fee || 0));
        const currency = record.financial_summary?.currency || 'AFN';
        return <span className="text-xs font-medium">{formatCurrency(total, currency)}</span>;
      }
    },
    {
      key: 'total_paid',
      title: t('students.paidFee', 'Paid'),
      render: (_, record) => {
        const paid = parseFloat(String(record.total_paid || record.financial_summary?.total_paid || 0));
        const currency = record.financial_summary?.currency || 'AFN';
        return <span className="text-xs font-medium text-green-600">{formatCurrency(paid, currency)}</span>;
      }
    },
    {
      key: 'remaining_balance',
      title: t('students.remainingFee', 'Remaining'),
      render: (_, record) => {
        const remaining = parseFloat(String(record.remaining_balance || record.financial_summary?.remaining_balance || 0));
        const currency = record.financial_summary?.currency || 'AFN';
        const color = remaining > 0 ? 'text-red-600' : 'text-green-600';
        return <span className={`text-xs font-medium ${color}`}>{formatCurrency(remaining, currency)}</span>;
      }
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
    ...(canExport ? [{
      key: 'print',
      label: t('common.print', 'Print'),
      icon: <Printer className="h-4 w-4" />,
      onClick: handlePrint,
      tooltip: t('common.print', 'Print Student Info')
    }] : []),
    {
      key: 'fees',
      label: t('students.manageFeeAssignments', 'Manage Fees'),
      icon: <DollarSign className="h-4 w-4" />,
      onClick: (record: { id: number | string }) => navigate(`/student-fee-assignments?student=${record.id}`),
      tooltip: t('students.manageFeeAssignments', 'Manage Fee Assignments')
    },
    ...(canEdit ? [{
      key: 'edit',
      label: t('students.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('students.editStudent')
    }] : []),
    ...(canDelete ? [{
      key: 'delete',
      label: t('students.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record: StudentItem) => handleDelete(record.id, record.full_name || t('students.student')),
      variant: 'ghost' as const,
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('students.deleteStudent')
    }] : []),
  ];

  const statusOptions = [
    { value: 'active', label: t('students.statusOptions.active') },
    { value: 'inactive', label: t('students.statusOptions.inactive') },
    { value: 'graduated', label: t('students.statusOptions.graduated') },
    { value: 'suspended', label: t('students.statusOptions.suspended') },
    { value: 'transferred', label: t('students.statusOptions.transferred') },
  ];

  const registrationPeriodOptions = [
    { value: 'daily', label: t('students.registrationPeriodOptions.daily') },
    { value: 'weekly', label: t('students.registrationPeriodOptions.weekly') },
    { value: 'monthly', label: t('students.registrationPeriodOptions.monthly') },
    { value: 'yearly', label: t('students.registrationPeriodOptions.yearly') },
    { value: 'custom', label: t('students.registrationPeriodOptions.custom') },
  ];

  const customFilters = [
    {
      key: 'registration_period',
      label: t('students.registrationPeriod'),
      component: (
        <Autocomplete
          options={registrationPeriodOptions}
          value={registrationPeriodFilter}
          onChange={(value) => {
            setRegistrationPeriodFilter((value as RegistrationPeriod) || '');
            setCurrentPage(1);
            if (value !== 'custom') {
              setCustomDateFrom('');
              setCustomDateTo('');
            }
          }}
          placeholder={t('students.selectRegistrationPeriod')}
          getOptionLabel={(option) => option.label}
          getOptionValue={(option) => option.value}
        />
      ),
    },
    ...(registrationPeriodFilter === 'custom'
      ? [
          {
            key: 'registration_date_from',
            label: t('students.registrationDateFrom'),
            component: (
              <DatePicker
                value={customDateFrom}
                onChange={(value) => {
                  setCustomDateFrom(value || '');
                  setCurrentPage(1);
                }}
                placeholder={t('students.selectRegistrationDateFrom')}
              />
            ),
          },
          {
            key: 'registration_date_to',
            label: t('students.registrationDateTo'),
            component: (
              <DatePicker
                value={customDateTo}
                onChange={(value) => {
                  setCustomDateTo(value || '');
                  setCurrentPage(1);
                }}
                placeholder={t('students.selectRegistrationDateTo')}
              />
            ),
          },
        ]
      : []),
    {
      key: 'class_level',
      label: t('students.classLevel'),
      component: (
        <Autocomplete
          options={CLASS_LEVELS}
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
    }
  ];

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setClassLevelFilter('');
    setRegistrationPeriodFilter('');
    setCustomDateFrom('');
    setCustomDateTo('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter || classLevelFilter || searchTerm || registrationPeriodFilter;

  return (
    <div className="space-y-6 p-6">
      <CalendarProvider>
      {/* Bulk Actions Bar - Shows when students are selected */}
      {selectedStudentIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium">
            {selectedStudentIds.size} {t('students.studentsSelected', 'students selected')}
          </span>
          {canExport && (
            <Button size="sm" onClick={() => setBulkPrintStudents(Array.from(selectedStudentIds))}>
              <Printer className="mr-2 h-4 w-4" />
              {t('students.printSelected', 'Print Selected')}
            </Button>
          )}
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
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/students/report')}>
              <FileBarChart className="mr-2 h-4 w-4" />
              {t('students.outstandingReport', 'Student Payment Reports')}
            </Button>
            <PermissionButton module="students" action="create" onClick={() => navigate('/students/add')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('students.addStudent')}
            </PermissionButton>
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
        {...(!isRegistrationFilterActive && {
          pagination: {
            current: currentPage,
            pageSize,
            total: totalItems,
            onPageChange: setCurrentPage,
            showSizeChanger: true,
            pageSizeOptions: [10, 25, 50, 100],
            onPageSizeChange: (size: number) => {
              setPageSize(size);
              setCurrentPage(1);
            },
          },
        })}
        emptyIcon={<User className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('students.noStudentsFound')}
        emptyDescription={searchTerm ? t('students.tryAdjustingSearch') : t('students.addFirstStudent')}
        loadingText={t('students.loadingStudents')}
        maxHeight="75vh"
        stickyHeader={true}
      />

      <ConfirmDialog />
      
      {/* Print Components */}
      {printStudent && (
        <StudentPrint 
          student={printStudent} 
          onClose={() => setPrintStudent(null)} 
        />
      )}
      {bulkPrintStudents.length > 0 && (
        <StudentBulkPrint
          studentIds={bulkPrintStudents}
          onClose={() => setBulkPrintStudents([])}
        />
      )}
      </CalendarProvider>
    </div>
  );
};

export default StudentList;
