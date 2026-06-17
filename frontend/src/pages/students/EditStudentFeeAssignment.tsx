import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Autocomplete } from '@/components/ui/autocomplete';
import { useLanguage } from '@/contexts/LanguageContext';
import { RotateCw, ArrowLeft, DollarSign, Users, CheckCircle, AlertCircle, Edit } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import useFetchObjects from '@/api/useFetchObjects';
import useFetchObject from '@/api/useFetchObject';
import useUpdate from '@/api/useUpdate';

// Static class level options
const CLASS_LEVELS = [
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

interface FeeType {
  id: number;
  name: string;
  code: string;
  category: string;
  is_mandatory: boolean;
}

interface Student {
  id: number;
  full_name: string;
  registration_number: string;
  class_level_details?: {
    id: string;
    name: string;
    level: string;
  };
}

interface ExistingAssignment {
  id: number;
  fee_type_id: number;
  amount: string;
  currency: string;
  payment_plan: number;
  class_level_id?: number;
  class_level_name?: string;
}

interface FeeEntry {
  fee_type_id: number;
  fee_type_name: string;
  fee_type_category: string;
  is_mandatory: boolean;
  amount: string;
  enabled: boolean;
  existing_assignment?: ExistingAssignment | null;
}

const EditStudentFeeAssignment = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = useParams();

  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currency, setCurrency] = useState<string>('AFN');
  const [paymentPlan, setPaymentPlan] = useState<number>(1);
  const [feeEntries, setFeeEntries] = useState<FeeEntry[]>([]);

  // Fetch the existing assignment
  const { data: assignmentData, isLoading: loadingAssignment } = useFetchObject<any>({
    queryKey: ['student-fee-assignment', id],
    endpoint: `student-fee-assignments/${id}/`,
  });

  // Fetch students by level
  const { data: studentsData, isLoading: loadingStudents } = useFetchObjects<{ results: Student[] }>({
    queryKey: ['students-by-level', selectedLevel, 'active'],
    endpoint: 'students',
    enabled: !!selectedLevel,
    params: {
      class_level: selectedLevel,
      status: 'active',
      page_size: 100,
    },
  });

  const studentsInLevel = studentsData?.results || [];

  // Fetch all fee types
  const { data: feeTypesData, isLoading: loadingFeeTypes } = useFetchObjects<{ results: FeeType[] }>({
    queryKey: ['fee-types-active'],
    endpoint: 'fee-types',
    params: {
      is_active: true,
      page_size: 100,
    },
  });

  const allFeeTypes = feeTypesData?.results || [];

  // Initialize from existing assignment data
  useEffect(() => {
    if (assignmentData) {
      setSelectedStudent(assignmentData.student_details || null);
      setSelectedLevel(assignmentData.class_level?.toString() || '');
      setCurrency(assignmentData.currency || 'AFN');
      setPaymentPlan(assignmentData.payment_plan || 1);
    }
  }, [assignmentData]);

  // Initialize fee entries
  useEffect(() => {
    if (allFeeTypes.length > 0 && assignmentData) {
      const entries: FeeEntry[] = allFeeTypes.map((ft) => {
        const isCurrentFee = assignmentData.fee_type === ft.id;
        return {
          fee_type_id: ft.id,
          fee_type_name: ft.name,
          fee_type_category: ft.category,
          is_mandatory: ft.is_mandatory,
          amount: isCurrentFee ? assignmentData.amount : '',
          enabled: isCurrentFee,
          existing_assignment: isCurrentFee ? {
            id: assignmentData.id,
            fee_type_id: ft.id,
            amount: assignmentData.amount,
            currency: assignmentData.currency,
            payment_plan: assignmentData.payment_plan,
          } : null,
        };
      });
      setFeeEntries(entries);
    }
  }, [allFeeTypes, assignmentData]);

  // Update entry
  const updateEntry = (feeTypeId: number, field: keyof FeeEntry, value: any) => {
    setFeeEntries((prev) =>
      prev.map((e) =>
        e.fee_type_id === feeTypeId ? { ...e, [field]: value } : e
      )
    );
  };

  // Toggle entry enabled
  const toggleEntry = (feeTypeId: number) => {
    setFeeEntries((prev) =>
      prev.map((e) =>
        e.fee_type_id === feeTypeId ? { ...e, enabled: !e.enabled } : e
      )
    );
  };

  // Calculate totals
  const enabledEntries = feeEntries.filter((e) => e.enabled && parseFloat(e.amount) > 0);
  const totalAmount = enabledEntries.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);

  const { handleUpdate, loading, isSuccess } = useUpdate({
    queryKey: ['student-fee-assignments'],
  });

  useEffect(() => {
    if (isSuccess) {
      navigate('/student-fee-assignments');
    }
  }, [isSuccess, navigate]);

  const handleSubmit = () => {
    if (!selectedStudent) {
      toast({ title: t('common.error'), description: t('students.pleaseSelectStudent', 'Please select a student'), variant: 'destructive' });
      return;
    }

    if (!selectedLevel) {
      toast({ title: t('common.error'), description: t('students.pleaseSelectLevel', 'Please select a class level'), variant: 'destructive' });
      return;
    }

    if (enabledEntries.length === 0) {
      toast({ title: t('common.error'), description: t('students.enableFeeTypeWithAmount', 'Please enable at least one fee type with an amount'), variant: 'destructive' });
      return;
    }

    const submitData = new FormData();
    submitData.append('student', selectedStudent.id.toString());
    submitData.append('class_level', selectedLevel);
    submitData.append('currency', currency);
    submitData.append('payment_plan', paymentPlan.toString());
    submitData.append('fee_type', enabledEntries[0].fee_type_id.toString());
    submitData.append('amount', enabledEntries[0].amount);

    handleUpdate(id, submitData);
  };

  const isLoading = loadingFeeTypes || loadingAssignment;

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/student-fee-assignments')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{t('students.editFeeAssignment', 'Edit Fee Assignment')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('students.updateFeeAssignmentDesc', 'Update fee assignment for student')}
          </p>
        </div>
      </div>

      {/* Step 1: Select Level & Student */}
      <Card className="border-t-4 border-t-indigo-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs">1</span>
            {t('students.selectLevelAndStudent', 'Select Class Level & Student')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('students.classLevel')} <span className="text-destructive">*</span>
              </Label>
              <Autocomplete
                options={CLASS_LEVELS}
                value={selectedLevel}
                onChange={(value) => setSelectedLevel(value as string)}
                placeholder={t('students.selectClassLevel')}
                getOptionLabel={(c) => c.name}
                getOptionValue={(c) => c.id.toString()}
                sortOptions={(a: any, b: any) => Number(a.level) - Number(b.level)}
              />
            </div>

            {selectedLevel && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('students.student')} <span className="text-destructive">*</span>
                </Label>
                <Autocomplete
                  options={studentsInLevel}
                  value={selectedStudent?.id?.toString() || ''}
                  onChange={(value, option) => {
                    if (option && option.id) {
                      setSelectedStudent(option);
                    } else {
                      setSelectedStudent(null);
                    }
                  }}
                  placeholder={loadingStudents ? t('common.loading') : t('students.selectStudent')}
                  getOptionLabel={(s) => `${s.full_name} (${s.registration_number})`}
                  getOptionValue={(s) => s.id.toString()}
                />
              </div>
            )}
          </div>

          {selectedStudent && (
            <div className="mt-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-800 dark:text-indigo-200 mb-2">
                <Users className="h-4 w-4" />
                {t('students.selectedStudent', 'Selected Student')}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">{t('students.fullName')}</div>
                  <div className="font-medium">{selectedStudent.full_name}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">{t('students.registrationNumber')}</div>
                  <div className="font-mono text-xs">{selectedStudent.registration_number}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">{t('students.classLevel')}</div>
                  <div className="font-medium">{selectedStudent.class_level_details?.name || '-'}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Configure Fees */}
      {selectedStudent && selectedLevel && (
        <Card className="border-t-4 border-t-emerald-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs">2</span>
              {t('students.configureFees', 'Configure Fee Types')}
            </CardTitle>
            <CardDescription>
              {t('students.configureFeesDesc', 'Enable fee types and set amounts for this student')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* General Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t('students.currency')}</Label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-9 px-3 border rounded-md bg-background text-sm"
                >
                  <option value="AFN">AFN - Afghan Afghani</option>
                  <option value="USD">USD - US Dollar</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t('students.paymentPlan', 'Payment Plan (months)')}</Label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={paymentPlan}
                  onChange={(e) => setPaymentPlan(parseInt(e.target.value) || 1)}
                  className="h-9"
                />
                <p className="text-[10px] text-muted-foreground">
                  {paymentPlan === 1 ? t('students.monthly') : paymentPlan === 3 ? t('students.quarterly') : paymentPlan === 6 ? t('students.semiAnnually') : paymentPlan === 12 ? t('students.yearly') : t('students.everyMonths', { months: paymentPlan })}
                </p>
              </div>
              <div className="space-y-1.5 flex items-end">
                <div className="w-full p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[10px] text-muted-foreground uppercase">{t('students.totalFees', 'Total Fees')}</div>
                  <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    {totalAmount.toLocaleString()} {currency}
                  </div>
                </div>
              </div>
            </div>

            {/* Fee Types Table */}
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                <RotateCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                {t('students.loadingFeeTypes')}
              </div>
            ) : feeEntries.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                {t('students.noFeeTypesFound', 'No fee types found. Please add fee types first.')}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 border-b">
                        <th className="p-3 text-center w-16 font-semibold text-slate-700 dark:text-slate-300">
                          {t('students.select', 'Select')}
                        </th>
                        <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                          {t('students.feeType')}
                        </th>
                        <th className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300 w-32">
                          {t('students.category')}
                        </th>
                        <th className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300 w-36">
                          {t('students.amount')}
                        </th>
                        <th className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300 w-24">
                          {t('students.mandatory')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeEntries.map((entry, index) => (
                        <tr
                          key={entry.fee_type_id}
                          className={`border-b transition-colors ${
                            entry.enabled
                              ? 'bg-emerald-50 dark:bg-emerald-900/20'
                              : entry.existing_assignment
                              ? 'bg-amber-50 dark:bg-amber-900/10'
                              : index % 2 === 0
                              ? 'bg-white dark:bg-slate-900'
                              : 'bg-slate-50 dark:bg-slate-800/50'
                          }`}
                        >
                          <td className="p-3 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => toggleEntry(entry.fee_type_id)}
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-md border-2 transition-all cursor-pointer ${
                                entry.enabled
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                  : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                              }`}
                              title={entry.enabled ? t('students.clickToDeselect') : t('students.clickToSelect')}
                            >
                              {entry.enabled && <CheckCircle className="h-4 w-4" />}
                            </button>
                          </td>
                          <td className="p-3 align-middle">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {entry.fee_type_name}
                              </span>
                              {entry.existing_assignment && !entry.enabled && (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200">
                                    <Edit className="h-3 w-3 mr-1" />
                                    {parseInt(entry.existing_assignment.amount).toLocaleString()} {entry.existing_assignment.currency}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center align-middle">
                            <Badge variant="secondary" className="text-xs">
                              {entry.fee_type_category}
                            </Badge>
                          </td>
                          <td className="p-3 text-center align-middle">
                            <Input
                              type="number"
                              step="0.01"
                              value={entry.amount}
                              onChange={(e) => updateEntry(entry.fee_type_id, 'amount', e.target.value)}
                              placeholder={entry.existing_assignment?.amount || "0.00"}
                              className={`h-9 w-32 mx-auto text-center ${
                                !entry.enabled 
                                  ? 'opacity-50 bg-slate-100 dark:bg-slate-800' 
                                  : 'border-emerald-300 dark:border-emerald-700'
                              }`}
                              disabled={!entry.enabled}
                            />
                          </td>
                          <td className="p-3 text-center align-middle">
                            {entry.is_mandatory ? (
                              <Badge className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                                {t('common.yes')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-slate-500 dark:text-slate-400">
                                {t('common.no')}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => navigate('/student-fee-assignments')} disabled={loading}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSubmit} disabled={loading || enabledEntries.length === 0} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                {loading ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    {t('common.updating')}
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4" />
                    {t('common.update')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EditStudentFeeAssignment;
