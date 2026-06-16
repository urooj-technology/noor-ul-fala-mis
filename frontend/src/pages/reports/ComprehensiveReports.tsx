import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { RefreshCw } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker-calendar';
import useFetchObject from '@/api/useFetchObject';
import { formatNumber } from '@/lib/formatNumber';
import {
  BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

type ReportType = 'summary' | 'financial' | 'student_payments' | 'payroll' | 'rental' | 'trial_balance' | 'income_statement' | 'balance_sheet';

const ComprehensiveReports = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const [activeTab, setActiveTab] = useState<ReportType>('summary');
  const [period, setPeriod] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, loading, refetch } = useFetchObject({
    queryKey: ['comprehensive-report', activeTab, period, startDate, endDate, refreshKey],
    endpoint: `reports/comprehensive/?type=${activeTab}&period=${period}${startDate ? `&start_date=${startDate}` : ''}${endDate ? `&end_date=${endDate}` : ''}&calendar_type=${calendarType}`,
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

  const report = data as any;

  // Summary Report
  const renderSummaryReport = () => {
    if (!report) return null;
    const { income, expenses, profit } = report;
    
    // Chart data - from accounting system
    const incomeComparisonData = [
      { name: t('reports.studentPaymentsIncome'), AFN: income?.student?.AFN || 0, USD: income?.student?.USD || 0 },
      { name: t('reports.rentalIncome'), AFN: income?.rental?.AFN || 0, USD: income?.rental?.USD || 0 },
      { name: t('reports.otherIncome'), AFN: income?.other?.AFN || 0, USD: income?.other?.USD || 0 },
    ];
    
    const expenseComparisonData = [
      { name: t('reports.generalExpenses'), AFN: expenses?.general?.AFN || 0, USD: expenses?.general?.USD || 0 },
      { name: t('reports.payrollExpenses'), AFN: expenses?.payroll?.AFN || 0, USD: expenses?.payroll?.USD || 0 },
      { name: t('reports.advanceExpenses'), AFN: expenses?.advances?.AFN || 0, USD: expenses?.advances?.USD || 0 },
    ];
    
    const profitData = [
      { name: 'AFN', profit: profit?.AFN || 0 },
      { name: 'USD', profit: profit?.USD || 0 }
    ];
    
    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-4">
              <h3 className="text-sm font-medium text-muted-foreground">{t('reports.totalIncome')}</h3>
              <div className="mt-2 space-y-1">
                <div className="text-xl font-bold text-green-600">{formatNumber(income?.total?.AFN || 0)} AFN</div>
                <div className="text-lg text-green-500">{formatNumber(income?.total?.USD || 0)} USD</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-4">
              <h3 className="text-sm font-medium text-muted-foreground">{t('reports.totalExpenses')}</h3>
              <div className="mt-2 space-y-1">
                <div className="text-xl font-bold text-red-600">{formatNumber(expenses?.total?.AFN || 0)} AFN</div>
                <div className="text-lg text-red-500">{formatNumber(expenses?.total?.USD || 0)} USD</div>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-l-4 ${(profit?.AFN || 0) >= 0 ? 'border-l-purple-500' : 'border-l-red-500'}`}>
            <CardContent className="pt-4">
              <h3 className="text-sm font-medium text-muted-foreground">{(profit?.AFN || 0) >= 0 ? t('reports.netProfit') : t('reports.netLoss')}</h3>
              <div className="mt-2 space-y-1">
                <div className={`text-xl font-bold ${(profit?.AFN || 0) >= 0 ? 'text-purple-600' : 'text-red-600'}`}>{formatNumber(profit?.AFN || 0)} AFN</div>
                <div className={`text-lg ${(profit?.USD || 0) >= 0 ? 'text-purple-500' : 'text-red-500'}`}>{formatNumber(profit?.USD || 0)} USD</div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">{t('reports.incomeSummary')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div dir="ltr">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={incomeComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatNumber(value)} />
                    <Tooltip formatter={(value) => formatNumber(Number(value))} />
                    <Legend />
                    <Bar dataKey="AFN" fill="#10b981" />
                    <Bar dataKey="USD" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Expense Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">{t('reports.expenseSummary')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div dir="ltr">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={expenseComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatNumber(value)} />
                    <Tooltip formatter={(value) => formatNumber(Number(value))} />
                    <Legend />
                    <Bar dataKey="AFN" fill="#ef4444" />
                    <Bar dataKey="USD" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Profit Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">{t('reports.netProfit')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={profitData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatNumber(value)} />
                  <Tooltip formatter={(value) => formatNumber(Number(value))} />
                  <Bar dataKey="profit" fill="#8b5cf6" name={t('reports.profit')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Income Table */}
        <div>
          <h3 className="text-lg font-semibold mb-3">{t('reports.incomeSummary')}</h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('reports.category')}</TableHead>
                  <TableHead className="text-right">{t('reports.afn')}</TableHead>
                  <TableHead className="text-right">{t('reports.usd')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>{t('reports.studentPaymentsIncome')}</TableCell>
                  <TableCell className="text-right">{formatNumber(income?.student?.AFN || 0)}</TableCell>
                  <TableCell className="text-right">{formatNumber(income?.student?.USD || 0)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('reports.rentalIncome')}</TableCell>
                  <TableCell className="text-right">{formatNumber(income?.rental?.AFN || 0)}</TableCell>
                  <TableCell className="text-right">{formatNumber(income?.rental?.USD || 0)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('reports.otherIncome')}</TableCell>
                  <TableCell className="text-right">{formatNumber(income?.other?.AFN || 0)}</TableCell>
                  <TableCell className="text-right">{formatNumber(income?.other?.USD || 0)}</TableCell>
                </TableRow>
                <TableRow className="font-bold bg-muted">
                  <TableCell>{t('reports.totalIncome')}</TableCell>
                  <TableCell className="text-right">{formatNumber(income?.total?.AFN || 0)}</TableCell>
                  <TableCell className="text-right">{formatNumber(income?.total?.USD || 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Expenses Table */}
        <div>
          <h3 className="text-lg font-semibold mb-3">{t('reports.expenseSummary')}</h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('reports.category')}</TableHead>
                  <TableHead className="text-right">{t('reports.afn')}</TableHead>
                  <TableHead className="text-right">{t('reports.usd')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>{t('reports.generalExpenses')}</TableCell>
                  <TableCell className="text-right">{formatNumber(expenses?.general?.AFN || 0)}</TableCell>
                  <TableCell className="text-right">{formatNumber(expenses?.general?.USD || 0)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('reports.payrollExpenses')}</TableCell>
                  <TableCell className="text-right">{formatNumber(expenses?.payroll?.AFN || 0)}</TableCell>
                  <TableCell className="text-right">{formatNumber(expenses?.payroll?.USD || 0)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('reports.advanceExpenses')}</TableCell>
                  <TableCell className="text-right">{formatNumber(expenses?.advances?.AFN || 0)}</TableCell>
                  <TableCell className="text-right">{formatNumber(expenses?.advances?.USD || 0)}</TableCell>
                </TableRow>
                <TableRow className="font-bold bg-muted">
                  <TableCell>{t('reports.totalExpenses')}</TableCell>
                  <TableCell className="text-right">{formatNumber(expenses?.total?.AFN || 0)}</TableCell>
                  <TableCell className="text-right">{formatNumber(expenses?.total?.USD || 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Profit/Loss Section */}
        <div className={`p-4 rounded-md ${(profit?.AFN || 0) >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <div className="flex justify-between items-center">
            <span className="font-bold">{(profit?.AFN || 0) >= 0 ? t('reports.netProfit') : t('reports.netLoss')}</span>
            <div className="text-right">
              <div className="text-2xl font-bold">{formatNumber(profit?.AFN || 0)} {t('reports.afn')}</div>
              <div className="text-lg">{formatNumber(profit?.USD || 0)} {t('reports.usd')}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Trial Balance Report
  const renderTrialBalance = () => {
    if (!report) return null;
    const { by_currency, grand_total_debit, grand_total_credit, is_balanced } = report;

    return (
      <div className="space-y-6">
        {/* Balance Status */}
        <div className={`p-4 rounded-md ${is_balanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <span className="font-bold">
            {is_balanced ? t('reports.balanced') : t('reports.notBalanced')}
          </span>
          <span className="ml-4">
            {t('reports.total')}: {formatNumber(grand_total_debit)} / {formatNumber(grand_total_credit)}
          </span>
        </div>

        {Object.entries(by_currency || {}).map(([currency, currencyData]: [string, any]) => (
          <div key={currency} className={`rounded-lg border p-4 ${currency === 'USD' ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              {t('reports.trialBalance')} - {currency}
            </h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reports.accountCode')}</TableHead>
                    <TableHead>{t('reports.accountName')}</TableHead>
                    <TableHead className="text-right">{t('reports.debit')}</TableHead>
                    <TableHead className="text-right">{t('reports.credit')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(currencyData.accounts || []).map((account: any) => (
                    <TableRow key={account.code} className={currency === 'USD' ? 'bg-amber-50/50' : ''}>
                      <TableCell className="font-medium">{account.code}</TableCell>
                      <TableCell>{account.name}</TableCell>
                      <TableCell className="text-right">{formatNumber(account.debit)}</TableCell>
                      <TableCell className="text-right">{formatNumber(account.credit)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted">
                    <TableCell colSpan={2}>{t('reports.total')} ({currency})</TableCell>
                    <TableCell className="text-right">{formatNumber(currencyData.total_debit)}</TableCell>
                    <TableCell className="text-right">{formatNumber(currencyData.total_credit)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        ))}

        {/* Grand Total */}
        <div className="p-4 rounded-md bg-slate-100 border">
          <div className="flex justify-between items-center font-bold">
            <span>{t('reports.grandTotal')}</span>
            <div className="flex gap-8">
              <span>{t('reports.debit')}: {formatNumber(grand_total_debit)}</span>
              <span>{t('reports.credit')}: {formatNumber(grand_total_credit)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Income Statement Report
  const renderIncomeStatement = () => {
    if (!report) return null;
    const { by_currency, grand_total_income, grand_total_expenses, grand_net_income } = report;

    return (
      <div className="space-y-6">
        {Object.entries(by_currency || {}).map(([currency, currencyData]: [string, any]) => (
          <div key={currency} className={`rounded-lg border p-4 ${currency === 'USD' ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              {t('reports.incomeStatement')} - {currency}
            </h3>
            
            {/* Income */}
            <div className="mb-4">
              <h4 className="font-medium mb-2 text-sm text-muted-foreground">{t('reports.income')}</h4>
              <Table>
                <TableBody>
                  {(currencyData.income || []).map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell>{t('reports.totalIncome')}</TableCell>
                    <TableCell className="text-right">{formatNumber(currencyData.total_income)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Expenses */}
            <div className="mb-4">
              <h4 className="font-medium mb-2 text-sm text-muted-foreground">{t('reports.expenses')}</h4>
              <Table>
                <TableBody>
                  {(currencyData.expenses || []).map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell>{t('reports.totalExpenses')}</TableCell>
                    <TableCell className="text-right">{formatNumber(currencyData.total_expenses)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Net Income */}
            <div className={`p-3 rounded-md ${currencyData.net_income >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <div className="flex justify-between items-center font-bold">
                <span>{t('reports.netIncome')}</span>
                <span className="text-xl">{formatNumber(currencyData.net_income)}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Grand Total */}
        <div className="p-4 rounded-md bg-slate-100 border">
          <h3 className="text-lg font-semibold mb-3">{t('reports.grandTotal')}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">{t('reports.totalIncome')}</div>
              <div className="text-xl font-bold">{formatNumber(grand_total_income)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">{t('reports.totalExpenses')}</div>
              <div className="text-xl font-bold">{formatNumber(grand_total_expenses)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">{t('reports.netIncome')}</div>
              <div className={`text-xl font-bold ${grand_net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatNumber(grand_net_income)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Student Payments Report
  const renderStudentPaymentsReport = () => {
    if (!report) return null;
    const { total, by_status, by_payment_cycle, payment_count } = report;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="text-sm text-muted-foreground">{t('reports.totalAFN', 'Total AFN')}</div>
            <div className="text-2xl font-bold text-green-700">{formatNumber(total?.AFN || 0)}</div>
          </div>
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
            <div className="text-sm text-muted-foreground">{t('reports.totalUSD', 'Total USD')}</div>
            <div className="text-2xl font-bold text-amber-700">{formatNumber(total?.USD || 0)}</div>
          </div>
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="text-sm text-muted-foreground">{t('reports.paymentCount', 'Payment Count')}</div>
            <div className="text-2xl font-bold text-blue-700">{payment_count || 0}</div>
          </div>
        </div>

        {by_status && by_status.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('reports.status', 'Status')}</TableHead>
                  <TableHead>{t('reports.currency', 'Currency')}</TableHead>
                  <TableHead className="text-right">{t('reports.total', 'Total')}</TableHead>
                  <TableHead className="text-right">{t('reports.count', 'Count')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {by_status.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="capitalize">{item.payment_status}</TableCell>
                    <TableCell>{item.currency}</TableCell>
                    <TableCell className="text-right">{formatNumber(item.total)}</TableCell>
                    <TableCell className="text-right">{item.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  // Payroll Report
  const renderPayrollReport = () => {
    if (!report) return null;
    const { payroll, advances } = report;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payroll */}
          <div className="rounded-lg border p-4">
            <h3 className="text-lg font-semibold mb-3">{t('reports.payroll', 'Payroll')}</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-green-50 rounded-md">
                <div className="text-xs text-muted-foreground">AFN</div>
                <div className="text-xl font-bold">{formatNumber(payroll?.total?.AFN || 0)}</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-md">
                <div className="text-xs text-muted-foreground">USD</div>
                <div className="text-xl font-bold">{formatNumber(payroll?.total?.USD || 0)}</div>
              </div>
            </div>
            {payroll?.by_employee && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reports.employee', 'Employee')}</TableHead>
                    <TableHead>{t('reports.currency', 'Currency')}</TableHead>
                    <TableHead className="text-right">{t('reports.total', 'Total')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payroll.by_employee.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{item.employee__full_name}</TableCell>
                      <TableCell>{item.currency}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Advances */}
          <div className="rounded-lg border p-4">
            <h3 className="text-lg font-semibold mb-3">{t('reports.advances', 'Advances')}</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-orange-50 rounded-md">
                <div className="text-xs text-muted-foreground">AFN</div>
                <div className="text-xl font-bold">{formatNumber(advances?.total?.AFN || 0)}</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-md">
                <div className="text-xs text-muted-foreground">USD</div>
                <div className="text-xl font-bold">{formatNumber(advances?.total?.USD || 0)}</div>
              </div>
            </div>
            {advances?.by_employee && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reports.employee', 'Employee')}</TableHead>
                    <TableHead>{t('reports.currency', 'Currency')}</TableHead>
                    <TableHead className="text-right">{t('reports.total', 'Total')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advances.by_employee.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{item.employee__full_name}</TableCell>
                      <TableCell>{item.currency}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Rental Report
  const renderRentalReport = () => {
    if (!report) return null;
    const { total_received, active_rentals, expiring_within_30_days } = report;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="text-sm text-muted-foreground">{t('reports.totalAFN', 'Total AFN')}</div>
            <div className="text-2xl font-bold text-green-700">{formatNumber(total_received?.AFN || 0)}</div>
          </div>
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
            <div className="text-sm text-muted-foreground">{t('reports.totalUSD', 'Total USD')}</div>
            <div className="text-2xl font-bold text-amber-700">{formatNumber(total_received?.USD || 0)}</div>
          </div>
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="text-sm text-muted-foreground">{t('reports.activeRentals', 'Active Rentals')}</div>
            <div className="text-2xl font-bold text-blue-700">{active_rentals || 0}</div>
          </div>
        </div>
        {expiring_within_30_days > 0 && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <div className="text-sm text-muted-foreground">{t('reports.expiringSoon', 'Expiring Soon')}</div>
            <div className="text-2xl font-bold text-red-700">{expiring_within_30_days || 0}</div>
          </div>
        )}
      </div>
    );
  };

  // Balance Sheet Report
  const renderBalanceSheet = () => {
    if (!report) return null;
    const { by_currency, grand_total_assets, grand_total_liabilities, grand_total_equity, 
            grand_total_liabilities_and_equity, is_balanced } = report;

    return (
      <div className="space-y-6">
        {/* Balance Status */}
        <div className={`p-4 rounded-md ${is_balanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <span className="font-bold">
            {is_balanced ? t('reports.balanced') : t('reports.notBalanced')}
          </span>
          <span className="ml-4">
            {t('reports.totalAssets')}: {formatNumber(grand_total_assets)} | 
            {t('reports.totalLiabilitiesAndEquity')}: {formatNumber(grand_total_liabilities_and_equity)}
          </span>
        </div>

        {Object.entries(by_currency || {}).map(([currency, currencyData]: [string, any]) => (
          <div key={currency} className={`rounded-lg border p-4 ${currency === 'USD' ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              {t('reports.balanceSheet')} - {currency}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Assets */}
              <div className="border rounded-lg p-3">
                <h4 className="font-semibold mb-2 text-sm text-muted-foreground">{t('reports.assets')}</h4>
                <Table>
                  <TableBody>
                    {(currencyData.assets || []).map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="py-1">{item.name}</TableCell>
                        <TableCell className="text-right py-1">{formatNumber(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2">
                      <TableCell>{t('reports.totalAssets')}</TableCell>
                      <TableCell className="text-right">{formatNumber(currencyData.total_assets)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Liabilities */}
              <div className="border rounded-lg p-3">
                <h4 className="font-semibold mb-2 text-sm text-muted-foreground">{t('reports.liabilities')}</h4>
                <Table>
                  <TableBody>
                    {(currencyData.liabilities || []).map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="py-1">{item.name}</TableCell>
                        <TableCell className="text-right py-1">{formatNumber(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2">
                      <TableCell>{t('reports.totalLiabilities')}</TableCell>
                      <TableCell className="text-right">{formatNumber(currencyData.total_liabilities)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Equity */}
              <div className="border rounded-lg p-3">
                <h4 className="font-semibold mb-2 text-sm text-muted-foreground">{t('reports.equity')}</h4>
                <Table>
                  <TableBody>
                    {(currencyData.equity || []).map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="py-1">{item.name}</TableCell>
                        <TableCell className="text-right py-1">{formatNumber(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2">
                      <TableCell>{t('reports.totalEquity')}</TableCell>
                      <TableCell className="text-right">{formatNumber(currencyData.total_equity)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Liabilities + Equity */}
            <div className="mt-4 p-3 rounded-md bg-slate-100">
              <div className="flex justify-between items-center font-bold">
                <span>{t('reports.totalLiabilitiesAndEquity')}</span>
                <span>{formatNumber(currencyData.total_liabilities_and_equity)}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Grand Totals */}
        <div className="p-4 rounded-md bg-slate-100 border">
          <h3 className="text-lg font-semibold mb-3">{t('reports.grandTotal')}</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-sm text-muted-foreground">{t('reports.totalAssets')}</div>
              <div className="text-xl font-bold">{formatNumber(grand_total_assets)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('reports.totalLiabilities')}</div>
              <div className="text-xl font-bold">{formatNumber(grand_total_liabilities)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('reports.totalEquity')}</div>
              <div className="text-xl font-bold">{formatNumber(grand_total_equity)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('reports.totalLiabilitiesAndEquity')}</div>
              <div className="text-xl font-bold">{formatNumber(grand_total_liabilities_and_equity)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) return <div className="text-center py-8">{t('reports.loading')}</div>;
    
    switch (activeTab) {
      case 'summary':
        return renderSummaryReport();
      case 'financial':
        return renderSummaryReport(); // Same as summary but with more details
      case 'student_payments':
        return renderStudentPaymentsReport();
      case 'payroll':
        return renderPayrollReport();
      case 'rental':
        return renderRentalReport();
      case 'trial_balance':
        return renderTrialBalance();
      case 'income_statement':
        return renderIncomeStatement();
      case 'balance_sheet':
        return renderBalanceSheet();
      default:
        return renderSummaryReport();
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t('reports.comprehensiveReports')}</h1>
        <Button variant="outline" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('reports.refresh')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportType)}>
                <TabsList className="flex flex-wrap">
                  <TabsTrigger value="summary">{t('reports.summary')}</TabsTrigger>
                  <TabsTrigger value="financial">{t('reports.financial', 'Financial')}</TabsTrigger>
                  <TabsTrigger value="student_payments">{t('reports.studentPayments', 'Students')}</TabsTrigger>
                  <TabsTrigger value="payroll">{t('reports.payroll', 'Payroll')}</TabsTrigger>
                  <TabsTrigger value="rental">{t('reports.rental', 'Rental')}</TabsTrigger>
                  <TabsTrigger value="trial_balance">{t('reports.trialBalance')}</TabsTrigger>
                  <TabsTrigger value="income_statement">{t('reports.incomeStatement')}</TabsTrigger>
                  <TabsTrigger value="balance_sheet">{t('reports.balanceSheet')}</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex items-center gap-2">
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="daily">{t('reports.daily')}</option>
                  <option value="weekly">{t('reports.weekly')}</option>
                  <option value="monthly">{t('reports.monthly')}</option>
                  <option value="yearly">{t('reports.yearly')}</option>
                  <option value="custom">{t('reports.custom')}</option>
                </select>
                
                {period === 'custom' && (
                  <>
                    <DatePicker
                      value={startDate}
                      onChange={handleStartDateChange}
                      placeholder={t('reports.startDate')}
                    />
                    <DatePicker
                      value={endDate}
                      onChange={handleEndDateChange}
                      placeholder={t('reports.endDate')}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default ComprehensiveReports;