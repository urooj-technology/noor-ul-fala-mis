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
import { guardRoute } from '@/lib/route-guards';

export const accountingRoutes = (
  <>
    <Route path="accounts" element={guardRoute(<AccountList />, { module: 'accounting' })} />
    <Route path="accounts/add" element={guardRoute(<AddAccount />, { module: 'accounting', action: 'create' })} />
    <Route path="accounts/:id" element={guardRoute(<AccountDetails />, { module: 'accounting' })} />
    <Route path="accounts/:id/edit" element={guardRoute(<EditAccount />, { module: 'accounting', action: 'edit' })} />

    <Route path="transactions" element={guardRoute(<TransactionList />, { module: 'accounting' })} />
    <Route path="transactions/:id" element={guardRoute(<TransactionDetails />, { module: 'accounting' })} />

    <Route path="fiscal-years" element={guardRoute(<FiscalYearList />, { module: 'accounting' })} />
    <Route path="fiscal-years/add" element={guardRoute(<AddFiscalYear />, { module: 'accounting', action: 'create' })} />
    <Route path="fiscal-years/:id" element={guardRoute(<FiscalYearDetails />, { module: 'accounting' })} />
    <Route path="fiscal-years/:id/edit" element={guardRoute(<EditFiscalYear />, { module: 'accounting', action: 'edit' })} />

    <Route path="journal-entries" element={guardRoute(<JournalEntryList />, { module: 'accounting' })} />
    <Route path="journal-entries/add" element={guardRoute(<AddJournalEntry />, { permission: 'create_journal_entries' })} />
    <Route path="journal-entries/:id" element={guardRoute(<JournalEntryDetails />, { module: 'accounting' })} />
    <Route path="journal-entries/:id/edit" element={guardRoute(<EditJournalEntry />, { permission: 'edit_journal_entries' })} />
  </>
);
