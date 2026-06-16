import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart3, DollarSign, TrendingUp, TrendingDown, PieChart, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumber } from '@/lib/formatNumber';
import useFetchObjects from '@/api/useFetchObjects';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  BarChart, Bar, LineChart, Line, PieChart as RechartsPieChart, Cell, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#3b82f6', '#eab308'];

export const Dashboard = () => {
  const { t } = useLanguage();
  const [period, setPeriod] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customRange, setCustomRange] = useState<'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'custom'>('this_month');

  const getParams = () => {
    const filters: any = { period: period || 'monthly' };
    if (period === 'custom') {
      if (startDate) filters.start_date = startDate;
      if (endDate) filters.end_date = endDate;
    }
    return filters;
  };

  const { data: report, isLoading } = useFetchObjects<any>({
    queryKey: ['financial-report', period, startDate, endDate, customRange],
    endpoint: 'reports/financial/',
    params: getParams()
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto"></div>
          <h3 className="text-lg font-semibold">{t('reports.loadingReport')}</h3>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <h3 className="text-lg font-semibold mb-2">{t('reports.noData')}</h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Extract data - now from accounting system
  const incomeAFN = report.income?.total?.AFN || 0;
  const incomeUSD = report.income?.total?.USD || 0;
  const studentIncomeAFN = report.income?.student_payments?.AFN || 0;
  const studentIncomeUSD = report.income?.student_payments?.USD || 0;
  const rentalIncomeAFN = report.income?.rental_income?.AFN || 0;
  const rentalIncomeUSD = report.income?.rental_income?.USD || 0;
  const otherIncomeAFN = report.income?.other_income?.AFN || 0;
  const otherIncomeUSD = report.income?.other_income?.USD || 0;
  const expenseAFN = report.expenses?.total?.AFN || 0;
  const expenseUSD = report.expenses?.total?.USD || 0;
  const profitAFN = report.profit?.AFN || 0;
  const profitUSD = report.profit?.USD || 0;

  // Expense breakdown data - from accounting system
  const generalExpensesAFN = report.expenses?.breakdown?.general_expenses?.AFN || 0;
  const generalExpensesUSD = report.expenses?.breakdown?.general_expenses?.USD || 0;
  const payrollAFN = report.expenses?.breakdown?.payroll?.AFN || 0;
  const payrollUSD = report.expenses?.breakdown?.payroll?.USD || 0;
  const advancesAFN = report.expenses?.breakdown?.advances?.AFN || 0;
  const advancesUSD = report.expenses?.breakdown?.advances?.USD || 0;

  // Chart data
  const currencyComparisonData = [
    { name: 'AFN', income: incomeAFN, expense: expenseAFN, profit: profitAFN },
    { name: 'USD', income: incomeUSD, expense: expenseUSD, profit: profitUSD }
  ];

  const incomeBreakdownData = [
    { name: t('reports.studentPaymentsIncome'), value: studentIncomeAFN + studentIncomeUSD, AFN: studentIncomeAFN, USD: studentIncomeUSD },
    { name: t('reports.rentalIncome'), value: rentalIncomeAFN + rentalIncomeUSD, AFN: rentalIncomeAFN, USD: rentalIncomeUSD },
    { name: t('reports.otherIncome'), value: otherIncomeAFN + otherIncomeUSD, AFN: otherIncomeAFN, USD: otherIncomeUSD }
  ].filter(item => item.value > 0);

  const expenseBreakdown = [
    { name: t('reports.generalExpenses'), AFN: generalExpensesAFN, USD: generalExpensesUSD },
    { name: t('reports.payroll'), AFN: payrollAFN, USD: payrollUSD },
    { name: t('reports.advances'), AFN: advancesAFN, USD: advancesUSD }
  ].filter(item => item.AFN > 0 || item.USD > 0);

  // Aggregate expense by category from expense_breakdown - combine AFN and USD for same category
  const expenseByCategoryRaw = (report.expense_breakdown || []).reduce((acc: any[], item: any) => {
    const existing = acc.find(e => e.name === item.name);
    if (existing) {
      if (item.currency === 'AFN') existing.AFN = Number(item.amount) || 0;
      else existing.USD = Number(item.amount) || 0;
      existing.value = (existing.AFN || 0) + (existing.USD || 0);
    } else {
      acc.push({
        name: item.name,
        AFN: item.currency === 'AFN' ? (Number(item.amount) || 0) : 0,
        USD: item.currency === 'USD' ? (Number(item.amount) || 0) : 0,
        value: Number(item.amount) || 0
      });
    }
    return acc;
  }, []);

  // Filter to only show categories with non-zero values
  const expenseByCategory = expenseByCategoryRaw.filter(item => item.value > 0);

  const financialOverviewData = [
    { name: t('reports.studentPaymentsIncome'), AFN: studentIncomeAFN, USD: studentIncomeUSD },
    { name: t('reports.rentalIncome'), AFN: rentalIncomeAFN, USD: rentalIncomeUSD },
    { name: t('reports.otherIncome'), AFN: otherIncomeAFN, USD: otherIncomeUSD },
    { name: t('reports.expenses'), AFN: expenseAFN, USD: expenseUSD },
    { name: t('reports.profit'), AFN: profitAFN, USD: profitUSD }
  ];

  // Helper to set date range
  const setDateRange = (range: typeof customRange) => {
    setCustomRange(range);
    const today = new Date();
    
    if (range === 'today') {
      setStartDate(today.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (range === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      setStartDate(yesterday.toISOString().split('T')[0]);
      setEndDate(yesterday.toISOString().split('T')[0]);
    } else if (range === 'this_week') {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      setStartDate(weekStart.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (range === 'last_week') {
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
      setStartDate(lastWeekStart.toISOString().split('T')[0]);
      setEndDate(lastWeekEnd.toISOString().split('T')[0]);
    } else if (range === 'this_month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(monthStart.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (range === 'last_month') {
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(lastMonthStart.toISOString().split('T')[0]);
      setEndDate(lastMonthEnd.toISOString().split('T')[0]);
    } else if (range === 'this_year') {
      const yearStart = new Date(today.getFullYear(), 0, 1);
      setStartDate(yearStart.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Header */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  {t('reports.financialDashboard')}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  {t('reports.comprehensiveFinancialOverview')}
                </p>
              </div>

              {/* Period Selector - Clean and Professional */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Quick Period Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={customRange === 'today' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateRange('today')}
                    className="h-9 text-xs"
                  >
                    {t('reports.today')}
                  </Button>
                  <Button
                    variant={customRange === 'this_week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateRange('this_week')}
                    className="h-9 text-xs"
                  >
                    {t('reports.thisWeek')}
                  </Button>
                  <Button
                    variant={customRange === 'this_month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateRange('this_month')}
                    className="h-9 text-xs"
                  >
                    {t('reports.thisMonth')}
                  </Button>
                  <Button
                    variant={customRange === 'this_year' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateRange('this_year')}
                    className="h-9 text-xs"
                  >
                    {t('reports.thisYear')}
                  </Button>
                </div>

                {/* Custom Date Range */}
                {customRange === 'custom' && (
                  <div className="flex gap-2 items-center">
                    <Input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-9 text-sm"
                    />
                    <span className="text-sm text-slate-500">-</span>
                    <Input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Income */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t('reports.totalIncome')}
              </CardTitle>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatNumber(incomeAFN)} <span className="text-sm font-normal text-slate-500">AFN</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {formatNumber(incomeUSD)} USD
              </div>
            </CardContent>
          </Card>

          {/* Total Expenses */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t('reports.expenses')}
              </CardTitle>
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatNumber(expenseAFN)} <span className="text-sm font-normal text-slate-500">AFN</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {formatNumber(expenseUSD)} USD
              </div>
            </CardContent>
          </Card>

          {/* Profit */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t('reports.profit')}
              </CardTitle>
              <div className={`p-2 rounded-lg ${profitAFN >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                {profitAFN >= 0 
                  ? <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" /> 
                  : <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                }
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${profitAFN >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatNumber(profitAFN)} <span className="text-sm font-normal">AFN</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {formatNumber(profitUSD)} USD
              </div>
            </CardContent>
          </Card>

          {/* Income Breakdown Summary */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t('reports.incomeBreakdown')}
              </CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <PieChart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Student:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(studentIncomeAFN)} AFN</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Rental:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(rentalIncomeAFN)} AFN</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Other:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatNumber(otherIncomeAFN)} AFN</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 1. Income vs Expenses vs Profit by Currency - Bar Chart */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                {t('reports.byCurrency')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div dir="ltr" className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currencyComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis 
                      tickFormatter={(value) => formatNumber(value)} 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        borderRadius: '8px', 
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                      }}
                      formatter={(value) => formatNumber(Number(value))}
                    />
                    <Legend wrapperStyle={{ fontSize: '14px' }} />
                    <Bar dataKey="income" fill="#10b981" name={t('reports.totalIncome')} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="#ef4444" name={t('reports.expenses')} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" fill="#8b5cf6" name={t('reports.profit')} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 2. Financial Overview - Line Chart */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                {t('reports.financialOverview')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div dir="ltr" className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={financialOverviewData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => formatNumber(value)} 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        borderRadius: '8px', 
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                      }}
                      formatter={(value) => formatNumber(Number(value))}
                    />
                    <Legend wrapperStyle={{ fontSize: '14px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="AFN" 
                      stroke="#f59e0b" 
                      name="AFN" 
                      strokeWidth={3} 
                      dot={{ r: 6, strokeWidth: 2 }}
                      activeDot={{ r: 8 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="USD" 
                      stroke="#8b5cf6" 
                      name="USD" 
                      strokeWidth={3} 
                      dot={{ r: 6, strokeWidth: 2 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 3. Income Breakdown - Donut Chart */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                {t('reports.incomeBreakdown')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div dir="ltr" className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={incomeBreakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {incomeBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        borderRadius: '8px', 
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                      }}
                      formatter={(value) => formatNumber(Number(value))}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      wrapperStyle={{ fontSize: '13px' }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 4. Expense Breakdown by Type - Bar Chart */}
          {expenseBreakdown.length > 0 && (
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t('reports.expenseBreakdown')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div dir="ltr" className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expenseBreakdown} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis 
                        type="number" 
                        tickFormatter={(value) => formatNumber(value)} 
                        axisLine={false} 
                        tickLine={false}
                      />
                      <YAxis dataKey="name" axisLine={false} tickLine={false} width={100} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          borderRadius: '8px', 
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                        }}
                        formatter={(value) => formatNumber(Number(value))}
                      />
                      <Legend wrapperStyle={{ fontSize: '14px' }} />
                      <Bar dataKey="AFN" fill="#f59e0b" name="AFN" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="USD" fill="#8b5cf6" name="USD" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 5. Expense by Category - Radar Chart */}
          {expenseByCategory.length > 0 && (
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t('reports.expenseByCategory')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div dir="ltr" className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={expenseByCategory}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} />
                      <Radar
                        name="Expenses"
                        dataKey="value"
                        stroke="#ef4444"
                        strokeWidth={3}
                        fill="#ef4444"
                        fillOpacity={0.6}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          borderRadius: '8px', 
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                        }}
                        formatter={(value) => formatNumber(Number(value))}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
