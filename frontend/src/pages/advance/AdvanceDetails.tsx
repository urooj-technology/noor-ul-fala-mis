import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { formatDateByCalendarType } from '@/utils/calendar';
import { DollarSign, User, Calendar, FileText, ArrowLeft } from 'lucide-react';
import { ReloadIcon } from '@radix-ui/react-icons';

const AdvanceDetails = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const lang = t('language.code') as 'fa' | 'ps';
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: advance, isLoading } = useFetchObjects<any>({
    queryKey: ['advance', id],
    endpoint: `advances/${id}`,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center">
        <ReloadIcon className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!advance) {
    return (
      <div className="container mx-auto py-6">
        <p>Advance not found</p>
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

  const monthLabel = months.find(m => m.value === advance.month)?.label || advance.month;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/advance')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          <h1 className="text-base font-boldtext-sm">{t('advance.advanceDetails')}</h1>
        </div>
      </div>

      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 rounded-lg p-6 border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <DollarSign className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100text-sm">
                {advance.currency_details?.symbol || '$'}{Number(advance.amount || 0).toFixed(2)}
              </h2>
              <p className="text-base text-gray-600 dark:text-gray-400text-xs">{monthLabel} {advance.year}</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            {t('advance.employeeInformation')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-base text-gray-600 dark:text-gray-400text-xs">{t('advance.employee')}</p>
                <p className="font-semibold text-smtext-xs">
                  {advance.employee_details ? `${advance.employee_details.first_name || ''} ${advance.employee_details.last_name || ''}`.trim() : 'N/A'}
                </p>
              </div>
            </div>
            {advance.employee_details?.position && (
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-base text-gray-600 dark:text-gray-400text-xs">Position</p>
                  <p className="font-mediumtext-xs">{advance.employee_details.position}</p>
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
            {t('advance.advanceInformation')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-base text-gray-600 dark:text-gray-400text-xs">{t('advance.amount')}</p>
                <p className="font-bold text-base text-base text-green-600text-xs">
                  {advance.currency_details?.symbol || '$'}{Number(advance.amount || 0).toFixed(2)} {advance.currency_details?.code || ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-base text-gray-600 dark:text-gray-400text-xs">{t('advance.period')}</p>
                <p className="font-mediumtext-xs">{monthLabel} {advance.year}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-base text-gray-600 dark:text-gray-400text-xs">{t('advance.paymentDate')}</p>
                <p className="font-mediumtext-xs">
                  {advance.payment_date ? formatDateByCalendarType(advance.payment_date, calendarType, lang) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {advance.reason && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              {t('advance.reason')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lgtext-xs">
              {advance.reason}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvanceDetails;
