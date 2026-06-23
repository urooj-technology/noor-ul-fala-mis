import { Route } from 'react-router-dom';
import OtherIncomeList from '@/pages/other-income/OtherIncomeList';
import AddOtherIncome from '@/pages/other-income/AddOtherIncome';
import EditOtherIncome from '@/pages/other-income/EditOtherIncome';
import IncomeCategoryList from '@/pages/other-income/IncomeCategoryList';
import AddIncomeCategory from '@/pages/other-income/AddIncomeCategory';
import EditIncomeCategory from '@/pages/other-income/EditIncomeCategory';
import { guardRoute } from '@/lib/route-guards';

export const otherIncomeRoutes = (
  <>
    <Route path="other-incomes" element={guardRoute(<OtherIncomeList />, { module: 'other_income' })} />
    <Route path="other-incomes/add" element={guardRoute(<AddOtherIncome />, { module: 'other_income', action: 'create' })} />
    <Route path="other-incomes/:id/edit" element={guardRoute(<EditOtherIncome />, { module: 'other_income', action: 'edit' })} />

    <Route path="income-categories" element={guardRoute(<IncomeCategoryList />, { module: 'other_income' })} />
    <Route path="income-categories/add" element={guardRoute(<AddIncomeCategory />, { module: 'other_income', action: 'create' })} />
    <Route path="income-categories/:id/edit" element={guardRoute(<EditIncomeCategory />, { module: 'other_income', action: 'edit' })} />
  </>
);
