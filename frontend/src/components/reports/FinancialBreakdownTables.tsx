import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber } from '@/lib/formatNumber';
import { CurrencyAmounts } from '@/types/financial-report';
import { cn } from '@/lib/utils';

interface Row {
  label: string;
  values: CurrencyAmounts;
  color?: string;
  isTotal?: boolean;
}

interface FinancialBreakdownTablesProps {
  incomeRows: Row[];
  outflowRows: Row[];
}

function BreakdownTable({ title, rows }: { title: string; rows: Row[] }) {
  const { t } = useLanguage();

  return (
    <Card className="rounded-2xl shadow-sm border overflow-hidden">
      <CardHeader className="bg-muted/30 pb-4 border-b">
        <CardTitle className="text-lg md:text-xl font-semibold tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-sm font-semibold h-11">{t('reports.category')}</TableHead>
              <TableHead className="text-sm font-semibold text-right h-11">{t('reports.afn')}</TableHead>
              <TableHead className="text-sm font-semibold text-right h-11">{t('reports.usd')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.label}
                className={cn(row.isTotal && 'bg-muted/40 font-semibold')}
              >
                <TableCell className="text-sm md:text-base py-3">{row.label}</TableCell>
                <TableCell className={cn('text-right text-sm md:text-base font-medium tabular-nums py-3', row.color)}>
                  {formatNumber(row.values.AFN)}
                </TableCell>
                <TableCell className={cn('text-right text-sm md:text-base font-medium tabular-nums py-3', row.color)}>
                  {formatNumber(row.values.USD)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function FinancialBreakdownTables({ incomeRows, outflowRows }: FinancialBreakdownTablesProps) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
      <BreakdownTable title={t('reports.incomeSummary')} rows={incomeRows} />
      <BreakdownTable title={t('reports.outflowsSummary')} rows={outflowRows} />
    </div>
  );
}
