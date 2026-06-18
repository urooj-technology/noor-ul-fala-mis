import { useState, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileBarChart } from 'lucide-react';
import useFetchObjects from '@/api/useFetchObjects';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { FinancialMetricCards } from '@/components/reports/FinancialMetricCards';
import { FinancialBreakdownTables } from '@/components/reports/FinancialBreakdownTables';
import { ReportPeriodFilter } from '@/components/reports/ReportPeriodFilter';
import { ReportDateRangeBadge } from '@/components/reports/ReportDateRangeBadge';
import { ReportPageHeader, ReportEmptyState } from '@/components/reports/ReportPageLayout';
import { FinancialReport, ReportPeriod, ReportTab } from '@/types/financial-report';
import { formatNumber } from '@/lib/formatNumber';
import { cn } from '@/lib/utils';

const emptyAmounts = { AFN: 0, USD: 0 };

type AccountingView = 'trial_balance' | 'income_statement' | 'balance_sheet';

function StatCard({ label, value, subValue, className }: { label: string; value: string; subValue?: string; className?: string }) {
  return (
    <Card className={cn('rounded-2xl shadow-sm border', className)}>
      <CardContent className="p-5 md:p-6">
        <p className="text-sm md:text-base font-semibold text-muted-foreground mb-2">{label}</p>
        <p className="text-xl md:text-2xl font-bold tabular-nums">{value}</p>
        {subValue && <p className="text-sm text-muted-foreground mt-1">{subValue}</p>}
      </CardContent>
    </Card>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="rounded-2xl shadow-sm border overflow-hidden">
      <CardHeader className="bg-muted/30 border-b pb-4">
        <CardTitle className="text-lg md:text-xl font-semibold tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-5 md:p-6">{children}</CardContent>
    </Card>
  );
}

