import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { RefreshCw } from 'lucide-react';
import useFetchObject from '@/api/useFetchObject';
import { formatNumber } from '@/lib/formatNumber';

const TrialBalanceReport = () => {
  const { t } = useLanguage();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  const { data, loading, refetch } = useFetchObject({
    queryKey: ['trial-balance', asOfDate],
    endpoint: `transactions/trial_balance/?as_of_date=${asOfDate}`,
  });

  const handleRefresh = () => {
    refetch();
  };

  const trialBalance = data as any;
  const byCurrency = trialBalance?.by_currency || {};
  const isBalanced = trialBalance?.is_balanced || false;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('accounting.trialBalance')}</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="as-of-date" className="text-sm whitespace-nowrap">{t('accounting.reportDate')}</Label>
            <Input
              id="as-of-date"
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('accounting.trialBalance')}</CardTitle>
            <Badge variant={isBalanced ? 'default' : 'destructive'} className={isBalanced ? 'bg-green-600' : ''}>
              {isBalanced ? t('accounting.balanceSheetBalanced') : t('accounting.balanceSheetNotBalanced')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
          ) : Object.keys(byCurrency).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t('accounting.noAccountsFound')}</div>
          ) : (
            <div className="space-y-8">
              {Object.entries(byCurrency).map(([currency, data]: [string, any]) => {
                if (!data.accounts || data.accounts.length === 0) return null;
                
                return (
                  <div key={currency} className="border rounded-lg overflow-hidden">
                    <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 font-semibold text-lg">
                      {currency}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-slate-50 dark:bg-slate-900">
                            <th className="px-4 py-3 text-left text-sm font-semibold w-32">{t('accounting.accountCode')}</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold min-w-[200px]">{t('accounting.accountName')}</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold w-32 whitespace-nowrap">{t('accounting.accountType')}</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold w-40">{t('accounting.debit')}</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold w-40">{t('accounting.credit')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.accounts.map((account: any) => (
                            <tr key={account.code} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900">
                              <td className="px-4 py-3 font-mono text-sm">{account.code}</td>
                              <td className="px-4 py-3 font-medium">{account.name}</td>
                              <td className="px-4 py-3 text-center">
                                <Badge variant="outline" className="text-xs">{account.type}</Badge>
                              </td>
                              <td className="px-4 py-3 text-right font-mono tabular-nums">
                                {account.debit > 0 ? formatNumber(account.debit) : '-'}
                              </td>
                              <td className="px-4 py-3 text-right font-mono tabular-nums">
                                {account.credit > 0 ? formatNumber(account.credit) : '-'}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                            <td colSpan={3} className="px-4 py-3">{t('accounting.total')} ({currency})</td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums">{formatNumber(data.total_debit)}</td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums">{formatNumber(data.total_credit)}</td>
                          </tr>
                          <tr className="bg-blue-50 dark:bg-blue-900/20 font-semibold">
                            <td colSpan={3} className="px-4 py-3">{t('accounting.balance')}</td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums">
                              {formatNumber(Math.abs(data.total_debit - data.total_credit))}
                            </td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums">
                              {data.total_debit === data.total_credit ? '✓' : ''}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrialBalanceReport;
