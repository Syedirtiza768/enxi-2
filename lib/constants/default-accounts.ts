/**
 * Default Chart of Accounts structure for the ERP system
 * This ensures all required accounts exist for automatic journal entry creation
 */

import { AccountType } from "./account-type";


export interface DefaultAccount {
  code: string
  name: string
  type: string
  parentCode?: string
  isSystemAccount?: boolean
  description?: string
}

// Account code mapping for system operations
export const ACCOUNT_CODES = {
  // Assets
  CASH_ON_HAND: '1000',  // Updated to match actual cash account
  BANK_ACCOUNT: '1110',
  ACCOUNTS_RECEIVABLE: '1100',  // This is actually AR in the system
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
  PERSONNEL_EXPENSES: '6100',
  TECHNICIAN_SALARIES: '6110',
  ADMINISTRATIVE_SALARIES: '6120',
  FACILITY_EXPENSES: '6200',
  WORKSHOP_RENT: '6210',
  UTILITIES: '6300',
  EQUIPMENT_AND_TOOLS: '6400',
  PARTS_AND_MATERIALS: '6500',
  VEHICLE_EXPENSES: '6600',
  PROFESSIONAL_SERVICES: '6700',
  INSURANCE_AND_LICENSES: '6800',
  MARKETING_EXPENSES: '6900',
  ADMINISTRATIVE_EXPENSES: '7000',
  OFFICE_SUPPLIES: '7010',
  BANK_CHARGES: '7030',
  DEPRECIATION_EXPENSE: '7100',
  OTHER_EXPENSES: '7200',
  GENERAL_EXPENSE: '7250',
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
  
  // Personnel Expenses (6100s)
  { code: '6100', name: 'Personnel Expenses', type: AccountType.EXPENSE, parentCode: '6000' },
  { code: '6110', name: 'Technician Salaries', type: AccountType.EXPENSE, parentCode: '6100', description: 'Diesel mechanics and technician wages' },
  { code: '6120', name: 'Administrative Salaries', type: AccountType.EXPENSE, parentCode: '6100', description: 'Office staff and management salaries' },
  { code: '6130', name: 'Overtime Wages', type: AccountType.EXPENSE, parentCode: '6100', description: 'Overtime payments for technical staff' },
  { code: '6140', name: 'Employee Benefits', type: AccountType.EXPENSE, parentCode: '6100', description: 'Health insurance, pension contributions' },
  { code: '6150', name: 'Employee Training', type: AccountType.EXPENSE, parentCode: '6100', description: 'Technical certifications and skill development' },
  { code: '6160', name: 'Worker Compensation Insurance', type: AccountType.EXPENSE, parentCode: '6100', description: 'Workplace injury insurance' },
  
  // Facility Expenses (6200s)
  { code: '6200', name: 'Facility Expenses', type: AccountType.EXPENSE, parentCode: '6000' },
  { code: '6210', name: 'Workshop Rent', type: AccountType.EXPENSE, parentCode: '6200', description: 'Main workshop and service bay rental' },
  { code: '6220', name: 'Storage Facility Rent', type: AccountType.EXPENSE, parentCode: '6200', description: 'Parts warehouse and equipment storage' },
  { code: '6230', name: 'Facility Maintenance', type: AccountType.EXPENSE, parentCode: '6200', description: 'Workshop repairs and upkeep' },
  { code: '6240', name: 'Security Services', type: AccountType.EXPENSE, parentCode: '6200', description: 'Workshop security and monitoring' },
  { code: '6250', name: 'Waste Disposal', type: AccountType.EXPENSE, parentCode: '6200', description: 'Hazardous waste and oil disposal fees' },
  
  // Utilities (6300s)
  { code: '6300', name: 'Utilities', type: AccountType.EXPENSE, parentCode: '6000' },
  { code: '6310', name: 'Electricity - Workshop', type: AccountType.EXPENSE, parentCode: '6300', description: 'High-voltage power for equipment' },
  { code: '6320', name: 'Compressed Air Systems', type: AccountType.EXPENSE, parentCode: '6300', description: 'Compressed air generation and maintenance' },
  { code: '6330', name: 'Water and Sewerage', type: AccountType.EXPENSE, parentCode: '6300', description: 'Industrial water usage and disposal' },
  { code: '6340', name: 'Gas and Welding Gases', type: AccountType.EXPENSE, parentCode: '6300', description: 'Acetylene, oxygen, and other gases' },
  { code: '6350', name: 'Internet and Communications', type: AccountType.EXPENSE, parentCode: '6300', description: 'Internet, phone, and data services' },
  
  // Equipment and Tools (6400s)
  { code: '6400', name: 'Equipment and Tools', type: AccountType.EXPENSE, parentCode: '6000' },
  { code: '6410', name: 'Diagnostic Equipment', type: AccountType.EXPENSE, parentCode: '6400', description: 'Engine analyzers, scan tools, software licenses' },
  { code: '6420', name: 'Hand Tools', type: AccountType.EXPENSE, parentCode: '6400', description: 'Wrenches, sockets, specialty diesel tools' },
  { code: '6430', name: 'Power Tools', type: AccountType.EXPENSE, parentCode: '6400', description: 'Impact guns, grinders, drills' },
  { code: '6440', name: 'Lifting Equipment', type: AccountType.EXPENSE, parentCode: '6400', description: 'Engine hoists, jacks, crane rental' },
  { code: '6450', name: 'Welding Equipment', type: AccountType.EXPENSE, parentCode: '6400', description: 'Welders, torches, welding supplies' },
  { code: '6460', name: 'Tool Calibration', type: AccountType.EXPENSE, parentCode: '6400', description: 'Precision tool calibration services' },
  
  // Parts and Materials (6500s)
  { code: '6500', name: 'Parts and Materials', type: AccountType.EXPENSE, parentCode: '6000' },
  { code: '6510', name: 'Engine Parts - OEM', type: AccountType.EXPENSE, parentCode: '6500', description: 'Original manufacturer parts' },
  { code: '6520', name: 'Engine Parts - Aftermarket', type: AccountType.EXPENSE, parentCode: '6500', description: 'Third-party replacement parts' },
  { code: '6530', name: 'Filters and Fluids', type: AccountType.EXPENSE, parentCode: '6500', description: 'Oil, fuel, air filters, coolants' },
  { code: '6540', name: 'Lubricants and Oils', type: AccountType.EXPENSE, parentCode: '6500', description: 'Engine oils, hydraulic fluids, greases' },
  { code: '6550', name: 'Gaskets and Seals', type: AccountType.EXPENSE, parentCode: '6500', description: 'Engine gaskets, O-rings, seals' },
  { code: '6560', name: 'Hardware and Fasteners', type: AccountType.EXPENSE, parentCode: '6500', description: 'Bolts, nuts, clamps, fittings' },
  { code: '6570', name: 'Shop Supplies', type: AccountType.EXPENSE, parentCode: '6500', description: 'Rags, cleaners, solvents, absorbents' },
  
  // Vehicle and Transportation (6600s)
  { code: '6600', name: 'Vehicle and Transportation', type: AccountType.EXPENSE, parentCode: '6000' },
  { code: '6610', name: 'Service Vehicle Fuel', type: AccountType.EXPENSE, parentCode: '6600', description: 'Fuel for mobile service trucks' },
  { code: '6620', name: 'Vehicle Maintenance', type: AccountType.EXPENSE, parentCode: '6600', description: 'Service vehicle repairs and maintenance' },
  { code: '6630', name: 'Vehicle Insurance', type: AccountType.EXPENSE, parentCode: '6600', description: 'Commercial vehicle insurance' },
  { code: '6640', name: 'Vehicle Registration', type: AccountType.EXPENSE, parentCode: '6600', description: 'License plates and permits' },
  { code: '6650', name: 'Parts Delivery', type: AccountType.EXPENSE, parentCode: '6600', description: 'Expedited parts shipping costs' },
  
  // Professional Services (6700s)
  { code: '6700', name: 'Professional Services', type: AccountType.EXPENSE, parentCode: '6000' },
  { code: '6710', name: 'Technical Consulting', type: AccountType.EXPENSE, parentCode: '6700', description: 'Specialist diesel consultants' },
  { code: '6720', name: 'Legal Services', type: AccountType.EXPENSE, parentCode: '6700', description: 'Contract and compliance legal fees' },
  { code: '6730', name: 'Accounting Services', type: AccountType.EXPENSE, parentCode: '6700', description: 'Bookkeeping and tax preparation' },
  { code: '6740', name: 'Safety Compliance', type: AccountType.EXPENSE, parentCode: '6700', description: 'OSHA and safety consultants' },
  { code: '6750', name: 'Environmental Compliance', type: AccountType.EXPENSE, parentCode: '6700', description: 'EPA compliance and testing' },
  
  // Insurance and Licenses (6800s)
  { code: '6800', name: 'Insurance and Licenses', type: AccountType.EXPENSE, parentCode: '6000' },
  { code: '6810', name: 'General Liability Insurance', type: AccountType.EXPENSE, parentCode: '6800', description: 'Business liability coverage' },
  { code: '6820', name: 'Professional Liability Insurance', type: AccountType.EXPENSE, parentCode: '6800', description: 'Errors and omissions coverage' },
  { code: '6830', name: 'Property Insurance', type: AccountType.EXPENSE, parentCode: '6800', description: 'Workshop and equipment insurance' },
  { code: '6840', name: 'Business Licenses', type: AccountType.EXPENSE, parentCode: '6800', description: 'Operating permits and licenses' },
  { code: '6850', name: 'Certifications', type: AccountType.EXPENSE, parentCode: '6800', description: 'Industry certifications and renewals' },
  
  // Marketing and Sales (6900s)
  { code: '6900', name: 'Marketing and Sales', type: AccountType.EXPENSE, parentCode: '6000' },
  { code: '6910', name: 'Advertising', type: AccountType.EXPENSE, parentCode: '6900', description: 'Online and print advertising' },
  { code: '6920', name: 'Website Maintenance', type: AccountType.EXPENSE, parentCode: '6900', description: 'Website hosting and updates' },
  { code: '6930', name: 'Trade Shows', type: AccountType.EXPENSE, parentCode: '6900', description: 'Industry exhibition costs' },
  { code: '6940', name: 'Customer Entertainment', type: AccountType.EXPENSE, parentCode: '6900', description: 'Client relationship building' },
  { code: '6950', name: 'Promotional Materials', type: AccountType.EXPENSE, parentCode: '6900', description: 'Brochures, business cards, uniforms' },
  
  // Administrative Expenses (7000s)
  { code: '7000', name: 'Administrative Expenses', type: AccountType.EXPENSE, parentCode: '6000' },
  { code: '7010', name: 'Office Supplies', type: AccountType.EXPENSE, parentCode: '7000', description: 'Paper, ink, stationery' },
  { code: '7020', name: 'Computer Software', type: AccountType.EXPENSE, parentCode: '7000', description: 'Office and technical software licenses' },
  { code: '7030', name: 'Bank Charges', type: AccountType.EXPENSE, parentCode: '7000', description: 'Banking fees and charges' },
  { code: '7040', name: 'Credit Card Fees', type: AccountType.EXPENSE, parentCode: '7000', description: 'Merchant service fees' },
  { code: '7050', name: 'Bad Debt Expense', type: AccountType.EXPENSE, parentCode: '7000', description: 'Uncollectible customer accounts' },
  
  // Depreciation and Amortization (7100s)
  { code: '7100', name: 'Depreciation and Amortization', type: AccountType.EXPENSE, parentCode: '6000' },
  { code: '7110', name: 'Equipment Depreciation', type: AccountType.EXPENSE, parentCode: '7100', description: 'Diagnostic equipment depreciation' },
  { code: '7120', name: 'Vehicle Depreciation', type: AccountType.EXPENSE, parentCode: '7100', description: 'Service vehicle depreciation' },
  { code: '7130', name: 'Building Improvements', type: AccountType.EXPENSE, parentCode: '7100', description: 'Workshop improvement amortization' },
  
  // Other Operating Expenses (7200s)
  { code: '7200', name: 'Other Operating Expenses', type: AccountType.EXPENSE, parentCode: '6000' },
  { code: '7210', name: 'Equipment Rental', type: AccountType.EXPENSE, parentCode: '7200', description: 'Specialized equipment rental' },
  { code: '7220', name: 'Subcontractor Services', type: AccountType.EXPENSE, parentCode: '7200', description: 'Outsourced specialized work' },
  { code: '7230', name: 'Warranty Claims', type: AccountType.EXPENSE, parentCode: '7200', description: 'Warranty work costs' },
  { code: '7240', name: 'R&D Expenses', type: AccountType.EXPENSE, parentCode: '7200', description: 'Research and development costs' },
  { code: '7250', name: 'Miscellaneous Expenses', type: AccountType.EXPENSE, parentCode: '7200', isSystemAccount: true, description: 'Other unclassified expenses' },
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