import { BaseEntity, Company, Currency } from './common';

export interface Employee extends BaseEntity {
  user: string;
  user_details?: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
  };
  position?: string;
  company: string;
  company_details?: Company;
  date_joined: string;
  contract_start_date?: string;
  contract_end_date?: string;
  is_active: boolean;
  address?: string;
  salary: number;
  notes?: string;
  manager?: string;
}

export interface Advance extends BaseEntity {
  company: string;
  company_details?: Company;
  employee: string;
  employee_details?: {
    id: string;
    fullname: string;
    position: string;
    salary: number;
  };
  amount: number;
  currency: string;
  currency_details?: Currency;
  reason?: string;
  year: number;
  month: number;  // 1-12 for Shamsi months
  payment_date: string;
}

export interface AdvanceFormData {
  employee: string;
  amount: number | string;
  currency: string;
  reason?: string;
  year: number;
  month: number;  // 1-12 for Shamsi months
  payment_date: string;
}