const ComprehensiveReports = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [accountingView, setAccountingView] = useState<AccountingView>('trial_balance');
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const reportType = activeTab === 'accounting' ? accountingView : activeTab === 'students' ? 'students' : activeTab;

  const params: Record<string, string> = {
    type: reportType,
    period,
    calendar_type: calendarType,
  };
  if (period === 'custom') {
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
  }

  const canFetch = period !== 'custom' || Boolean(startDate && endDate);

  const { data, isLoading, refetch } = useFetchObjects({
    queryKey: ['comprehensive-report', reportType, period, startDate, endDate, calendarType],
    endpoint: 'reports/comprehensive/',
    params,
    enabled: canFetch,
  });

  const report = data as any;

  const handlePeriodChange = (next: ReportPeriod) => {
    setPeriod(next);
    if (next !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  const overviewRows = (overview: FinancialReport) => {
    const income = overview?.income?.total || emptyAmounts;
    const expenses = overview?.expenses?.total || emptyAmounts;
    return { income, expenses };
  };

  const renderOverview = (overview: FinancialReport) => {
    const { income, expenses } = overviewRows(overview);
    return (
      <div className="space-y-6">
        <FinancialMetricCards income={income} expenses={expenses} netCash={overview?.net_cash_position || emptyAmounts} />
        <FinancialBreakdownTables
          incomeRows={[
            { label: t('reports.studentPaymentsIncome'), values: overview?.income?.student || emptyAmounts, color: 'text-green-600' },
            { label: t('reports.rentalIncome'), values: overview?.income?.rental || emptyAmounts, color: 'text-green-600' },
            { label: t('reports.otherIncome'), values: overview?.income?.other || emptyAmounts, color: 'text-green-600' },
            { label: t('reports.totalIncome'), values: income, color: 'text-green-700', isTotal: true },
          ]}
          outflowRows={[
            { label: t('reports.payrollExpenses'), values: overview?.expenses?.payroll || emptyAmounts, color: 'text-red-600' },
            { label: t('reports.generalExpenses'), values: overview?.expenses?.general || emptyAmounts, color: 'text-red-600' },
            { label: t('reports.advances'), values: overview?.expenses?.advances || emptyAmounts, color: 'text-orange-600' },
            {
              label: t('reports.totalOutflows'),
              values: expenses,
              color: 'text-red-700',
              isTotal: true,
            },
          ]}
        />
      </div>
    );
  };

  const renderPayroll = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <SectionCard title={t('reports.payrollExpenses')}>
        <div className="text-2xl md:text-3xl font-bold text-red-600 tabular-nums mb-1">{formatNumber(report?.payroll?.total?.AFN || 0)} AFN</div>
        <div className="text-base text-muted-foreground mb-5">{formatNumber(report?.payroll?.total?.USD || 0)} USD</div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-sm font-semibold">{t('reports.employee')}</TableHead>
              <TableHead className="text-sm font-semibold text-right">{t('reports.total')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(report?.payroll?.by_employee || []).map((row: any, idx: number) => (
              <TableRow key={`payroll-${row.employee}-${idx}`}>
                <TableCell className="text-sm md:text-base">{row.employee}</TableCell>
                <TableCell className="text-right text-sm md:text-base font-medium tabular-nums">{formatNumber(row.amount)} {row.currency}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
      <SectionCard title={t('reports.advances')}>
        <div className="text-2xl md:text-3xl font-bold text-orange-600 tabular-nums mb-1">{formatNumber(report?.advances?.total?.AFN || 0)} AFN</div>
        <div className="text-base text-muted-foreground mb-5">{formatNumber(report?.advances?.total?.USD || 0)} USD</div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-sm font-semibold">{t('reports.employee')}</TableHead>
              <TableHead className="text-sm font-semibold text-right">{t('reports.total')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(report?.advances?.by_employee || []).map((row: any, idx: number) => (
              <TableRow key={`advance-${row.employee}-${idx}`}>
                <TableCell className="text-sm md:text-base">{row.employee}</TableCell>
                <TableCell className="text-right text-sm md:text-base font-medium tabular-nums">{formatNumber(row.amount)} {row.currency}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );

  const renderStudents = () => (
    <SectionCard title={t('reports.studentPayments')}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="AFN" value={formatNumber(report?.total?.AFN || 0)} className="border-green-200/80 bg-green-50/50" />
        <StatCard label="USD" value={formatNumber(report?.total?.USD || 0)} className="border-green-200/80 bg-green-50/50" />
        <StatCard label={t('reports.paymentCount')} value={String(report?.payment_count || 0)} className="bg-muted/30" />
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-sm font-semibold">{t('reports.category')}</TableHead>
            <TableHead className="text-sm font-semibold text-right">{t('reports.afn')}</TableHead>
            <TableHead className="text-sm font-semibold text-right">{t('reports.usd')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {['AFN', 'USD'].flatMap((currency) =>
            (report?.details?.[currency] || []).slice(0, 50).map((row: any, idx: number) => (
              <TableRow key={`${currency}-${idx}`}>
                <TableCell className="text-sm md:text-base">{row.description}</TableCell>
                <TableCell className="text-right text-sm md:text-base tabular-nums">
                  {(row.currency || currency) === 'AFN' ? formatNumber(row.amount) : '-'}
                </TableCell>
                <TableCell className="text-right text-sm md:text-base tabular-nums">
                  {(row.currency || currency) === 'USD' ? formatNumber(row.amount) : '-'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </SectionCard>
  );

  const renderRental = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
      <StatCard label="AFN" value={formatNumber(report?.total_received?.AFN || 0)} className="border-blue-200/80 bg-blue-50/50" />
      <StatCard label="USD" value={formatNumber(report?.total_received?.USD || 0)} className="border-blue-200/80 bg-blue-50/50" />
      <StatCard label={t('reports.activeRentals')} value={String(report?.active_rentals || 0)} />
      <StatCard label={t('reports.expiringSoon')} value={String(report?.expiring_within_30_days || 0)} className="border-orange-200/80 bg-orange-50/50" />
    </div>
  );

  const renderAccountingTabs = () => (
    <Tabs value={accountingView} onValueChange={(v) => setAccountingView(v as AccountingView)}>
      <TabsList className="h-auto flex-wrap gap-1 p-1">
        <TabsTrigger value="trial_balance" className="text-sm md:text-base px-4 py-2">{t('reports.trialBalance')}</TabsTrigger>
        <TabsTrigger value="income_statement" className="text-sm md:text-base px-4 py-2">{t('reports.incomeStatement')}</TabsTrigger>
        <TabsTrigger value="balance_sheet" className="text-sm md:text-base px-4 py-2">{t('reports.balanceSheet')}</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  const renderAccounting = () => {
    if (accountingView === 'trial_balance') {
      const byCurrency = report?.by_currency || {};
      return (
        <div className="space-y-5">
          {renderAccountingTabs()}
          <Badge variant={report?.is_balanced ? 'default' : 'destructive'} className="text-sm px-3 py-1">
            {report?.is_balanced ? t('reports.balanced') : t('reports.notBalanced')}
          </Badge>
          {Object.entries(byCurrency).map(([currency, currData]: [string, any]) => (
            (currData.accounts || []).length > 0 && (
              <SectionCard key={currency} title={currency}>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-sm font-semibold">{t('reports.accountCode')}</TableHead>
                      <TableHead className="text-sm font-semibold">{t('reports.accountName')}</TableHead>
                      <TableHead className="text-sm font-semibold text-right">{t('reports.debit')}</TableHead>
                      <TableHead className="text-sm font-semibold text-right">{t('reports.credit')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(currData.accounts || []).map((acc: any) => (
                      <TableRow key={acc.code}>
                        <TableCell className="text-sm md:text-base font-mono">{acc.code}</TableCell>
                        <TableCell className="text-sm md:text-base">{acc.name}</TableCell>
                        <TableCell className="text-right text-sm md:text-base tabular-nums">{formatNumber(acc.debit)}</TableCell>
                        <TableCell className="text-right text-sm md:text-base tabular-nums">{formatNumber(acc.credit)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>
            )
          ))}
        </div>
      );
    }

    if (accountingView === 'income_statement') {
      const byCurrency = report?.by_currency || {};
      return (
        <div className="space-y-5">
          {renderAccountingTabs()}
          {Object.entries(byCurrency).map(([currency, currData]: [string, any]) => (
            <SectionCard key={currency} title={`${currency} — ${t('reports.netIncome')}: ${formatNumber(currData.net_income || 0)}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-base md:text-lg font-semibold mb-3">{t('reports.income')}</h4>
                  {(currData.income || []).map((item: any) => (
                    <div key={item.code} className="flex justify-between text-sm md:text-base py-2 border-b border-border/50 last:border-0">
                      <span>{item.name}</span>
                      <span className="font-medium tabular-nums">{formatNumber(item.amount)}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="text-base md:text-lg font-semibold mb-3">{t('reports.expenses')}</h4>
                  {(currData.expenses || []).map((item: any) => (
                    <div key={item.code} className="flex justify-between text-sm md:text-base py-2 border-b border-border/50 last:border-0">
                      <span>{item.name}</span>
                      <span className="font-medium tabular-nums">{formatNumber(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      );
    }

    const byCurrency = report?.by_currency || {};
    return (
      <div className="space-y-5">
        {renderAccountingTabs()}
        <Badge variant={report?.is_balanced ? 'default' : 'destructive'} className="text-sm px-3 py-1">
          {report?.is_balanced ? t('reports.balanced') : t('reports.notBalanced')}
        </Badge>
        {Object.entries(byCurrency).map(([currency, currData]: [string, any]) => (
          <SectionCard key={currency} title={currency}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: t('reports.assets'), items: currData.assets || [] },
                { title: t('reports.liabilities'), items: currData.liabilities || [] },
                { title: t('reports.equity'), items: currData.equity || [] },
              ].map((section) => (
                <div key={section.title}>
                  <h4 className="text-base md:text-lg font-semibold mb-3">{section.title}</h4>
                  {section.items.map((i: any) => (
                    <div key={i.code} className="flex justify-between text-sm md:text-base py-2 border-b border-border/50 last:border-0">
                      <span>{i.name}</span>
                      <span className="font-medium tabular-nums">{formatNumber(i.amount)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </SectionCard>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (!canFetch) return <ReportEmptyState message={t('reports.selectCustomDateRange')} />;
    if (isLoading) return <ReportEmptyState message={t('reports.loading')} />;
    if (!report) return <ReportEmptyState message={t('reports.noDataFound')} />;

    switch (activeTab) {
      case 'overview': return renderOverview(report);
      case 'payroll': return renderPayroll();
      case 'students': return renderStudents();
      case 'rental': return renderRental();
      case 'accounting': return renderAccounting();
      default: return null;
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <ReportPageHeader
        icon={FileBarChart}
        title={t('reports.comprehensiveReports')}
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportTab)}>
        <TabsList className="flex flex-wrap h-auto gap-1 p-1.5 rounded-xl bg-muted/40 w-full justify-start">
          <TabsTrigger value="overview" className="text-sm md:text-base px-4 py-2.5 rounded-lg data-[state=active]:shadow-sm">{t('reports.overview')}</TabsTrigger>
          <TabsTrigger value="payroll" className="text-sm md:text-base px-4 py-2.5 rounded-lg data-[state=active]:shadow-sm">{t('reports.payroll')}</TabsTrigger>
          <TabsTrigger value="students" className="text-sm md:text-base px-4 py-2.5 rounded-lg data-[state=active]:shadow-sm">{t('reports.students')}</TabsTrigger>
          <TabsTrigger value="rental" className="text-sm md:text-base px-4 py-2.5 rounded-lg data-[state=active]:shadow-sm">{t('reports.rental')}</TabsTrigger>
          <TabsTrigger value="accounting" className="text-sm md:text-base px-4 py-2.5 rounded-lg data-[state=active]:shadow-sm">{t('reports.accounting')}</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-6">{renderContent()}</TabsContent>
      </Tabs>
    </div>
  );
};

export default ComprehensiveReports;
