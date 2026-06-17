export interface AccountCategory {
  id: string;
  name: string;
  code: string;
  account_type: string;
  account_type_display?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Account {
  id: string;
  name: string;
  code: string;
  category: string;
  category_name?: string;
  account_type?: string;
  parent?: string;
  parent_name?: string;
  is_active: boolean;
  is_detail: boolean;
  balance: number;
  current_balance?: number;
  total_debit?: number;
  total_credit?: number;
  currency?: string;
  created_at?: string;
  updated_at?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  account: string;
  account_code?: string;
  account_name?: string;
  debit: number;
  credit: number;
  description?: string;
  reference?: string;
  transaction: string;
  transaction_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  number: string;
  date: string;
  description?: string;
  transaction_type: string;
  reference?: string;
  is_posted: boolean;
  posted_at?: string;
  total_debit?: number;
  total_credit?: number;
  is_balanced?: boolean;
  entries?: JournalEntry[];
  created_at?: string;
  updated_at?: string;
}

export interface TransactionFormData {
  date: string;
  description?: string;
  transaction_type: string;
  reference?: string;
  entries: JournalEntryFormData[];
}

export interface JournalEntryFormData {
  account: string;
  debit: number;
  credit: number;
  description?: string;
  reference?: string;
}

export interface FiscalYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TrialBalance {
  date: string;
  accounts: TrialBalanceAccount[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
}

export interface TrialBalanceAccount {
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
}

export interface IncomeStatement {
  start_date: string;
  end_date: string;
  income: IncomeItem[];
  total_income: number;
  expenses: ExpenseItem[];
  total_expenses: number;
  net_income: number;
  is_profit: boolean;
}

export interface IncomeItem {
  code: string;
  name: string;
  amount: number;
}

export interface ExpenseItem {
  code: string;
  name: string;
  amount: number;
}

export interface BalanceSheet {
  date: string;
  assets: BalanceSheetItem[];
  total_assets: number;
  liabilities: BalanceSheetItem[];
  total_liabilities: number;
  equity: BalanceSheetItem[];
  total_equity: number;
  total_liabilities_and_equity: number;
  is_balanced: boolean;
}

export interface BalanceSheetItem {
  code: string;
  name: string;
  amount: number;
}
