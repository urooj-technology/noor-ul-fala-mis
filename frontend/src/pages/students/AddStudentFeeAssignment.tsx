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
import useAdd from '@/api/useAdd';

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
    id: number;
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
  assignment_count?: number;
  suggested_amount?: string;
  existing_assignment?: ExistingAssignment | null;
}

const AddStudentFeeAssignment = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currency, setCurrency] = useState<string>('AFN');
  const [paymentPlan, setPaymentPlan] = useState<number>(1);
  const [feeEntries, setFeeEntries] = useState<FeeEntry[]>([]);

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

  const { data: classLevelsData } = useFetchObjects<any>({ queryKey: ['class-levels'], endpoint: 'class-levels' });
  const classLevels = (classLevelsData?.results || classLevelsData || []).sort((a: any, b: any) => Number(a.level) - Number(b.level));

  // Fetch all fee types (independent of student/level selection)
  const { data: feeTypesData, isLoading: loadingFeeTypes } = useFetchObjects<{ results: FeeType[] }>({
    queryKey: ['fee-types-active'],
    endpoint: 'fee-types',
    params: {
      is_active: true,
      page_size: 100,
    },
  });

  const allFeeTypes = feeTypesData?.results || [];

  // Fetch existing assignments for the selected student and level
  const { data: existingAssignmentsData, isLoading: loadingExisting } = useFetchObjects<{
    student_assignments: ExistingAssignment[];
  }>({
    queryKey: ['student-existing-assignments', selectedStudent?.id, selectedLevel],
    endpoint: 'student-fee-assignments/fee_assignment_data',
    enabled: !!selectedStudent && !!selectedLevel,
    params: {
      class_level: selectedLevel,
      student: selectedStudent?.id || '',
    },
  });

  // Initialize fee entries when data loads
  useEffect(() => {
    if (allFeeTypes.length > 0) {
      const existingMap = new Map<number, ExistingAssignment>(
        (existingAssignmentsData?.student_assignments || []).map((a) => [a.fee_type_id, a])
      );

      const entries: FeeEntry[] = allFeeTypes.map((ft) => {
        const existing = existingMap.get(ft.id);
        
        return {
          fee_type_id: ft.id,
          fee_type_name: ft.name,
          fee_type_category: ft.category,
          is_mandatory: ft.is_mandatory,
          amount: existing?.amount || '',
          enabled: !!existing,
          existing_assignment: existing || null,
        };
      });

      setFeeEntries(entries);
    }
  }, [allFeeTypes, existingAssignmentsData, selectedStudent, selectedLevel]);

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

  // Count existing assignments being edited
  const editingCount = enabledEntries.filter((e) => e.existing_assignment).length;
  const newCount = enabledEntries.filter((e) => !e.existing_assignment).length;

  // Submit using useAdd hook - single request to bulk_assign_fees
  const { handleAdd, loading, isSuccess } = useAdd<any>({
    queryKey: ['student-fee-assignments'],
    endpoint: 'student-fee-assignments/bulk_assign_fees',
    customSuccessMessage: 'Fee assignments created/updated successfully',
  });

  // Redirect on success
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

    // Single request with all assignments
    const submitData = {
      student: selectedStudent.id,
      class_level: selectedLevel,
      currency: currency,
      payment_plan: paymentPlan,
      assignments: enabledEntries.map((e) => ({
        fee_type: e.fee_type_id,
        amount: e.amount,
      })),
    };

    handleAdd(submitData);
  };

  const isLoading = loadingFeeTypes || loadingExisting;

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/student-fee-assignments')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{t('students.bulkFeeAssignment', 'Bulk Fee Assignment')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('students.assignFeesToStudent', 'Assign multiple fee types to a student at once')}
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
                endpoint="class-levels"
                value={selectedLevel}
                onChange={(value) => {
                  setSelectedLevel(value as string);
                  setSelectedStudent(null);
                  setFeeEntries([]);
                }}
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
                  <div className="text-[10px] text-muted-foreground">
                    {newCount > 0 && `${newCount} new`}
                    {newCount > 0 && editingCount > 0 && ' • '}
                    {editingCount > 0 && `${editingCount} updated`}
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
                        <th className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300 w-28">
                          {t('students.status', 'Status')}
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
                          <td className="p-3 text-center align-middle">
                            {entry.enabled && entry.existing_assignment ? (
                              <Badge className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700">
                                <Edit className="h-3 w-3 mr-1" />
                                {t('students.updating', 'Updating')}
                              </Badge>
                            ) : entry.enabled ? (
                              <Badge className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                                {t('students.new', 'New')}
                              </Badge>
                            ) : entry.existing_assignment ? (
                              <Badge variant="outline" className="text-xs text-amber-700 dark:text-amber-300">
                                {t('students.existing', 'Existing')}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-emerald-500"></div>
                <span>Selected for assignment</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-amber-100 border border-amber-300"></div>
                <span>Already assigned for this level (click to modify)</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => navigate('/student-fee-assignments')} disabled={loading}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSubmit} disabled={loading || enabledEntries.length === 0} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                {loading ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4" />
                    {t('students.assignFees', 'Assign Fees')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!selectedStudent && selectedLevel && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {t('students.selectStudentToContinue', 'Select a student to continue')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty State - No Level Selected */}
      {!selectedLevel && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {t('students.selectLevelToContinue', 'Select a class level to continue')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AddStudentFeeAssignment;
