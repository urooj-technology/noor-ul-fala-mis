import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { formatDateByCalendarType } from '@/utils/calendar';
import { DollarSign, User, Calendar, FileText, ArrowLeft } from 'lucide-react';
import { ReloadIcon } from '@radix-ui/react-icons';

const PayrollDetails = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const lang = t('language.code') as 'fa' | 'ps';
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: payroll, isLoading } = useFetchObjects<any>({
    queryKey: ['payroll', id],
    endpoint: `payrolls/${id}`,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center">
        <ReloadIcon className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!payroll) {
    return (
      <div className="container mx-auto py-6">
        <p>Payroll not found</p>
      </div>
    );
  }

  const months = [
    { value: 'january', label: t('advance.months.january') },
    { value: 'february', label: t('advance.months.february') },
    { value: 'march', label: t('advance.months.march') },
    { value: 'april', label: t('advance.months.april') },
    { value: 'may', label: t('advance.months.may') },
    { value: 'june', label: t('advance.months.june') },
    { value: 'july', label: t('advance.months.july') },
    { value: 'august', label: t('advance.months.august') },
    { value: 'september', label: t('advance.months.september') },
    { value: 'october', label: t('advance.months.october') },
    { value: 'november', label: t('advance.months.november') },
    { value: 'december', label: t('advance.months.december') },
  ];

  const monthLabel = months.find(m => m.value === payroll.month)?.label || payroll.month;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/payroll')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          <h1 className="text-base font-boldtext-sm">{t('payroll.payrollDetails')}</h1>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-6 border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100text-sm">
                {payroll.currency_details?.symbol || '$'}{Number(payroll.net_salary || 0).toFixed(2)}
              </h2>
              <p className="text-base text-gray-600 dark:text-gray-400text-xs">{monthLabel} {payroll.year}</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            {t('payroll.employeeInformation')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-base text-gray-600 dark:text-gray-400text-xs">{t('payroll.employee')}</p>
                <p className="font-semibold text-smtext-xs">{payroll.employee_details?.fullname || 'N/A'}</p>
              </div>
            </div>
            {payroll.employee_details?.position && (
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-base text-gray-600 dark:text-gray-400text-xs">Position</p>
                  <p className="font-mediumtext-xs">{payroll.employee_details.position}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            {t('payroll.salaryBreakdown')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-base text-gray-600 dark:text-gray-400text-xs">{t('payroll.basicSalary')}</p>
                <p className="font-bold text-base text-base text-blue-600text-xs">
                  {payroll.currency_details?.symbol || '$'}{Number(payroll.basic_salary || 0).toFixed(2)} {payroll.currency_details?.code || ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-base text-gray-600 dark:text-gray-400text-xs">{t('payroll.bonus')}</p>
                <p className="font-medium text-green-600text-xs">
                  +{payroll.currency_details?.symbol || '$'}{Number(payroll.bunus || 0).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-base text-gray-600 dark:text-gray-400text-xs">{t('payroll.overtime')}</p>
                <p className="font-medium text-purple-600text-xs">
                  +{payroll.currency_details?.symbol || '$'}{Number(payroll.overtime || 0).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-base text-gray-600 dark:text-gray-400text-xs">{t('payroll.deductions')}</p>
                <p className="font-medium text-red-600text-xs">
                  -{payroll.currency_details?.symbol || '$'}{Number(payroll.deductions || 0).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 col-span-2 p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-base text-gray-600text-xs">{t('payroll.netSalary')}</p>
                <p className="font-bold text-base text-base text-green-600text-xs">
                  {payroll.currency_details?.symbol || '$'}{Number(payroll.net_salary || 0).toFixed(2)} {payroll.currency_details?.code || ''}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-600" />
            {t('payroll.paymentInformation')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-base text-gray-600 dark:text-gray-400text-xs">{t('payroll.period')}</p>
                <p className="font-mediumtext-xs">{monthLabel} {payroll.year}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-base text-gray-600 dark:text-gray-400text-xs">{t('payroll.paymentDate')}</p>
                <div className="space-y-1">
                  {calendarType === 'shamsi' && (
                    <p className="font-medium text-sm">
                      {formatDateByCalendarType(payroll.payment_date, calendarType, lang)}
                    </p>
                  )}
                  {calendarType === 'qamari' && (
                    <p className="font-medium text-sm">
                      {formatDateByCalendarType(payroll.payment_date, calendarType, lang)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollDetails;
