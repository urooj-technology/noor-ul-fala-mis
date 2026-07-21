import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { RotateCw, ArrowLeft, GraduationCap, Users, CheckCircle, AlertCircle, Printer } from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'sonner';

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

interface SelectedStudent {
  id: number;
  registration_number: string;
  full_name: string;
  class_level?: { id?: string; name?: string } | null;
  father_name?: string;
  status: string;
}

const BulkChangeClassLevel = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const studentIdsParam = searchParams.get('ids');
  const studentIds = useMemo(() => {
    if (!studentIdsParam) return [];
    return studentIdsParam.split(',').map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
  }, [studentIdsParam]);

  const classLevels = CLASS_LEVELS;
  const [selectedClassLevelId, setSelectedClassLevelId] = useState<string>('');
  const [students, setStudents] = useState<SelectedStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch selected students
  useEffect(() => {
    if (studentIds.length === 0) {
      setLoadingStudents(false);
      return;
    }
    setLoadingStudents(true);
    setStudents([]);

    // Fetch students by IDs
    api.get<SelectedStudent[] | { results: SelectedStudent[] }>('students/', {
      params: { id__in: studentIds.join(','), page_size: 1000 },
    })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setStudents(data);
      })
      .catch(() => {
        // Fallback: fetch individually
        Promise.all(
          studentIds.map((id) =>
            api.get<SelectedStudent>(`students/${id}/`)
              .then((r) => r.data)
              .catch(() => null)
          )
        ).then((results) => {
          setStudents(results.filter(Boolean) as SelectedStudent[]);
        });
      })
      .finally(() => setLoadingStudents(false));
  }, [studentIds]);

  const selectedLevel = useMemo(
    () => classLevels.find((cl) => cl.id === selectedClassLevelId),
    [classLevels, selectedClassLevelId]
  );

  const changed = useMemo(() => {
    if (!selectedLevel) return [] as SelectedStudent[];
    return students.filter((s) => !s.class_level || s.class_level.name !== selectedLevel.name);
  }, [students, selectedLevel]);

  const unchanged = students.length - changed.length;

  const handleSubmit = async () => {
    if (!selectedClassLevelId || changed.length === 0) return;
    setSubmitting(true);
    try {
      const res = await api.post<{ updated_count: number; class_level: { id: string; name: string } }>(
        'students/bulk_change_class/',
        { student_ids: changed.map((s) => s.id), class_level: selectedClassLevelId }
      );
      toast.success(t('students.bulkUpdateSuccess', 'Class Level Updated'), {
        description: `${res.data.updated_count} ${t('students.studentsUpdated', 'students updated')}`,
        duration: 4000,
        position: 'top-right',
      });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      navigate('/students');
    } catch {
      toast.error(t('common.error', 'Error'), {
        description: t('students.bulkUpdateFailed', 'Failed to update class levels'),
        duration: 5000,
        position: 'top-right',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/students')} className="rounded-full hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-bold">{t('students.bulkChangeClassLevel', 'Bulk Change Class Level')}</h1>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          {t('common.print', 'Print')}
        </Button>
      </div>

      {/* No students selected */}
      {!loadingStudents && studentIds.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {t('students.noStudentsSelected', 'No students selected. Go back to the student list and select students first.')}
            </p>
            <Button className="mt-4" onClick={() => navigate('/students')}>
              {t('students.backToList', 'Back to Student List')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loadingStudents && (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-muted-foreground">
            <RotateCw className="h-5 w-5 animate-spin" />
            <span>{t('common.loading')}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!loadingStudents && studentIds.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — Selector + Submit */}
          <div className="space-y-6">
            <Card className="border-t-4 border-t-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  {t('students.selectNewClassLevel', 'New Class Level')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t('students.moveToClass', 'Move Students To')}
                  </Label>
                  <Select value={selectedClassLevelId} onValueChange={setSelectedClassLevelId}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={t('students.selectClassLevel', 'Select a class level')} />
                    </SelectTrigger>
                    <SelectContent>
                      {classLevels.map((cl) => (
                        <SelectItem key={cl.id} value={cl.id.toString()}>
                          <span className="flex items-center gap-1.5">
                            <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                            {cl.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Summary box */}
                {selectedLevel && (
                  <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {t('students.changeSummary', 'Change Summary')}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-muted-foreground">{t('students.totalSelected', 'Total Selected')}</div>
                        <div className="font-bold text-sm mt-0.5">{students.length}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">{t('students.willChange', 'Will Be Changed')}</div>
                        <div className="font-bold text-sm text-primary mt-0.5">{changed.length}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">{t('students.alreadyInLevel', 'Already in Level')}</div>
                        <div className="font-bold text-sm text-muted-foreground mt-0.5">{unchanged}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">{t('students.targetLevel', 'Target Level')}</div>
                        <div className="font-bold text-sm mt-0.5">{selectedLevel.name}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={!selectedClassLevelId || changed.length === 0 || submitting}
                    className="flex-1 gap-2"
                  >
                    {submitting ? (
                      <><RotateCw className="h-4 w-4 animate-spin" />{t('common.applying', 'Applying')}</>
                    ) : (
                      <><CheckCircle className="h-4 w-4" />{t('students.applyChanges', 'Apply Changes')}</>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/students')}>{t('common.cancel')}</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right — Student Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  {t('students.selectedStudents', 'Selected Students')}
                  <Badge variant="secondary" className="text-[10px] ml-1.5">{students.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[60vh] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10">
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          #
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {t('students.registrationNumber')}
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {t('students.fullName')}
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {t('students.currentClass', 'Current Class')}
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {t('students.status')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, idx) => {
                        const affected = selectedLevel && (!s.class_level || s.class_level.name !== selectedLevel.name);
                        return (
                          <tr
                            key={s.id}
                            className={`border-b last:border-0 transition-colors ${
                              affected
                                ? 'bg-primary/5'
                                : 'bg-transparent'
                            }`}
                          >
                            <td className="py-2.5 px-3">
                              <span className="text-xs text-muted-foreground">{idx + 1}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-xs font-mono">{s.registration_number || '—'}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-xs font-medium">{s.full_name || '—'}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              {affected ? (
                                <span className="inline-flex items-center gap-1 text-xs">
                                  <span className="text-red-500 line-through">{s.class_level?.name || '—'}</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="font-bold text-primary">{selectedLevel?.name}</span>
                                </span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <GraduationCap className="h-3 w-3 text-muted-foreground/50" />
                                  <span className="text-xs">{s.class_level?.name || t('students.notSet', 'Not Set')}</span>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge className={`text-[10px] ${
                                s.status === 'active'
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : s.status === 'graduated'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : s.status === 'suspended'
                                  ? 'bg-red-100 text-red-800 border-red-200'
                                  : 'bg-gray-100 text-gray-800 border-gray-200'
                              }`}>
                                {t(`students.statusOptions.${s.status}`, s.status)}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Footer notice */}
                {selectedLevel && (
                  <div className="mt-3 flex items-center gap-2 text-xs border-t pt-3">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="text-muted-foreground">
                      {changed.length} {t('students.willChange', 'student(s) will be changed')}, {unchanged} {t('students.alreadyAtLevel', 'already at this level')}.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkChangeClassLevel;
