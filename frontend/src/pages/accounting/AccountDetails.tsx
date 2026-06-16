import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import useFetchObject from '@/api/useFetchObject';

const AccountDetails = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();

  const { data, loading, refetch } = useFetchObject({
    queryKey: ['account', id],
    endpoint: `accounts/${id}/`,
  });

  const account = data as any;

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
      asset: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      liability: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      equity: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      income: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      expense: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
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

  if (!account) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">{t('accounting.accountNotFound')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/accounts')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('accounting.accountDetails')}</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{account.name}</CardTitle>
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
                <p className="text-sm opacity-75">{t('accounting.accountCode')}</p>
                <p className="text-lg font-bold">{account.code}</p>
              </div>
              <div>
                <p className="text-sm opacity-75">{t('accounting.accountType')}</p>
                <p className="text-lg font-bold">{getTypeBadge(account.account_type || '')}</p>
              </div>
              <div>
                <p className="text-sm opacity-75">{t('accounting.parentAccount')}</p>
                <p className="text-lg font-bold">{account.parent_name || '-'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm opacity-75">{t('accounting.currentBalance')}</p>
                <p className="text-2xl font-bold">{Number(account.current_balance || account.balance || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm opacity-75">{t('accounting.isActive')}</p>
                <p className="text-lg font-bold">{account.is_active ? t('common.yes') : t('common.no')}</p>
              </div>
              <div>
                <p className="text-sm opacity-75">{t('accounting.isDetail')}</p>
                <p className="text-lg font-bold">{account.is_detail ? t('common.yes') : t('common.no')}</p>
              </div>
              <div>
                <p className="text-sm opacity-75">{t('accounting.currency')}</p>
                <p className="text-lg font-bold">{account.currency || 'AFN'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountDetails;
