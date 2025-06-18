/**
 * Default Chart of Accounts structure for the ERP system
 * This ensures all required accounts exist for automatic journal entry creation
 */

import { AccountType } from '@/lib/types/shared-enums'

export interface DefaultAccount {
  code: string
  name: string
  type: AccountType
  parentCode?: string
  isSystemAccount?: boolean
  description?: string
}

// Account code mapping for system operations
export const ACCOUNT_CODES = {
  // Assets
  CASH_ON_HAND: '1100',
  BANK_ACCOUNT: '1110',
  ACCOUNTS_RECEIVABLE: '1200',
  INVENTORY: '1300',
  PREPAID_EXPENSES: '1400',
  
  // Liabilities
  ACCOUNTS_PAYABLE: '2100',
  SALES_TAX_PAYABLE: '2200',
  ACCRUED_EXPENSES: '2300',
  
  // Equity
  SHARE_CAPITAL: '3100',
  RETAINED_EARNINGS: '3200',
  
  // Income
  SALES_REVENUE: '4100',
  SERVICE_REVENUE: '4200',
  SALES_DISCOUNTS: '4300',
  OTHER_INCOME: '4900',
  
  // Cost of Sales
  COST_OF_GOODS_SOLD: '5100',
  INVENTORY_ADJUSTMENTS: '5200',
  
  // Operating Expenses
  SALARIES_EXPENSE: '6100',
  RENT_EXPENSE: '6200',
  UTILITIES_EXPENSE: '6300',
  OFFICE_SUPPLIES: '6400',
  DEPRECIATION_EXPENSE: '6500',
  BANK_CHARGES: '6600',
  GENERAL_EXPENSE: '6900',
} as const

export const DEFAULT_CHART_OF_ACCOUNTS: DefaultAccount[] = [
  // Assets (1000s)
  { code: '1000', name: 'Assets', type: AccountType.ASSET },
  
  // Current Assets
  { code: '1100', name: 'Cash on Hand', type: AccountType.ASSET, parentCode: '1000', isSystemAccount: true, description: 'Physical cash in registers and safes' },
  { code: '1110', name: 'Bank Accounts', type: AccountType.ASSET, parentCode: '1000', isSystemAccount: true, description: 'All bank and financial institution accounts' },
  { code: '1200', name: 'Accounts Receivable', type: AccountType.ASSET, parentCode: '1000', isSystemAccount: true, description: 'Customer invoices pending payment' },
  { code: '1300', name: 'Inventory', type: AccountType.ASSET, parentCode: '1000', isSystemAccount: true, description: 'Products and materials in stock' },
  { code: '1400', name: 'Prepaid Expenses', type: AccountType.ASSET, parentCode: '1000', description: 'Expenses paid in advance' },
  
  // Fixed Assets
  { code: '1500', name: 'Fixed Assets', type: AccountType.ASSET, parentCode: '1000' },
  { code: '1510', name: 'Equipment', type: AccountType.ASSET, parentCode: '1500', description: 'Office and operational equipment' },
  { code: '1520', name: 'Vehicles', type: AccountType.ASSET, parentCode: '1500', description: 'Company vehicles' },
  { code: '1590', name: 'Accumulated Depreciation', type: AccountType.ASSET, parentCode: '1500', description: 'Total depreciation on fixed assets' },

  // Liabilities (2000s)
  { code: '2000', name: 'Liabilities', type: AccountType.LIABILITY },
  
  // Current Liabilities
  { code: '2100', name: 'Accounts Payable', type: AccountType.LIABILITY, parentCode: '2000', isSystemAccount: true, description: 'Supplier invoices pending payment' },
  { code: '2200', name: 'Sales Tax Payable', type: AccountType.LIABILITY, parentCode: '2000', isSystemAccount: true, description: 'Sales tax collected pending remittance' },
  { code: '2300', name: 'Accrued Expenses', type: AccountType.LIABILITY, parentCode: '2000', description: 'Expenses incurred but not yet paid' },
  { code: '2400', name: 'Salaries Payable', type: AccountType.LIABILITY, parentCode: '2000', description: 'Employee salaries pending payment' },
  
  // Long-term Liabilities
  { code: '2500', name: 'Long-term Liabilities', type: AccountType.LIABILITY, parentCode: '2000' },
  { code: '2510', name: 'Bank Loans', type: AccountType.LIABILITY, parentCode: '2500', description: 'Long-term bank loans' },

  // Equity (3000s)
  { code: '3000', name: 'Equity', type: AccountType.EQUITY },
  { code: '3100', name: 'Share Capital', type: AccountType.EQUITY, parentCode: '3000', isSystemAccount: true, description: 'Initial and additional capital contributions' },
  { code: '3200', name: 'Retained Earnings', type: AccountType.EQUITY, parentCode: '3000', isSystemAccount: true, description: 'Accumulated profits and losses' },
  { code: '3300', name: 'Current Year Earnings', type: AccountType.EQUITY, parentCode: '3000', description: 'Current year profit or loss' },

  // Revenue (4000s)
  { code: '4000', name: 'Revenue', type: AccountType.INCOME },
  { code: '4100', name: 'Sales Revenue', type: AccountType.INCOME, parentCode: '4000', isSystemAccount: true, description: 'Revenue from product sales' },
  { code: '4200', name: 'Service Revenue', type: AccountType.INCOME, parentCode: '4000', isSystemAccount: true, description: 'Revenue from services' },
  { code: '4300', name: 'Sales Discounts', type: AccountType.INCOME, parentCode: '4000', description: 'Discounts given to customers' },
  { code: '4900', name: 'Other Income', type: AccountType.INCOME, parentCode: '4000', description: 'Miscellaneous income' },

  // Cost of Sales (5000s)
  { code: '5000', name: 'Cost of Sales', type: AccountType.EXPENSE },
  { code: '5100', name: 'Cost of Goods Sold', type: AccountType.EXPENSE, parentCode: '5000', isSystemAccount: true, description: 'Direct cost of products sold' },
  { code: '5200', name: 'Inventory Adjustments', type: AccountType.EXPENSE, parentCode: '5000', isSystemAccount: true, description: 'Inventory write-offs and adjustments' },

  // Operating Expenses (6000s)
  { code: '6000', name: 'Operating Expenses', type: AccountType.EXPENSE },
  { code: '6100', name: 'Salaries and Wages', type: AccountType.EXPENSE, parentCode: '6000', description: 'Employee compensation' },
  { code: '6200', name: 'Rent Expense', type: AccountType.EXPENSE, parentCode: '6000', description: 'Office and warehouse rent' },
  { code: '6300', name: 'Utilities Expense', type: AccountType.EXPENSE, parentCode: '6000', description: 'Electricity, water, internet, etc.' },
  { code: '6400', name: 'Office Supplies', type: AccountType.EXPENSE, parentCode: '6000', description: 'Stationery and office materials' },
  { code: '6500', name: 'Depreciation Expense', type: AccountType.EXPENSE, parentCode: '6000', description: 'Asset depreciation' },
  { code: '6600', name: 'Bank Charges', type: AccountType.EXPENSE, parentCode: '6000', description: 'Bank fees and charges' },
  { code: '6900', name: 'General Expenses', type: AccountType.EXPENSE, parentCode: '6000', isSystemAccount: true, description: 'Miscellaneous operating expenses' },
]

