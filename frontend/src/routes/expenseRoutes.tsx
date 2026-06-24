import { Route } from 'react-router-dom';
import ExpenseList from '@/pages/expenses/ExpenseList';
import AddExpense from '@/pages/expenses/AddExpense';
import EditExpense from '@/pages/expenses/EditExpense';
import ExpenseDetails from '@/pages/expenses/ExpenseDetails';
import ExpenseCategoryList from '@/pages/expenses/ExpenseCategoryList';
import AddExpenseCategory from '@/pages/expenses/AddExpenseCategory';
import EditExpenseCategory from '@/pages/expenses/EditExpenseCategory';
import ExpenseReportPage from '@/pages/expenses/ExpenseReportPage';
import { guardRoute } from '@/lib/route-guards';

export const expenseRoutes = (
  <>
    <Route path="expenses" element={guardRoute(<ExpenseList />, { module: 'expenses' })} />
    <Route path="expenses/add" element={guardRoute(<AddExpense />, { module: 'expenses', action: 'create' })} />
    <Route path="expenses/:id" element={guardRoute(<ExpenseDetails />, { module: 'expenses' })} />
    <Route path="expenses/:id/edit" element={guardRoute(<EditExpense />, { module: 'expenses', action: 'edit' })} />
    <Route path="expense-categories" element={guardRoute(<ExpenseCategoryList />, { module: 'expenses' })} />
    <Route path="expense-categories/add" element={guardRoute(<AddExpenseCategory />, { module: 'expenses', action: 'create' })} />
    <Route path="expense-categories/:id/edit" element={guardRoute(<EditExpenseCategory />, { module: 'expenses', action: 'edit' })} />
    <Route path="expense-reports" element={guardRoute(<ExpenseReportPage />, { module: 'expenses' })} />
  </>
);
