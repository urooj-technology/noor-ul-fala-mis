import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { RefreshCw } from 'lucide-react';
import useFetchObject from '@/api/useFetchObject';
import { formatNumber } from '@/lib/formatNumber';
import { DatePicker } from '@/components/ui/date-picker-calendar';

const BalanceSheetReport = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, loading, refetch } = useFetchObject({
    queryKey: ['balance-sheet', asOfDate, refreshKey],
    endpoint: `transactions/balance_sheet/?as_of_date=${asOfDate}&calendar_type=${calendarType}`,
  });

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    refetch();
  }, [refetch]);

  const handleDateChange = useCallback((date: string) => {
    setAsOfDate(date);
    setRefreshKey(prev => prev + 1);
  }, []);

  const balanceSheet = data as any;
  const byCurrency = balanceSheet?.by_currency || {};

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t('accounting.balanceSheet')}</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">{t('accounting.reportDate')}</Label>
            <DatePicker
              value={asOfDate}
              onChange={handleDateChange}
            />
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
      ) : Object.keys(byCurrency).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">{t('accounting.noAccountsFound')}</div>
      ) : (
        Object.entries(byCurrency).map(([currency, data]: [string, any]) => {
          if ((!data.assets || data.assets.length === 0) && 
              (!data.liabilities || data.liabilities.length === 0) && 
              (!data.equity || data.equity.length === 0)) return null;
          
          const isBalanced = Math.abs(data.total_assets - data.total_liabilities_and_equity) < 0.01;

          return (
            <Card key={currency} className="overflow-hidden">
              {/* Header */}
              <div className="bg-muted px-6 py-3 border-b font-semibold text-lg flex items-center justify-between">
                <span>{currency}</span>
                <Badge variant={isBalanced ? 'default' : 'destructive'} className={isBalanced ? 'bg-green-600' : ''}>
                  {isBalanced ? '✓ Balanced' : 'Not Balanced'}
                </Badge>
              </div>
              
              <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-x">
                  {/* Assets */}
                  <div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 font-semibold text-blue-700 dark:text-blue-300 border-b">
                      {t('accounting.assets')}
                    </div>
                    <div className="p-4">
                      {data.assets && data.assets.length > 0 ? (
                        <>
                          {data.assets.map((item: any) => (
                            <div key={item.code} className="flex justify-between py-2 border-b border-dashed last:border-b-0">
                              <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                              <span className="font-mono">{formatNumber(item.amount)}</span>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="py-4 text-center text-muted-foreground">{t('accounting.noAccountsFound')}</div>
                      )}
                      <div className="flex justify-between py-3 mt-3 border-t-2 border-blue-500 font-bold bg-blue-50 dark:bg-blue-900/20 -mx-4 px-4">
                        <span className="text-blue-700 dark:text-blue-300">{t('accounting.totalAssets')}</span>
                        <span className="font-mono text-blue-700 dark:text-blue-300">{formatNumber(data.total_assets)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Liabilities & Equity */}
                  <div>
                    {/* Liabilities */}
                    <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 font-semibold text-red-700 dark:text-red-300 border-b">
                      {t('accounting.liabilities')}
                    </div>
                    <div className="p-4">
                      {data.liabilities && data.liabilities.length > 0 ? (
                        <>
                          {data.liabilities.map((item: any) => (
                            <div key={item.code} className="flex justify-between py-2 border-b border-dashed last:border-b-0">
                              <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                              <span className="font-mono">{formatNumber(item.amount)}</span>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="py-4 text-center text-muted-foreground">{t('accounting.noAccountsFound')}</div>
                      )}
                      <div className="flex justify-between py-2 border-t-2 border-red-500 font-bold bg-red-50 dark:bg-red-900/20 -mx-4 px-4">
                        <span className="text-red-700 dark:text-red-300">{t('accounting.totalLiabilities')}</span>
                        <span className="font-mono text-red-700 dark:text-red-300">{formatNumber(data.total_liabilities)}</span>
                      </div>
                    </div>

                    {/* Equity */}
                    <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 font-semibold text-green-700 dark:text-green-300 border-b border-t">
                      {t('accounting.equity')}
                    </div>
                    <div className="p-4">
                      {data.equity && data.equity.length > 0 ? (
                        <>
                          {data.equity.map((item: any) => (
                            <div key={item.code} className="flex justify-between py-2 border-b border-dashed last:border-b-0">
                              <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                              <span className="font-mono">{formatNumber(item.amount)}</span>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="py-4 text-center text-muted-foreground">{t('accounting.noAccountsFound')}</div>
                      )}
                      <div className="flex justify-between py-2 border-t-2 border-green-500 font-bold bg-green-50 dark:bg-green-900/20 -mx-4 px-4">
                        <span className="text-green-700 dark:text-green-300">{t('accounting.totalEquity')}</span>
                        <span className="font-mono text-green-700 dark:text-green-300">{formatNumber(data.total_equity)}</span>
                      </div>
                    </div>

                    {/* Total Liabilities & Equity */}
                    <div className="bg-muted px-4 py-3 font-bold flex justify-between border-t-2">
                      <span>{t('accounting.totalLiabilitiesAndEquity')}</span>
                      <span className="font-mono">{formatNumber(data.total_liabilities_and_equity)}</span>
                    </div>
                  </div>
                </div>

                {/* Balance Check */}
                <div className={`px-6 py-3 font-semibold flex justify-between items-center border-t-4 ${isBalanced ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-200'}`}>
                  <span>{t('accounting.balance')}</span>
                  <span>
                    {isBalanced 
                      ? '✓ ' + t('accounting.balanceSheetBalanced') 
                      : `${t('accounting.difference')}: ${formatNumber(Math.abs(data.total_assets - data.total_liabilities_and_equity))}`}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default BalanceSheetReport;
