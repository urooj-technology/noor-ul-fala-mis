import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { PermissionButton } from '@/components/ui/permission-button';
import { Badge } from '@/components/ui/badge';
import { Autocomplete } from '@/components/ui/autocomplete';
import DataTable, { TableColumn, TableAction } from '@/components/ui/data-table';
import { useCrudPermissions } from '@/hooks/useCrudPermissions';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar, CalendarProvider } from '@/contexts/CalendarContext';
import { formatDateByCalendarType } from '@/utils/calendar';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';

interface StudentDetails {
  id: number;
  full_name: string;
  registration_number: string;
  class_level?: string;
  payment_interval_months?: number;
}

interface PaymentRecord {
  id: number;
  reference_number: string | null;
  student_details: StudentDetails | null;
  payment_interval_months?: number;
  amount: string | number;
  currency: string;
  payment_date: string;
  payment_status: string;
  fee_type?: number;
  fee_type_details?: {
    id: number;
    name: string;
    code: string;
    category: string;
  };
  period_month?: string;
  period_year?: string;
}

interface PaginatedResponse {
  results: PaymentRecord[];
  count: number;
  next: string | null;
  previous: string | null;
}

export const StudentPaymentList = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const { canEdit, canDelete } = useCrudPermissions('student_payments');
  const lang = t('language.code') as 'fa' | 'ps';
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [studentFilter, setStudentFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: paymentsData, isLoading } = useFetchObjects<PaginatedResponse>({
    queryKey: ['student-payments', currentPage.toString(), pageSize.toString(), searchTerm, statusFilter, studentFilter],
    endpoint: 'student-payments',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm,
      ...(statusFilter !== 'all' && { payment_status: statusFilter }),
      ...(studentFilter && { student: studentFilter }),
    }
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['student-payments'],
    endpoint: 'student-payments',
    invalidateQueryKeys: [['student-fee-assignments']],
  });

  const payments = paymentsData?.results || [];
  const totalItems = paymentsData?.count || 0;

  // Calculate totals
  const totalAmount = payments.reduce((sum: number, p: PaymentRecord) => sum + (parseFloat(String(p.amount)) || 0), 0);
  const completedPayments = payments.filter((p: PaymentRecord) => p.payment_status === 'completed');
  const completedTotal = completedPayments.reduce((sum: number, p: PaymentRecord) => sum + (parseFloat(String(p.amount)) || 0), 0);
  const currency = payments[0]?.currency || 'AFN';

  const handleEdit = (payment: PaymentRecord) => {
    navigate(`/student-payments/${payment.id}/edit`);
  };

  const handleDetails = (payment: PaymentRecord) => {
    navigate(`/student-payments/${payment.id}`);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      refunded: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return (
      <Badge className={`${colors[status] || ''} text-xs`}>
        {t(`student-payments.status.${status}`) || status}
      </Badge>
    );
  };

  const columns: TableColumn[] = [
    {
      key: 'reference_number',
      title: t('student-payments.referenceNumber'),
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="font-semibold text-xs">{value || t('common.notAvailable')}</span>
        </div>
      )
    },
    {
      key: 'student_details',
      title: t('student-payments.student'),
      render: (value) => (
        <div className="space-y-0.5">
          <span className="text-xs font-medium">{value?.full_name || t('common.notAvailable')}</span>
          {value?.class_level && (
            <span className="text-[10px] text-muted-foreground block">Class: {value.class_level}</span>
          )}
        </div>
      )
    },
    {
      key: 'fee_type_details',
      title: t('student-payments.feeType', 'Fee Type'),
      render: (value) => {
        if (!value) return <span className="text-xs text-muted-foreground">-</span>;
        return (
          <Badge variant="outline" className="text-[10px]">
            {value.name}
          </Badge>
        );
      }
    },
    {
      key: 'period_month',
      title: t('student-payments.period', 'Period'),
      render: (value, record: PaymentRecord) => {
        if (!value || !record.period_year) return <span className="text-xs text-muted-foreground">-</span>;
        return (
          <Badge variant="secondary" className="text-[10px]">
            {value}/{record.period_year}
          </Badge>
        );
      }
    },
    {
      key: 'amount',
      title: t('student-payments.amount'),
      render: (value, record: PaymentRecord) => (
        <span className="font-bold text-xs text-green-600">
          {Number(value || 0).toFixed(2)} {record.currency || ''}
        </span>
      )
    },
    {
      key: 'payment_date',
      title: t('student-payments.paymentDate'),
      render: (value) => {
        if (!value) return t('common.notAvailable');
        return (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-xs">
              {formatDateByCalendarType(value, calendarType, lang)}
            </span>
          </div>
        );
      }
    },
    {
      key: 'payment_status',
      title: t('student-payments.paymentStatus'),
      render: (value) => getStatusBadge(value || 'pending')
    }
  ];

  const rowActions: TableAction[] = [
    {
      key: 'view',
      label: t('student-payments.viewDetails'),
      icon: <Eye className="h-4 w-4" />,
      onClick: handleDetails,
      tooltip: t('student-payments.viewDetails')
    },
    ...(canEdit ? [{
      key: 'edit',
      label: t('student-payments.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('student-payments.editPayment')
    }] : []),
    ...(canDelete ? [{
      key: 'delete',
      label: t('student-payments.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record: PaymentRecord) => handleDelete(record.id, record.reference_number || 'Payment'),
      variant: 'ghost' as const,
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('student-payments.deletePayment')
    }] : []),
  ];

  const statusOptions = [
    { value: 'pending', label: t('student-payments.status.pending') },
    { value: 'completed', label: t('student-payments.status.completed') },
    { value: 'cancelled', label: t('student-payments.status.cancelled') },
    { value: 'refunded', label: t('student-payments.status.refunded') },
  ];

  const customFilters = [
    {
      key: 'student',
      label: t('student-payments.student'),
      component: (
        <Autocomplete
          endpoint="students"
          value={studentFilter}
          onChange={(value) => {
            setStudentFilter(value as string);
            setCurrentPage(1);
          }}
          placeholder={t('student-payments.selectStudent')}
          getOptionLabel={(s) => s.full_name}
          getOptionValue={(s) => s.id.toString()}
        />
      )
    },
    {
      key: 'status',
      label: t('student-payments.paymentStatus'),
      component: (
        <Autocomplete
          options={statusOptions}
          value={statusFilter === 'all' ? '' : statusFilter}
          onChange={(value) => {
            setStatusFilter(value as string || 'all');
            setCurrentPage(1);
          }}
          placeholder={t('student-payments.selectStatus')}
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
    setStatusFilter('all');
    setStudentFilter('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter !== 'all' || studentFilter || searchTerm;

  return (
    <div className="space-y-6 p-6">
      <CalendarProvider>
        {/* Summary Cards */}
        {payments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">{t('students.totalPayments', 'Total Payments')}:</span>
              </div>
              <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{totalAmount.toFixed(2)} {currency}</span>
              <div className="text-xs text-muted-foreground mt-1">{payments.length} payment(s)</div>
            </div>
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">{t('students.completedTotal', 'Completed')}:</span>
              </div>
              <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{completedTotal.toFixed(2)} {currency}</span>
              <div className="text-xs text-muted-foreground mt-1">{completedPayments.length} completed</div>
            </div>
            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-800 dark:text-indigo-200">{t('students.pendingTotal', 'Pending')}:</span>
              </div>
              <span className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                {(totalAmount - completedTotal).toFixed(2)} {currency}
              </span>
              <div className="text-xs text-muted-foreground mt-1">{payments.length - completedPayments.length} pending</div>
            </div>
          </div>
        )}

        <DataTable
          data={payments}
          columns={columns}
          loading={isLoading}
          title={t('student-payments.studentPayments')}
          subtitle={t('student-payments.managePayments')}
          icon={<DollarSign className="h-5 w-5" />}
          headerActions={
            <PermissionButton module="student_payments" action="create" onClick={() => navigate('/student-payments/add')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('student-payments.addPayment')}
            </PermissionButton>
          }
          searchable
          searchPlaceholder={t('student-payments.searchPayments')}
          searchValue={searchTerm}
          onSearch={handleSearch}
          customFilters={customFilters}
          showClearFilters={hasActiveFilters}
          clearFiltersLabel={t('student-payments.clearFilters')}
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
          emptyIcon={<DollarSign className="h-8 w-8 text-muted-foreground" />}
          emptyTitle={t('student-payments.noPaymentsFound')}
          emptyDescription={searchTerm ? t('student-payments.tryAdjustingSearch') : t('student-payments.addFirstPayment')}
          loadingText={t('student-payments.loadingPayments')}
          maxHeight="75vh"
          stickyHeader={true}
        />
      </CalendarProvider>

      <ConfirmDialog />
    </div>
  );
};

export default StudentPaymentList;
