export interface Employee {
  id: string;
  full_name?: string;
  employee_id?: string;
  user_details?: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    role?: string;
  };
  company_details?: {
    id: string;
    name: string;
    code?: string;
  };
  position?: string;
  date_joined?: string;
  is_active: boolean;
  address?: string;
  salary: number;
  currency?: string;
  currency_details?: {
    id: string;
    name: string;
    code: string;
    symbol?: string;
  };
  financial_summary?: EmployeeFinancialSummary;
  notes?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeFinancialSummary {
  total_salary: number;
  payroll_paid: number;
  advance_paid: number;
  overall_paid: number;
  remaining_amount: number;
  currency?: { code: string; symbol?: string };
  month?: number;
  year?: number;
}

export interface EmployeeFormData {
  // User fields
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  // Employee fields
  position?: string;
  is_active: boolean;
  address?: string;
  salary: number;
  currency?: string;
  notes?: string;
  confirmPassword: string;
  contract_start_date?: string;
  contract_end_date?: string;
}