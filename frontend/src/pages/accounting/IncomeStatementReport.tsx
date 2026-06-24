import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { RefreshCw } from 'lucide-react';
import useFetchObject from '@/api/useFetchObject';
import { formatNumber } from '@/lib/formatNumber';
import { cn } from '@/lib/utils';
import { formatDateByCalendarType } from '@/utils/calendar';
import { DatePicker } from '@/components/ui/date-picker-calendar';

const IncomeStatementReport = () => {
  const { t, language } = useLanguage();
  const { calendarType, dateFormat } = useCalendar();
  const todayIso = new Date().toISOString().split('T')[0];
  const monthStartIso = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(monthStartIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, loading, refetch } = useFetchObject({
    queryKey: ['income-statement', startDate, endDate, refreshKey],
    endpoint: `transactions/income_statement/?start_date=${startDate}&end_date=${endDate}&calendar_type=${calendarType}`,
  });

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    refetch();
  }, [refetch]);

  const handleStartDateChange = useCallback((date: string) => {
    setStartDate(date);
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleEndDateChange = useCallback((date: string) => {
    setEndDate(date);
    setRefreshKey(prev => prev + 1);
  }, []);

  const incomeStatement = data as any;
  const byCurrency = incomeStatement?.by_currency || {};
  const reportStartDate = incomeStatement?.start_date || startDate;
  const reportEndDate = incomeStatement?.end_date || endDate;

  const formatReportDate = (value: string) =>
    formatDateByCalendarType(value, calendarType, language as 'fa' | 'ps' | 'en', dateFormat);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t('accounting.incomeStatement')}</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">{t('accounting.startDate')}</Label>
            <DatePicker
              value={startDate}
              onChange={handleStartDateChange}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">{t('accounting.endDate')}</Label>
            <DatePicker
              value={endDate}
              onChange={handleEndDateChange}
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
          if ((!data.income || data.income.length === 0) && (!data.expenses || data.expenses.length === 0)) return null;
          
          return (
            <Card key={currency} className="overflow-hidden">
              <div className="bg-muted px-6 py-3 border-b font-semibold text-lg flex items-center justify-between">
                <span>{currency}</span>
                <span className="text-sm text-muted-foreground" dir="rtl">
                  {formatReportDate(reportStartDate)}
                  {' - '}
                  {formatReportDate(reportEndDate)}
                </span>
              </div>
              
              <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-x">
                  {/* Income */}
                  <div>
                    <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 font-semibold text-green-700 dark:text-green-300 border-b">
                      {t('accounting.income')}
                    </div>
                    <div className="p-4">
                      {data.income && data.income.length > 0 ? (
                        <>
                          {data.income.map((item: any) => (
                            <div key={item.code} className="flex justify-between gap-4 py-2 border-b border-dashed last:border-b-0">
                              <span className="text-gray-700 dark:text-gray-300 min-w-0">{item.name}</span>
                              <span className="font-mono tabular-nums shrink-0">{formatNumber(item.amount)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between py-3 mt-3 border-t-2 border-green-500 font-bold bg-green-50 dark:bg-green-900/20 -mx-4 px-4">
                            <span className="text-green-700 dark:text-green-300">{t('accounting.totalIncome')}</span>
                            <span className="font-mono text-green-700 dark:text-green-300">{formatNumber(data.total_income)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="py-8 text-center text-muted-foreground">{t('accounting.noAccountsFound')}</div>
                      )}
                    </div>
                  </div>

                  {/* Expenses */}
                  <div>
                    <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 font-semibold text-red-700 dark:text-red-300 border-b">
                      {t('accounting.expenses')}
                    </div>
                    <div className="p-4">
                      {data.expenses && data.expenses.length > 0 ? (
                        <>
                          {data.expenses.map((item: any) => (
                            <div
                              key={item.code}
                              className={cn(
                                'flex justify-between gap-4 py-2 border-b border-dashed last:border-b-0',
                                item.is_subtotal && 'pl-4 text-muted-foreground text-sm',
                              )}
                            >
                              <span className="text-gray-700 dark:text-gray-300 min-w-0">{item.name}</span>
                              <span className={cn(
                                'font-mono tabular-nums shrink-0',
                                item.is_subtotal ? 'text-muted-foreground' : 'text-red-600',
                              )}>
                                {formatNumber(item.amount)}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between py-3 mt-3 border-t-2 border-red-500 font-bold bg-red-50 dark:bg-red-900/20 -mx-4 px-4">
                            <span className="text-red-700 dark:text-red-300">{t('accounting.totalExpenses')}</span>
                            <span className="font-mono text-red-700 dark:text-red-300">{formatNumber(data.total_expenses)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="py-8 text-center text-muted-foreground">{t('accounting.noAccountsFound')}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Net Income */}
                <div className={`px-6 py-4 font-bold text-lg flex justify-between items-center border-t-4 ${data.is_profit ? 'bg-green-100 dark:bg-green-900/30 border-green-500' : 'bg-red-100 dark:bg-red-900/30 border-red-500'}`}>
                  <span className={data.is_profit ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
                    {t('accounting.netIncome')}
                  </span>
                  <span className={`font-mono text-xl ${data.is_profit ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    {formatNumber(data.net_income)}
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

export default IncomeStatementReport;
