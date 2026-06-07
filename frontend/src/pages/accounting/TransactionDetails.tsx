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

const TransactionDetails = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const lang = t('language.code') as 'fa' | 'ps';
  const navigate = useNavigate();
  const { id } = useParams();

  const { data, loading, refetch } = useFetchObject({
    queryKey: ['transaction', id],
    endpoint: `transactions/${id}/`,
  });

  const transaction = data as any;

  useEffect(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);

  const handleRefresh = () => {
    refetch();
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      student_payment: 'bg-blue-100 text-blue-800',
      expense: 'bg-red-100 text-red-800',
      payroll: 'bg-purple-100 text-purple-800',
      advance: 'bg-orange-100 text-orange-800',
      rental_income: 'bg-green-100 text-green-800',
      other_income: 'bg-teal-100 text-teal-800',
      journal: 'bg-gray-100 text-gray-800',
      opening: 'bg-indigo-100 text-indigo-800',
    };
    return (
      <Badge variant={colors[type as keyof typeof colors] ? 'default' : 'secondary'}>
        {t(`accounting.${type}`) || type}
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

  if (!transaction) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">{t('accounting.transactionNotFound')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/transactions')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('accounting.transactionDetails')}</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{transaction.number}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{transaction.date}</Badge>
              {getTypeBadge(transaction.transaction_type || '')}
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('common.refresh')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm opacity-75">{t('accounting.transactionNumber')}</p>
                <p className="text-lg font-bold">{transaction.number}</p>
              </div>
              <div>
                <p className="text-sm opacity-75">{t('accounting.transactionDate')}</p>
                <p className="text-lg font-bold">
                  {transaction.date ? formatDateByCalendarType(transaction.date, calendarType, lang) : transaction.date}
                </p>
              </div>
              <div>
                <p className="text-sm opacity-75">{t('accounting.transactionType')}</p>
                <p className="text-lg font-bold">{getTypeBadge(transaction.transaction_type || '')}</p>
              </div>
              <div>
                <p className="text-sm opacity-75">{t('accounting.isPosted')}</p>
                <p className="text-lg font-bold">{transaction.is_posted ? t('common.yes') : t('common.no')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm opacity-75">{t('accounting.description')}</p>
                <p className="text-lg font-bold">{transaction.description || '-'}</p>
              </div>
              <div>
                <p className="text-sm opacity-75">{t('accounting.transactionReference')}</p>
                <p className="text-lg font-bold">{transaction.reference || '-'}</p>
              </div>
              <div>
                <p className="text-sm opacity-75">{t('accounting.totalDebit')}</p>
                <p className="text-2xl font-bold">{Number(transaction.total_debit || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm opacity-75">{t('accounting.totalCredit')}</p>
                <p className="text-2xl font-bold">{Number(transaction.total_credit || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionDetails;
