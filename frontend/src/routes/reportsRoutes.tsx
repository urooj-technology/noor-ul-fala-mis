import { Route } from 'react-router-dom';
import ComprehensiveReports from '@/pages/reports/ComprehensiveReports';
import TrialBalanceReport from '@/pages/accounting/TrialBalanceReport';
import IncomeStatementReport from '@/pages/accounting/IncomeStatementReport';
import BalanceSheetReport from '@/pages/accounting/BalanceSheetReport';

export const reportsRoutes = (
  <>
    <Route path="reports" element={<ComprehensiveReports />} />
    <Route path="reports/trial-balance" element={<TrialBalanceReport />} />
    <Route path="reports/income-statement" element={<IncomeStatementReport />} />
    <Route path="reports/balance-sheet" element={<BalanceSheetReport />} />
  </>
);