// Account configuration for different transaction types
export const TRANSACTION_ACCOUNTS = {
  // Sales Invoice
  SALES_INVOICE: {
    receivable: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
    revenue: ACCOUNT_CODES.SALES_REVENUE,
    tax: ACCOUNT_CODES.SALES_TAX_PAYABLE,
    discount: ACCOUNT_CODES.SALES_DISCOUNTS,
  },
  
  // Customer Payment
  CUSTOMER_PAYMENT: {
    cash: ACCOUNT_CODES.CASH_ON_HAND,
    bank: ACCOUNT_CODES.BANK_ACCOUNT,
    receivable: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
  },
  
  // Supplier Invoice
  SUPPLIER_INVOICE: {
    payable: ACCOUNT_CODES.ACCOUNTS_PAYABLE,
    expense: ACCOUNT_CODES.GENERAL_EXPENSE,
  },
  
  // Supplier Payment
  SUPPLIER_PAYMENT: {
    payable: ACCOUNT_CODES.ACCOUNTS_PAYABLE,
    bank: ACCOUNT_CODES.BANK_ACCOUNT,
  },
  
  // Inventory
  INVENTORY: {
    asset: ACCOUNT_CODES.INVENTORY,
    cogs: ACCOUNT_CODES.COST_OF_GOODS_SOLD,
    adjustment: ACCOUNT_CODES.INVENTORY_ADJUSTMENTS,
  },
  
  // Expenses
  EXPENSE: {
    general: ACCOUNT_CODES.GENERAL_EXPENSE,
    payable: ACCOUNT_CODES.ACCRUED_EXPENSES,
    cash: ACCOUNT_CODES.CASH_ON_HAND,
    bank: ACCOUNT_CODES.BANK_ACCOUNT,
  },
}