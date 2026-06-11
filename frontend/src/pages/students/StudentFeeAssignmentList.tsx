import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Edit, Trash2, DollarSign, ArrowLeft, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Autocomplete } from '@/components/ui/autocomplete';
import DataTable, { TableColumn, TableAction } from '@/components/ui/data-table';
import { useLanguage } from '@/contexts/LanguageContext';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';

export const StudentFeeAssignmentList = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studentIdFromUrl = searchParams.get('student');

  const [searchTerm, setSearchTerm] = useState('');
  const [studentFilter, setStudentFilter] = useState(studentIdFromUrl || '');
  const [levelFilter, setLevelFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    if (studentIdFromUrl) setStudentFilter(studentIdFromUrl);
  }, [studentIdFromUrl]);

  const { data: assignmentsData, isLoading } = useFetchObjects<{ results: any[]; count: number }>({
    queryKey: ['student-fee-assignments', currentPage.toString(), pageSize.toString(), searchTerm, studentFilter, levelFilter],
    endpoint: 'student-fee-assignments/',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm,
      ...(studentFilter && { student: studentFilter }),
      ...(levelFilter && { class_level: levelFilter }),
    },
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['student-fee-assignments'],
    endpoint: 'student-fee-assignments'
  });

  const assignments = assignmentsData?.results || [];
  const totalItems = assignmentsData?.count || 0;

  // Calculate totals
  const totalFees = assignments.reduce((sum: number, a: any) => sum + (parseFloat(a.amount) || 0), 0);
  const totalPaid = assignments.reduce((sum: number, a: any) => sum + (parseFloat(a.paid_amount) || 0), 0);
  const totalRemaining = assignments.reduce((sum: number, a: any) => sum + (parseFloat(a.remaining_amount) || 0), 0);
  const currency = assignments[0]?.currency || 'AFN';

  const handleEdit = (record: any) => navigate(`/student-fee-assignments/${record.id}/edit`);

  const columns: TableColumn[] = [
    {
      key: 'student_registration',
      title: t('students.registrationNumber'),
      render: (value) => <span className="font-mono text-xs font-semibold">{value}</span>
    },
    {
      key: 'student_name',
      title: t('students.fullName'),
      render: (value) => <span className="text-xs font-medium">{value}</span>
    },
    {
      key: 'fee_type_details',
      title: t('students.feeType', 'Fee Type'),
      render: (value) => <Badge variant="outline" className="text-xs">{value?.name || '-'}</Badge>
    },
    {
      key: 'class_level',
      title: t('students.classLevel'),
      render: (value, record: any) => {
        const levelName = record.class_level_details?.name || (value ? `Level ${value}` : '-');
        return <span className="text-xs font-medium">{levelName}</span>;
      }
    },
    {
      key: 'amount',
      title: t('students.amount'),
      render: (value, record: any) => (
        <span className="font-bold text-xs text-foreground">{Number(value || 0).toFixed(2)} {record.currency}</span>
      )
    },
    {
      key: 'paid_amount',
      title: t('students.paidAmount', 'Paid'),
      render: (value, record: any) => {
        const paid = parseFloat(value || '0');
        const amount = parseFloat(record.amount || '0');
        const percentage = amount > 0 ? (paid / amount) * 100 : 0;
        return (
          <div className="space-y-1">
            <span className="text-xs font-medium text-emerald-600">{paid.toFixed(2)}</span>
            {amount > 0 && (
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${percentage >= 100 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'remaining_amount',
      title: t('students.remainingAmount', 'Remaining'),
      render: (value, record: any) => {
        const remaining = parseFloat(value || '0');
        return (
          <span className={`font-bold text-xs ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {remaining.toFixed(2)}
          </span>
        );
      }
    },
    {
      key: 'payment_plan',
      title: t('students.paymentPlan'),
      render: (value) => (
        <Badge variant="outline" className="text-xs">{value} {t('students.months', 'mo')}</Badge>
      )
    },
    {
      key: 'status',
      title: t('students.status', 'Status'),
      render: (value, record: any) => {
        const remaining = parseFloat(record.remaining_amount || '0');
        const paid = parseFloat(record.paid_amount || '0');
        if (remaining <= 0 && paid > 0) return <Badge className="bg-emerald-100 text-emerald-800 text-xs">{t('common.paid')}</Badge>;
        if (paid > 0) return <Badge className="bg-blue-100 text-blue-800 text-xs">{t('common.partial')}</Badge>;
        return <Badge variant="outline" className="text-xs">{t('common.unpaid')}</Badge>;
      }
    },
    {
      key: 'is_active',
      title: t('students.active'),
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'} className="text-xs">
          {value ? t('common.active') : t('common.inactive')}
        </Badge>
      )
    },
  ];

  const rowActions: TableAction[] = [
    {
      key: 'edit',
      label: t('students.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit,
      tooltip: t('students.editFeeAssignment')
    },
    {
      key: 'delete',
      label: t('students.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record) => handleDelete(record.id, t('students.feeAssignment')),
      variant: 'ghost',
      className: 'text-red-600 hover:text-red-700',
      tooltip: t('students.deleteFeeAssignment')
    }
  ];

  const customFilters = [
    {
      key: 'student',
      label: t('students.student'),
      component: (
        <Autocomplete
          endpoint="students"
          value={studentFilter}
          onChange={(value) => { setStudentFilter(value as string); setCurrentPage(1); }}
          placeholder={t('students.selectStudent')}
          getOptionLabel={(s) => `${s.full_name} (${s.registration_number})`}
          getOptionValue={(s) => s.id.toString()}
        />
      )
    },
    {
      key: 'level',
      label: t('students.classLevel'),
      component: (
        <Autocomplete
          endpoint="class-levels"
          value={levelFilter}
          onChange={(value) => { setLevelFilter(value as string); setCurrentPage(1); }}
          placeholder={t('students.selectClassLevel')}
          getOptionLabel={(c) => c.name}
          getOptionValue={(c) => c.id.toString()}
        />
      )
    }
  ];

  const hasFilters = studentFilter || levelFilter || searchTerm;

  return (
    <div className="space-y-6 p-6">
      {studentFilter && (
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => { setStudentFilter(''); navigate('/student-fee-assignments'); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{t('students.studentFees')}</h2>
            <p className="text-sm text-muted-foreground">{t('students.manageFeeAssignments')}</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {assignments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">{t('students.totalFees')}:</span>
            </div>
            <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{totalFees.toFixed(2)} {currency}</span>
          </div>
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">{t('students.totalPaid')}:</span>
            </div>
            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{totalPaid.toFixed(2)} {currency}</span>
          </div>
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-800 dark:text-red-200">{t('students.totalRemaining')}:</span>
            </div>
            <span className="text-xl font-bold text-red-700 dark:text-red-300">{totalRemaining.toFixed(2)} {currency}</span>
          </div>
        </div>
      )}

      <DataTable
        data={assignments}
        columns={columns}
        loading={isLoading}
        title={t('students.feeAssignments')}
        subtitle={t('students.manageFeeAssignments')}
        icon={<DollarSign className="h-5 w-5" />}
        headerActions={
          <Button onClick={() => navigate('/student-fee-assignments/add')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('students.addFeeAssignment')}
          </Button>
        }
        searchable
        searchPlaceholder={t('students.searchFeeAssignments')}
        searchValue={searchTerm}
        onSearch={(value) => { setSearchTerm(value); setCurrentPage(1); }}
        customFilters={customFilters}
        showClearFilters={hasFilters}
        clearFiltersLabel={t('students.clearFilters')}
        onClearFilters={() => { setStudentFilter(''); setLevelFilter(''); setSearchTerm(''); setCurrentPage(1); }}
        rowActions={rowActions}
        pagination={{
          current: currentPage,
          pageSize,
          total: totalItems,
          onPageChange: setCurrentPage,
          showSizeChanger: true,
          pageSizeOptions: [10, 25, 50, 100],
          onPageSizeChange: (size) => { setPageSize(size); setCurrentPage(1); }
        }}
        emptyIcon={<DollarSign className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('students.noFeeAssignmentsFound')}
        emptyDescription={t('students.addFirstFeeAssignment')}
        loadingText={t('students.loadingFeeAssignments')}
        maxHeight="75vh"
        stickyHeader={true}
      />
      <ConfirmDialog />
    </div>
  );
};

export default StudentFeeAssignmentList;
