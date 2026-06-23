import { Route } from 'react-router-dom';
import ComprehensiveReports from '@/pages/reports/ComprehensiveReports';
import TrialBalanceReport from '@/pages/accounting/TrialBalanceReport';
import IncomeStatementReport from '@/pages/accounting/IncomeStatementReport';
import BalanceSheetReport from '@/pages/accounting/BalanceSheetReport';
import { guardRoute } from '@/lib/route-guards';

export const reportsRoutes = (
  <>
    <Route path="reports" element={guardRoute(<ComprehensiveReports />, { module: 'reports' })} />
    <Route path="reports/trial-balance" element={guardRoute(<TrialBalanceReport />, { permission: 'view_financial_reports' })} />
    <Route path="reports/income-statement" element={guardRoute(<IncomeStatementReport />, { permission: 'view_financial_reports' })} />
    <Route path="reports/balance-sheet" element={guardRoute(<BalanceSheetReport />, { permission: 'view_financial_reports' })} />
  </>
);
