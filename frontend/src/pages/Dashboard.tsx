import { useState } from 'react';
import { LayoutDashboard } from 'lucide-react';
import useFetchObjects from '@/api/useFetchObjects';
import { useLanguage } from '@/contexts/LanguageContext';
import { FinancialMetricCards } from '@/components/reports/FinancialMetricCards';
import { FinancialBreakdownTables } from '@/components/reports/FinancialBreakdownTables';
import { ReportPeriodFilter } from '@/components/reports/ReportPeriodFilter';
import { ReportDateRangeBadge } from '@/components/reports/ReportDateRangeBadge';
import { ReportPageHeader, ReportEmptyState, FinancialSummaryBar } from '@/components/reports/ReportPageLayout';
import { FinancialReport, ReportPeriod } from '@/types/financial-report';

const emptyAmounts = { AFN: 0, USD: 0 };

export const Dashboard = () => {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const params: Record<string, string> = { period };
  if (period === 'custom') {
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
  }

  const canFetch = period !== 'custom' || Boolean(startDate && endDate);

  const { data: report, isLoading, refetch } = useFetchObjects<FinancialReport>({
    queryKey: ['financial-report', period, startDate, endDate],
    endpoint: 'reports/financial/',
    params,
    enabled: canFetch,
  });

  const handlePeriodChange = (next: ReportPeriod) => {
    setPeriod(next);
    if (next !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  const income = report?.income?.total || emptyAmounts;
  const expenses = report?.expenses?.total || emptyAmounts;
  const profit = report?.profit || emptyAmounts;
  const netCash = report?.net_cash_position || emptyAmounts;

  const incomeRows = [
    { label: t('reports.studentPaymentsIncome'), values: report?.income?.student || emptyAmounts, color: 'text-green-600' },
    { label: t('reports.rentalIncome'), values: report?.income?.rental || emptyAmounts, color: 'text-green-600' },
    { label: t('reports.otherIncome'), values: report?.income?.other || emptyAmounts, color: 'text-green-600' },
    { label: t('reports.totalIncome'), values: income, color: 'text-green-700', isTotal: true },
  ];

  const outflowRows = [
    { label: t('reports.payrollExpenses'), values: report?.expenses?.payroll || emptyAmounts, color: 'text-red-600' },
    { label: t('reports.generalExpenses'), values: report?.expenses?.general || emptyAmounts, color: 'text-red-600' },
    { label: t('reports.advances'), values: report?.expenses?.advances || emptyAmounts, color: 'text-orange-600' },
    {
      label: t('reports.totalOutflows'),
      values: expenses,
      color: 'text-red-700',
      isTotal: true,
    },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <ReportPageHeader
        icon={LayoutDashboard}
        title={t('reports.financialDashboard')}
        subtitle={t('reports.comprehensiveFinancialOverview')}
        actions={
          <ReportPeriodFilter
            period={period}
            startDate={startDate}
            endDate={endDate}
            onPeriodChange={handlePeriodChange}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onRefresh={() => refetch()}
            loading={isLoading}
          />
        }
      />

      {report?.date_range && (
        <ReportDateRangeBadge dateRange={report.date_range} period={period} />
      )}

      {!canFetch ? (
        <ReportEmptyState message={t('reports.selectCustomDateRange')} />
      ) : isLoading ? (
        <ReportEmptyState message={t('reports.loadingReport')} />
      ) : !report ? (
        <ReportEmptyState message={t('reports.noData')} />
      ) : (
        <div className="space-y-6">
          <FinancialMetricCards
            income={income}
            expenses={expenses}
            netCash={netCash}
          />

          <FinancialBreakdownTables incomeRows={incomeRows} outflowRows={outflowRows} />

          <FinancialSummaryBar
            profitLabel={t('reports.netProfit')}
            profitAfn={profit.AFN}
            profitUsd={profit.USD}
            netCashLabel={t('reports.netCashPosition')}
            netCashAfn={netCash.AFN}
            netCashUsd={netCash.USD}
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
