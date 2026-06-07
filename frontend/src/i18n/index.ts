import { coreEn } from "./languages/core/en";
import { corePs } from "./languages/core/ps";
import { coreFa } from "./languages/core/fa";
import { commonFa } from "./languages/common/fa";
import { commonEn } from "./languages/common/en";
import { commonPs } from "./languages/common/ps";

import { customersEn } from "./languages/customer/en";
import { customerPs } from "./languages/customer/ps";
import { customerFa } from "./languages/customer/fa";
import { employeeEn } from "./languages/employees/en";
import { employeePs } from "./languages/employees/ps";
import { employeeFa } from "./languages/employees/fa";

import { payrollEn } from "./languages/payroll/en";
import { payrollFa } from "./languages/payroll/fa";
import { payrollPs } from "./languages/payroll/ps";
import { expensesEn } from "./languages/expenses/en";
import { expensesFa } from "./languages/expenses/fa";
import { expensesPs } from "./languages/expenses/ps";

import { settingsEn } from "./languages/settings/en";
import { settingsPs } from "./languages/settings/ps";
import { settingsFa } from "./languages/settings/fa";

import { userEn } from "./languages/user/en";
import { userPs } from "./languages/user/ps";
import { userFa } from "./languages/user/fa";

import { advanceEn } from "./languages/advance/en";
import { advancePs } from "./languages/advance/ps";
import { advanceFa } from "./languages/advance/fa";

import { apiEn } from "./languages/api/en";
import { apiFa } from "./languages/api/fa";
import { apiPs } from "./languages/api/ps";
import { activityLogsEn } from "./languages/activityLogs/en";
import { activityLogsFa } from "./languages/activityLogs/fa";
import { activityLogsPs } from "./languages/activityLogs/ps";

import { studentsEn } from "./languages/students/en";
import { studentsFa } from "./languages/students/fa";
import { studentsPs } from "./languages/students/ps";

import { studentPaymentsEn } from "./languages/student-payments/en";
import { studentPaymentsFa } from "./languages/student-payments/fa";
import { studentPaymentsPs } from "./languages/student-payments/ps";

import { shopRentalEn } from "./languages/shop-rental/en";
import { shopRentalFa } from "./languages/shop-rental/fa";
import { shopRentalPs } from "./languages/shop-rental/ps";

import { otherIncomeEn } from "./languages/other-income/en";
import { otherIncomeFa } from "./languages/other-income/fa";
import { otherIncomePs } from "./languages/other-income/ps";

import { accountingEn } from "./languages/accounting/en";
import { accountingFa } from "./languages/accounting/fa";
import { accountingPs } from "./languages/accounting/ps";

import { reportsEn } from "./languages/reports/en";
import { reportsFa } from "./languages/reports/fa";
import { reportsPs } from "./languages/reports/ps";


export type Language = "en" | "ps" | "fa";

// Base translation interface
export interface CoreTranslations {
  common: {
    save: string;
    cancel: string;
    delete: string;
    // ... other common translations
  };
  // ... other core translations
}

export interface CustomerTranslations {
  customer: {
    title: string;
    name: string;
    phone: string;
    // ... other customer-specific translations
  };
}

export interface ReportsTranslations {
  reports: {
    financialDashboard: string;
    comprehensiveFinancialOverview: string;
    today: string;
    thisWeek: string;
    thisMonth: string;
    thisYear: string;
    totalIncome: string;
    expenses: string;
    profit: string;
    incomeBreakdown: string;
    byCurrency: string;
    financialOverview: string;
    expenseBreakdown: string;
    expenseByCategory: string;
    studentPaymentsIncome: string;
    rentalIncome: string;
    otherIncome: string;
    generalExpenses: string;
    payroll: string;
    payrollExpenses: string;
    advances: string;
    advanceExpenses: string;
    loadingReport: string;
    noData: string;
    comprehensiveReports: string;
    refresh: string;
    summary: string;
    financial: string;
    studentPayments: string;
    payroll: string;
    rental: string;
    trialBalance: string;
    incomeStatement: string;
    balanceSheet: string;
    daily: string;
    weekly: string;
    monthly: string;
    yearly: string;
    custom: string;
    startDate: string;
    endDate: string;
    loading: string;
    totalExpenses: string;
    netProfit: string;
    netLoss: string;
    incomeSummary: string;
    expenseSummary: string;
    category: string;
    afn: string;
    usd: string;
    status: string;
    currency: string;
    count: string;
    total: string;
    debit: string;
    credit: string;
    accountCode: string;
    accountName: string;
    balance: string;
    notBalanced: string;
    balanced: string;
    grandTotal: string;
    totalAssets: string;
    totalLiabilities: string;
    totalEquity: string;
    totalLiabilitiesAndEquity: string;
    assets: string;
    liabilities: string;
    equity: string;
    netIncome: string;
    employee: string;
    shopNumber: string;
    shopName: string;
    monthlyRent: string;
    activeRentals: string;
    expiringSoon: string;
    paymentCount: string;
    noDataFound: string;
    period: string;
    reportType: string;
    export: string;
    students: string;
  };
}

// Combined translation type
export type Translations = CoreTranslations & ReportsTranslations & {
  [module: string]: any; // Allow module-specific translations
};

// Build language objects from module imports
const en = {
  common: commonEn,
  customers: customersEn,
  settings: settingsEn,
  expenses: expensesEn,
  advance: advanceEn,
  payroll: payrollEn,
  core: coreEn,
  employees: employeeEn,
  user: userEn,
  api: apiEn,
  activityLogs: activityLogsEn,
  students: studentsEn,
  studentPayments: studentPaymentsEn,
  shopRental: shopRentalEn,
  otherIncome: otherIncomeEn,
  accounting: accountingEn,
  reports: reportsEn,
};

const fa = {
  common: commonFa,
  customers: customerFa,
  settings: settingsFa,
  expenses: expensesFa,
  advance: advanceFa,
  payroll: payrollFa,
  core: coreFa,
  employees: employeeFa,
  user: userFa,
  api: apiFa,
  activityLogs: activityLogsFa,
  students: studentsFa,
  studentPayments: studentPaymentsFa,
  shopRental: shopRentalFa,
  otherIncome: otherIncomeFa,
  accounting: accountingFa,
  reports: reportsFa,
};

const ps = {
  common: commonPs,
  customers: customerPs,
  settings: settingsPs,
  expenses: expensesPs,
  advance: advancePs,
  payroll: payrollPs,
  core: corePs,
  employees: employeePs,
  user: userPs,
  api: apiPs,
  activityLogs: activityLogsPs,
  students: studentsPs,
  studentPayments: studentPaymentsPs,
  shopRental: shopRentalPs,
  otherIncome: otherIncomePs,
  accounting: accountingPs,
  reports: reportsPs,
};

export const languages = {
  en,
  fa,
  ps,
};

export const languageNames = {
  en: "English",
  ps: "پښتو",
  fa: "دری",
};

export const defaultLanguage: Language = "en";
export const LANGUAGE_STORAGE_KEY = "erp-language";

export const getCurrentLanguage = (): Language => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return (stored as Language) || defaultLanguage;
  }
  return defaultLanguage;
};

export const saveLanguage = (language: Language): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }
};

export const getTranslations = (language: Language): Translations => {
  return languages[language] || languages[defaultLanguage];
};

export const getLanguageDirection = (language: Language): "ltr" | "rtl" => {
  return language === "ps" || language === "fa" ? "rtl" : "ltr";
};

// Helper type for module translations
export type ModuleTranslations<T> = {
  [key in Language]: T;
};
