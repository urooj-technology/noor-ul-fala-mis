import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { useAuth } from '@/contexts/AuthContext';
import useFetchObjects from '@/api/useFetchObjects';
import { User, Phone, MapPin, DollarSign, Calendar, Briefcase, ArrowLeft, Users } from 'lucide-react';
import { ReloadIcon } from '@radix-ui/react-icons';
import { getCurrentYear, getYearsArray, SHAMSI_MONTHS_DARI, SHAMSI_MONTHS_PASHTO, gregorianToShamsi } from '@/utils/calendar';
import { EmployeeFinanceSummaryCards, EmployeeFinancialSummary } from '@/components/ui/employee-finance-summary';
import { Employee } from '@/types/employee';
import { getEmployeePositionLabel } from '@/lib/employee-positions';

const getCurrentShamsiMonth = () => {
  const now = new Date();
  const shamsi = gregorianToShamsi(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return shamsi.month;
};

const EmployeeDetails = () => {
  const { t, language } = useLanguage();
  const { calendarType } = useCalendar();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const currentYear = getCurrentYear(calendarType);
  const months = language === 'ps' ? SHAMSI_MONTHS_PASHTO : SHAMSI_MONTHS_DARI;
  const years = getYearsArray(calendarType, 10);

  const [selectedMonth, setSelectedMonth] = useState(getCurrentShamsiMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [financialSummary, setFinancialSummary] = useState<EmployeeFinancialSummary | null>(null);
  const [loadingFinance, setLoadingFinance] = useState(false);

  const { data: employee, isLoading } = useFetchObjects<Employee>({
    queryKey: ['employee', id],
    endpoint: `employees/${id}`,
  });

  useEffect(() => {
    if (!id) return;

    const fetchFinance = async () => {
      setLoadingFinance(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/employees/${id}/financial_summary/?month=${selectedMonth}&year=${selectedYear}&calendar_type=${calendarType}`,
          { headers: { Authorization: `Token ${user?.token}` } }
        );
        if (response.ok) {
          setFinancialSummary(await response.json());
        }
      } catch (error) {
        console.error('Error fetching financial summary:', error);
      } finally {
        setLoadingFinance(false);
      }
    };

    fetchFinance();
  }, [id, selectedMonth, selectedYear, calendarType, user?.token]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center">
        <ReloadIcon className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="container mx-auto py-6">
        <p>Employee not found</p>
      </div>
    );
  }

  const selectedMonthName = months[selectedMonth - 1] || selectedMonth.toString();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/employees')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-base font-bold">{t('employees.employeeDetails')}</h1>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-6 border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {employee.full_name || 'Unknown Employee'}
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {getEmployeePositionLabel(t, employee.position) || '-'}
                </p>
              </div>
            </div>
            <Badge variant={employee.is_active ? 'default' : 'secondary'} className="px-3 py-1">
              {employee.is_active ? t('employees.active') : t('employees.inactive')}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{t('employees.dateJoined')}</p>
                <p className="font-semibold text-xs">
                  {employee.created_at
                    ? new Date(employee.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                    : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{t('employees.salary')}</p>
                <p className="font-bold text-green-600 text-xs">
                  {Number(employee.salary || 0).toFixed(2)} {employee.currency_details?.code || employee.currency || ''}
                </p>
              </div>
            </div>

            {employee.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{t('employees.phone')}</p>
                  <p className="font-medium text-blue-600 text-xs">{employee.phone}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              {t('employees.employeeDetails')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('employees.fullName')}</p>
                    <p className="font-semibold text-xs">{employee.full_name || 'N/A'}</p>
                  </div>
                </div>
                {employee.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{t('employees.phone')}</p>
                      <p className="font-medium text-xs">{employee.phone}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {employee.position && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{t('employees.position')}</p>
                      <p className="font-medium text-xs">{getEmployeePositionLabel(t, employee.position)}</p>
                    </div>
                  </div>
                )}
                {employee.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{t('employees.address')}</p>
                      <p className="font-medium text-xs">{employee.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                {t('employees.financialSummary')}
              </CardTitle>
              <div className="flex items-end gap-3">
                <div>
                  <Label className="text-xs">{t('employees.month')}</Label>
                  <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, idx) => (
                        <SelectItem key={idx + 1} value={(idx + 1).toString()}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t('employees.year')}</Label>
                  <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('employees.financeForPeriod').replace('{month}', selectedMonthName).replace('{year}', selectedYear.toString())}
            </p>
          </CardHeader>
          <CardContent className="p-6">
            {loadingFinance ? (
              <div className="flex justify-center py-8">
                <ReloadIcon className="animate-spin h-6 w-6" />
              </div>
            ) : (
              <EmployeeFinanceSummaryCards summary={financialSummary} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDetails;
