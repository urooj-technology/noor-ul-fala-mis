import { Route } from 'react-router-dom';
import AccountList from '@/pages/accounting/AccountList';
import AddAccount from '@/pages/accounting/AddAccount';
import EditAccount from '@/pages/accounting/EditAccount';
import AccountDetails from '@/pages/accounting/AccountDetails';
import TransactionList from '@/pages/accounting/TransactionList';
import TransactionDetails from '@/pages/accounting/TransactionDetails';
import FiscalYearList from '@/pages/accounting/FiscalYearList';
import AddFiscalYear from '@/pages/accounting/AddFiscalYear';
import EditFiscalYear from '@/pages/accounting/EditFiscalYear';
import FiscalYearDetails from '@/pages/accounting/FiscalYearDetails';
import JournalEntryList from '@/pages/accounting/JournalEntryList';
import AddJournalEntry from '@/pages/accounting/AddJournalEntry';
import EditJournalEntry from '@/pages/accounting/EditJournalEntry';
import JournalEntryDetails from '@/pages/accounting/JournalEntryDetails';

export const accountingRoutes = (
  <>
    {/* Accounts */}
    <Route path="accounts" element={<AccountList />} />
    <Route path="accounts/add" element={<AddAccount />} />
    <Route path="accounts/:id" element={<AccountDetails />} />
    <Route path="accounts/:id/edit" element={<EditAccount />} />
    
    {/* Transactions - Read Only (auto-generated from other modules) */}
    <Route path="transactions" element={<TransactionList />} />
    <Route path="transactions/:id" element={<TransactionDetails />} />
    
    {/* Fiscal Years */}
    <Route path="fiscal-years" element={<FiscalYearList />} />
    <Route path="fiscal-years/add" element={<AddFiscalYear />} />
    <Route path="fiscal-years/:id" element={<FiscalYearDetails />} />
    <Route path="fiscal-years/:id/edit" element={<EditFiscalYear />} />
    
    {/* Journal Entries */}
    <Route path="journal-entries" element={<JournalEntryList />} />
    <Route path="journal-entries/add" element={<AddJournalEntry />} />
    <Route path="journal-entries/:id" element={<JournalEntryDetails />} />
    <Route path="journal-entries/:id/edit" element={<EditJournalEntry />} />
  </>
);
