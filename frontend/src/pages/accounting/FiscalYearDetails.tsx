import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { formatDateByCalendarType } from '@/utils/calendar';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import useFetchObject from '@/api/useFetchObject';

const FiscalYearDetails = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const lang = t('language.code') as 'fa' | 'ps';
  const navigate = useNavigate();
  const { id } = useParams();

  const { data, loading, refetch } = useFetchObject({
    queryKey: ['fiscal-year', id],
    endpoint: `fiscal-years/${id}/`,
  });

  const fiscalYear = data as any;

  useEffect(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);

  const handleRefresh = () => {
    refetch();
  };

  const getStatusBadge = (isClosed: boolean) => {
    return (
      <Badge variant={isClosed ? 'secondary' : 'default'}>
        {isClosed ? t('accounting.closed') : t('accounting.open')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">{t('common.loading')}</div>
      </div>
    );
  }

  if (!fiscalYear) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">{t('accounting.fiscalYearNotFound')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/fiscal-years')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('accounting.fiscalYearDetails')}</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{fiscalYear.name}</CardTitle>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common.refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm opacity-75">{t('accounting.fiscalYearName')}</p>
                <p className="text-lg font-bold">{fiscalYear.name}</p>
              </div>
              <div>
                <p className="text-sm opacity-75">{t('accounting.fiscalYearStartDate')}</p>
                <p className="text-lg font-bold">
                  {fiscalYear.start_date ? formatDateByCalendarType(fiscalYear.start_date, calendarType, lang) : fiscalYear.start_date}
                </p>
              </div>
              <div>
                <p className="text-sm opacity-75">{t('accounting.fiscalYearEndDate')}</p>
                <p className="text-lg font-bold">
                  {fiscalYear.end_date ? formatDateByCalendarType(fiscalYear.end_date, calendarType, lang) : fiscalYear.end_date}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm opacity-75">{t('accounting.isClosed')}</p>
                <p className="text-lg font-bold">{getStatusBadge(fiscalYear.is_closed)}</p>
              </div>
              <div>
                <p className="text-sm opacity-75">{t('accounting.created')}</p>
                <p className="text-lg font-bold">{fiscalYear.created_at}</p>
              </div>
              <div>
                <p className="text-sm opacity-75">{t('accounting.updated')}</p>
                <p className="text-lg font-bold">{fiscalYear.updated_at}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FiscalYearDetails;
