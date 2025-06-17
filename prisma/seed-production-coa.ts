import { PrismaClient, AccountType } from '../lib/generated/prisma';

const prisma = new PrismaClient();

interface AccountDefinition {
  code: string;
  name: string;
  type: AccountType;
  isSystemAccount?: boolean;
  description?: string;
  children?: AccountDefinition[];
  defaultSettings?: {
    isDefaultForSales?: boolean;
    isDefaultForPurchases?: boolean;
    isDefaultForAR?: boolean;
    isDefaultForAP?: boolean;
    isDefaultForInventory?: boolean;
    isDefaultForCOGS?: boolean;
    isDefaultForSalesTax?: boolean;
    isDefaultForCash?: boolean;
  };
}

const comprehensiveChartOfAccounts: AccountDefinition[] = [
  // 1000-1999: ASSETS
  {
    code: '1000',
    name: 'Assets',
    type: 'ASSET',
    isSystemAccount: true,
    children: [
      // Current Assets
      {
        code: '1100',
        name: 'Current Assets',
        type: 'ASSET',
        children: [
          // Cash and Cash Equivalents
          {
            code: '1110',
            name: 'Cash and Cash Equivalents',
            type: 'ASSET',
            children: [
              {
                code: '1111',
                name: 'Petty Cash',
                type: 'ASSET',
                description: 'Small cash amounts for minor expenses'
              },
              {
                code: '1112',
                name: 'Cash on Hand',
                type: 'ASSET',
                description: 'Physical cash held at business location'
              },
              {
                code: '1113',
                name: 'Cash in Banks - Checking',
                type: 'ASSET',
                isSystemAccount: true,
                description: 'Primary operating bank account',
                defaultSettings: { isDefaultForCash: true }
              },
              {
                code: '1114',
                name: 'Cash in Banks - Savings',
                type: 'ASSET',
                description: 'Savings account for reserves'
              },
              {
                code: '1115',
                name: 'Cash in Transit',
                type: 'ASSET',
                description: 'Deposits not yet cleared'
              }
            ]
          },
          // Accounts Receivable
          {
            code: '1120',
            name: 'Accounts Receivable',
            type: 'ASSET',
            children: [
              {
                code: '1121',
                name: 'Trade Receivables',
                type: 'ASSET',
                isSystemAccount: true,
                description: 'Amounts owed by customers',
                defaultSettings: { isDefaultForAR: true }
              },
              {
                code: '1122',
                name: 'Other Receivables',
                type: 'ASSET',
                description: 'Non-trade receivables'
              },
              {
                code: '1123',
                name: 'Employee Advances',
                type: 'ASSET',
                description: 'Advances to employees'
              },
              {
                code: '1129',
                name: 'Allowance for Doubtful Accounts',
                type: 'ASSET',
                description: 'Reserve for uncollectible accounts (contra-asset)'
              }
            ]
          },
          // Inventory
          {
            code: '1130',
            name: 'Inventory',
            type: 'ASSET',
            children: [
              {
                code: '1131',
                name: 'Raw Materials',
                type: 'ASSET',
                description: 'Raw materials for production'
              },
              {
                code: '1132',
                name: 'Work in Process',
                type: 'ASSET',
                description: 'Partially completed goods'
              },
              {
                code: '1133',
                name: 'Finished Goods',
                type: 'ASSET',
                description: 'Completed products ready for sale'
              },
              {
                code: '1134',
                name: 'Merchandise Inventory',
                type: 'ASSET',
                isSystemAccount: true,
                description: 'Goods held for resale',
                defaultSettings: { isDefaultForInventory: true }
              },
              {
                code: '1139',
                name: 'Inventory Reserve',
                type: 'ASSET',
                description: 'Reserve for obsolete inventory (contra-asset)'
              }
            ]
          },
          // Prepaid Expenses
          {
            code: '1140',
            name: 'Prepaid Expenses',
            type: 'ASSET',
            children: [
              {
                code: '1141',
                name: 'Prepaid Insurance',
                type: 'ASSET',
                description: 'Insurance paid in advance'
              },
              {
                code: '1142',
                name: 'Prepaid Rent',
                type: 'ASSET',
                description: 'Rent paid in advance'
              },
              {
                code: '1143',
                name: 'Prepaid Supplies',
                type: 'ASSET',
                description: 'Office and other supplies'
              },
              {
                code: '1144',
                name: 'Prepaid Taxes',
                type: 'ASSET',
                description: 'Taxes paid in advance'
              }
            ]
          },
          // Other Current Assets
          {
            code: '1150',
            name: 'Other Current Assets',
            type: 'ASSET',
            children: [
              {
                code: '1151',
                name: 'Deposits',
                type: 'ASSET',
                description: 'Security deposits and similar'
              },
              {
                code: '1152',
                name: 'Short-term Investments',
                type: 'ASSET',
                description: 'Investments maturing within one year'
              }
            ]
          }
        ]
      },
      // Fixed Assets
      {
        code: '1200',
        name: 'Fixed Assets',
        type: 'ASSET',
        children: [
          // Property, Plant & Equipment
          {
            code: '1210',
            name: 'Property, Plant & Equipment',
            type: 'ASSET',
            children: [
              {
                code: '1211',
                name: 'Land',
                type: 'ASSET',
                description: 'Land owned by the company'
              },
              {
                code: '1212',
                name: 'Buildings',
                type: 'ASSET',
                description: 'Buildings and structures'
              },
              {
                code: '1213',
                name: 'Machinery & Equipment',
                type: 'ASSET',
                description: 'Production machinery and equipment'
              },
              {
                code: '1214',
                name: 'Furniture & Fixtures',
                type: 'ASSET',
                description: 'Office furniture and fixtures'
              },
              {
                code: '1215',
                name: 'Vehicles',
                type: 'ASSET',
                description: 'Company vehicles'
              },
              {
                code: '1216',
                name: 'Computer Equipment',
                type: 'ASSET',
                description: 'Computers and IT hardware'
              },
              {
                code: '1217',
                name: 'Leasehold Improvements',
                type: 'ASSET',
                description: 'Improvements to leased property'
              }
            ]
          },
          // Accumulated Depreciation
          {
            code: '1250',
            name: 'Accumulated Depreciation',
            type: 'ASSET',
            children: [
              {
                code: '1252',
                name: 'Accum. Dep. - Buildings',
                type: 'ASSET',
                description: 'Accumulated depreciation on buildings (contra-asset)'
              },
              {
                code: '1253',
                name: 'Accum. Dep. - Machinery',
                type: 'ASSET',
                description: 'Accumulated depreciation on machinery (contra-asset)'
              },
              {
                code: '1254',
                name: 'Accum. Dep. - Furniture',
                type: 'ASSET',
                description: 'Accumulated depreciation on furniture (contra-asset)'
              },
              {
                code: '1255',
                name: 'Accum. Dep. - Vehicles',
                type: 'ASSET',
                description: 'Accumulated depreciation on vehicles (contra-asset)'
              },
              {
                code: '1256',
                name: 'Accum. Dep. - Computer Equipment',
                type: 'ASSET',
                description: 'Accumulated depreciation on computers (contra-asset)'
              },
              {
                code: '1257',
                name: 'Accum. Dep. - Leasehold Improvements',
                type: 'ASSET',
                description: 'Accumulated depreciation on leasehold improvements (contra-asset)'
              }
            ]
          }
        ]
      },
      // Intangible Assets
      {
        code: '1300',
        name: 'Intangible Assets',
        type: 'ASSET',
        children: [
          {
            code: '1310',
            name: 'Patents',
            type: 'ASSET',
            description: 'Patent rights'
          },
          {
            code: '1320',
            name: 'Trademarks',
            type: 'ASSET',
            description: 'Trademark rights'
          },
          {
            code: '1330',
            name: 'Goodwill',
            type: 'ASSET',
            description: 'Goodwill from acquisitions'
          },
          {
            code: '1340',
            name: 'Software',
            type: 'ASSET',
            description: 'Purchased software licenses'
          },
          {
            code: '1350',
            name: 'Accumulated Amortization',
            type: 'ASSET',
            description: 'Accumulated amortization on intangibles (contra-asset)'
          }
        ]
      }
    ]
  },

  // 2000-2999: LIABILITIES
  {
    code: '2000',
    name: 'Liabilities',
    type: 'LIABILITY',
    isSystemAccount: true,
    children: [
      // Current Liabilities
      {
        code: '2100',
        name: 'Current Liabilities',
        type: 'LIABILITY',
        children: [
          // Accounts Payable
          {
            code: '2110',
            name: 'Accounts Payable',
            type: 'LIABILITY',
            children: [
              {
                code: '2111',
                name: 'Trade Payables',
                type: 'LIABILITY',
                isSystemAccount: true,
                description: 'Amounts owed to suppliers',
                defaultSettings: { isDefaultForAP: true }
              },
              {
                code: '2112',
                name: 'Other Payables',
                type: 'LIABILITY',
                description: 'Non-trade payables'
              }
            ]
          },
          // Accrued Liabilities
          {
            code: '2120',
            name: 'Accrued Liabilities',
            type: 'LIABILITY',
            children: [
              {
                code: '2121',
                name: 'Accrued Salaries',
                type: 'LIABILITY',
                description: 'Salaries earned but not yet paid'
              },
              {
                code: '2122',
                name: 'Accrued Interest',
                type: 'LIABILITY',
                description: 'Interest accrued but not yet paid'
              },
              {
                code: '2123',
                name: 'Accrued Expenses',
                type: 'LIABILITY',
                description: 'Other accrued expenses'
              },
              {
                code: '2124',
                name: 'Accrued Commissions',
                type: 'LIABILITY',
                description: 'Sales commissions earned but not paid'
              }
            ]
          },
          // Taxes Payable
          {
            code: '2130',
            name: 'Taxes Payable',
            type: 'LIABILITY',
            children: [
              {
                code: '2131',
                name: 'Sales Tax Payable',
                type: 'LIABILITY',
                isSystemAccount: true,
                description: 'Sales tax collected from customers',
                defaultSettings: { isDefaultForSalesTax: true }
              },
              {
                code: '2132',
                name: 'Income Tax Payable',
                type: 'LIABILITY',
                description: 'Corporate income tax payable'
              },
              {
                code: '2133',
                name: 'Payroll Tax Payable',
                type: 'LIABILITY',
                description: 'Employee payroll taxes withheld'
              },
              {
                code: '2134',
                name: 'VAT Payable',
                type: 'LIABILITY',
                description: 'Value Added Tax payable'
              }
            ]
          },
          // Other Current Liabilities
          {
            code: '2140',
            name: 'Other Current Liabilities',
            type: 'LIABILITY',
            children: [
              {
                code: '2141',
                name: 'Unearned Revenue',
                type: 'LIABILITY',
                description: 'Revenue received in advance'
              },
              {
                code: '2142',
                name: 'Customer Deposits',
                type: 'LIABILITY',
                description: 'Deposits from customers'
              },
              {
                code: '2143',
                name: 'Current Portion of Long-term Debt',
                type: 'LIABILITY',
                description: 'Long-term debt due within one year'
              },
              {
                code: '2144',
                name: 'Warranty Liability',
                type: 'LIABILITY',
                description: 'Estimated warranty obligations'
              }
            ]
          }
        ]
      },
      // Long-term Liabilities
      {
        code: '2200',
        name: 'Long-term Liabilities',
        type: 'LIABILITY',
        children: [
          {
            code: '2210',
            name: 'Long-term Debt',
            type: 'LIABILITY',
            description: 'Debt due after one year'
          },
          {
            code: '2220',
            name: 'Bonds Payable',
            type: 'LIABILITY',
            description: 'Corporate bonds issued'
          },
          {
            code: '2230',
            name: 'Mortgage Payable',
            type: 'LIABILITY',
            description: 'Mortgage on property'
          },
          {
            code: '2240',
            name: 'Deferred Tax Liability',
            type: 'LIABILITY',
            description: 'Future tax obligations'
          },
          {
            code: '2250',
            name: 'Other Long-term Liabilities',
            type: 'LIABILITY',
            description: 'Other long-term obligations'
          }
        ]
      }
    ]
  },

  // 3000-3999: EQUITY
  {
    code: '3000',
    name: 'Equity',
    type: 'EQUITY',
    isSystemAccount: true,
    children: [
      // Contributed Capital
      {
        code: '3100',
        name: 'Contributed Capital',
        type: 'EQUITY',
        children: [
          {
            code: '3110',
            name: 'Common Stock',
            type: 'EQUITY',
            description: 'Common stock at par value'
          },
          {
            code: '3120',
            name: 'Preferred Stock',
            type: 'EQUITY',
            description: 'Preferred stock at par value'
          },
          {
            code: '3130',
            name: 'Additional Paid-in Capital',
            type: 'EQUITY',
            description: 'Capital in excess of par value'
          },
          {
            code: '3140',
            name: 'Treasury Stock',
            type: 'EQUITY',
            description: 'Company stock repurchased (contra-equity)'
          }
        ]
      },
      // Retained Earnings
      {
        code: '3200',
        name: 'Retained Earnings',
        type: 'EQUITY',
        children: [
          {
            code: '3210',
            name: 'Retained Earnings',
            type: 'EQUITY',
            isSystemAccount: true,
            description: 'Accumulated profits'
          },
          {
            code: '3220',
            name: 'Current Year Earnings',
            type: 'EQUITY',
            description: 'Current year net income'
          }
        ]
      },
      // Distributions
      {
        code: '3300',
        name: 'Distributions',
        type: 'EQUITY',
        children: [
          {
            code: '3310',
            name: 'Dividends',
            type: 'EQUITY',
            description: 'Dividends declared'
          },
          {
            code: '3320',
            name: 'Owner Draws',
            type: 'EQUITY',
            description: 'Owner withdrawals'
          }
        ]
      }
    ]
  },

  // 4000-4999: REVENUE
  {
    code: '4000',
    name: 'Revenue',
    type: 'INCOME',
    isSystemAccount: true,
    children: [
      // Sales Revenue
      {
        code: '4100',
        name: 'Sales Revenue',
        type: 'INCOME',
        children: [
          {
            code: '4110',
            name: 'Product Sales',
            type: 'INCOME',
            isSystemAccount: true,
            description: 'Revenue from product sales',
            defaultSettings: { isDefaultForSales: true }
          },
          {
            code: '4120',
            name: 'Service Revenue',
            type: 'INCOME',
            description: 'Revenue from services'
          },
          {
            code: '4130',
            name: 'Subscription Revenue',
            type: 'INCOME',
            description: 'Recurring subscription revenue'
          },
          {
            code: '4140',
            name: 'Rental Income',
            type: 'INCOME',
            description: 'Income from rentals'
          }
        ]
      },
      // Sales Adjustments
      {
        code: '4200',
        name: 'Sales Adjustments',
        type: 'INCOME',
        children: [
          {
            code: '4210',
            name: 'Sales Returns',
            type: 'INCOME',
            description: 'Returns from customers (contra-revenue)'
          },
          {
            code: '4220',
            name: 'Sales Discounts',
            type: 'INCOME',
            description: 'Discounts given to customers (contra-revenue)'
          },
          {
            code: '4230',
            name: 'Sales Allowances',
            type: 'INCOME',
            description: 'Allowances for damaged goods (contra-revenue)'
          }
        ]
      },
      // Other Income
      {
        code: '4300',
        name: 'Other Income',
        type: 'INCOME',
        children: [
          {
            code: '4310',
            name: 'Interest Income',
            type: 'INCOME',
            description: 'Interest earned on investments'
          },
          {
            code: '4320',
            name: 'Dividend Income',
            type: 'INCOME',
            description: 'Dividends received'
          },
          {
            code: '4330',
            name: 'Gain on Asset Disposal',
            type: 'INCOME',
            description: 'Gains from selling assets'
          },
          {
            code: '4340',
            name: 'Foreign Exchange Gain',
            type: 'INCOME',
            description: 'Gains from currency exchange'
          },
          {
            code: '4350',
            name: 'Miscellaneous Income',
            type: 'INCOME',
            description: 'Other miscellaneous income'
          }
        ]
      }
    ]
  },

  // 5000-5999: COST OF GOODS SOLD
  {
    code: '5000',
    name: 'Cost of Goods Sold',
    type: 'EXPENSE',
    isSystemAccount: true,
    children: [
      // Direct Costs
      {
        code: '5100',
        name: 'Direct Costs',
        type: 'EXPENSE',
        children: [
          {
            code: '5110',
            name: 'Materials Cost',
            type: 'EXPENSE',
            isSystemAccount: true,
            description: 'Cost of materials used in production',
            defaultSettings: { isDefaultForCOGS: true }
          },
          {
            code: '5120',
            name: 'Direct Labor',
            type: 'EXPENSE',
            description: 'Labor directly involved in production'
          },
          {
            code: '5130',
            name: 'Manufacturing Overhead',
            type: 'EXPENSE',
            description: 'Indirect production costs'
          },
          {
            code: '5140',
            name: 'Freight In',
            type: 'EXPENSE',
            description: 'Cost to receive inventory'
          }
        ]
      },
      // Inventory Adjustments
      {
        code: '5200',
        name: 'Inventory Adjustments',
        type: 'EXPENSE',
        children: [
          {
            code: '5210',
            name: 'Inventory Write-offs',
            type: 'EXPENSE',
            description: 'Obsolete inventory written off'
          },
          {
            code: '5220',
            name: 'Inventory Shrinkage',
            type: 'EXPENSE',
            description: 'Loss from theft or damage'
          }
        ]
      }
    ]
  },

  // 6000-6999: OPERATING EXPENSES
  {
    code: '6000',
    name: 'Operating Expenses',
    type: 'EXPENSE',
    children: [
      // Selling Expenses
      {
        code: '6100',
        name: 'Selling Expenses',
        type: 'EXPENSE',
        children: [
          {
            code: '6110',
            name: 'Sales Salaries',
            type: 'EXPENSE',
            description: 'Salaries for sales staff'
          },
          {
            code: '6120',
            name: 'Sales Commissions',
            type: 'EXPENSE',
            description: 'Commissions paid to sales staff'
          },
          {
            code: '6130',
            name: 'Advertising & Marketing',
            type: 'EXPENSE',
            description: 'Marketing and advertising costs'
          },
          {
            code: '6140',
            name: 'Travel & Entertainment',
            type: 'EXPENSE',
            description: 'Sales travel and client entertainment'
          },
          {
            code: '6150',
            name: 'Freight Out',
            type: 'EXPENSE',
            description: 'Cost to ship products to customers'
          }
        ]
      },
      // Administrative Expenses
      {
        code: '6200',
        name: 'Administrative Expenses',
        type: 'EXPENSE',
        children: [
          {
            code: '6210',
            name: 'Office Salaries',
            type: 'EXPENSE',
            description: 'Administrative staff salaries'
          },
          {
            code: '6220',
            name: 'Office Supplies',
            type: 'EXPENSE',
            isSystemAccount: true,
            description: 'Office supplies and materials',
            defaultSettings: { isDefaultForPurchases: true }
          },
          {
            code: '6230',
            name: 'Professional Fees',
            type: 'EXPENSE',
            description: 'Legal, accounting, consulting fees'
          },
          {
            code: '6240',
            name: 'Insurance',
            type: 'EXPENSE',
            description: 'Business insurance premiums'
          },
          {
            code: '6250',
            name: 'Utilities',
            type: 'EXPENSE',
            description: 'Electricity, water, gas'
          },
          {
            code: '6260',
            name: 'Rent',
            type: 'EXPENSE',
            description: 'Office and facility rent'
          },
          {
            code: '6270',
            name: 'Depreciation',
            type: 'EXPENSE',
            description: 'Depreciation on fixed assets'
          },
          {
            code: '6280',
            name: 'Amortization',
            type: 'EXPENSE',
            description: 'Amortization of intangible assets'
          },
          {
            code: '6290',
            name: 'Bad Debt Expense',
            type: 'EXPENSE',
            description: 'Uncollectible accounts written off'
          }
        ]
      },
      // IT & Technology
      {
        code: '6300',
        name: 'IT & Technology',
        type: 'EXPENSE',
        children: [
          {
            code: '6310',
            name: 'Software Subscriptions',
            type: 'EXPENSE',
            description: 'Software licenses and SaaS'
          },
          {
            code: '6320',
            name: 'IT Support',
            type: 'EXPENSE',
            description: 'IT support and maintenance'
          },
          {
            code: '6330',
            name: 'Internet & Communications',
            type: 'EXPENSE',
            description: 'Internet, phone, communication services'
          },
          {
            code: '6340',
            name: 'Website & Hosting',
            type: 'EXPENSE',
            description: 'Website maintenance and hosting'
          }
        ]
      },
      // Employee Benefits
      {
        code: '6400',
        name: 'Employee Benefits',
        type: 'EXPENSE',
        children: [
          {
            code: '6410',
            name: 'Health Insurance',
            type: 'EXPENSE',
            description: 'Employee health insurance'
          },
          {
            code: '6420',
            name: 'Retirement Contributions',
            type: 'EXPENSE',
            description: '401k and pension contributions'
          },
          {
            code: '6430',
            name: 'Payroll Taxes',
            type: 'EXPENSE',
            description: 'Employer portion of payroll taxes'
          },
          {
            code: '6440',
            name: 'Employee Training',
            type: 'EXPENSE',
            description: 'Training and development costs'
          }
        ]
      }
    ]
  },

  // 7000-7999: OTHER EXPENSES
  {
    code: '7000',
    name: 'Other Expenses',
    type: 'EXPENSE',
    children: [
      {
        code: '7100',
        name: 'Interest Expense',
        type: 'EXPENSE',
        description: 'Interest on loans and debt'
      },
      {
        code: '7200',
        name: 'Tax Expense',
        type: 'EXPENSE',
        description: 'Income tax expense'
      },
      {
        code: '7300',
        name: 'Loss on Asset Disposal',
        type: 'EXPENSE',
        description: 'Loss from selling assets'
      },
      {
        code: '7400',
        name: 'Foreign Exchange Loss',
        type: 'EXPENSE',
        description: 'Loss from currency exchange'
      },
      {
        code: '7500',
        name: 'Miscellaneous Expense',
        type: 'EXPENSE',
        description: 'Other miscellaneous expenses'
      }
    ]
  }
];

async function createAccountWithChildren(
  account: AccountDefinition,
  parentId: string | null = null,
  companyId: string
): Promise<string> {
  // Create the account
  const createdAccount = await prisma.account.create({
    data: {
      code: account.code,
      name: account.name,
      type: account.type,
      description: account.description,
      isSystemAccount: account.isSystemAccount || false,
      parentId: parentId,
      companyId: companyId,
      balance: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  console.log(`Created account: ${account.code} - ${account.name}`);

  // Store default accounts for later use
  if (account.defaultSettings) {
    if (account.defaultSettings.isDefaultForSales) {
      defaultAccounts.sales = createdAccount.id;
    }
    if (account.defaultSettings.isDefaultForPurchases) {
      defaultAccounts.purchases = createdAccount.id;
    }
    if (account.defaultSettings.isDefaultForAR) {
      defaultAccounts.ar = createdAccount.id;
    }
    if (account.defaultSettings.isDefaultForAP) {
      defaultAccounts.ap = createdAccount.id;
    }
    if (account.defaultSettings.isDefaultForInventory) {
      defaultAccounts.inventory = createdAccount.id;
    }
    if (account.defaultSettings.isDefaultForCOGS) {
      defaultAccounts.cogs = createdAccount.id;
    }
    if (account.defaultSettings.isDefaultForSalesTax) {
      defaultAccounts.salesTax = createdAccount.id;
    }
    if (account.defaultSettings.isDefaultForCash) {
      defaultAccounts.cash = createdAccount.id;
    }
  }

  // Create children recursively
  if (account.children && account.children.length > 0) {
    for (const child of account.children) {
      await createAccountWithChildren(child, createdAccount.id, companyId);
    }
  }
  
  return createdAccount.id;
}

// Store default account IDs
const defaultAccounts = {
  sales: '',
  purchases: '',
  ar: '',
  ap: '',
  inventory: '',
  cogs: '',
  salesTax: '',
  cash: ''
};

export async function seedProductionChartOfAccounts(companyId: string) {
  console.log('🌱 Starting production Chart of Accounts seed...');

  try {
    // Check if accounts already exist
    const existingAccounts = await prisma.account.count({
      where: { companyId }
    });

    if (existingAccounts > 0) {
      console.log(`❌ Company already has ${existingAccounts} accounts. Skipping seed.`);
      return;
    }

    // Ensure company settings exist
    let companySettings = await prisma.companySettings.findFirst({
      where: { isActive: true }
    });
    
    if (!companySettings) {
      companySettings = await prisma.companySettings.create({
        data: {
          companyName: 'Production Company',
          defaultCurrency: 'USD',
          quotationValidityDays: 30,
          quotationPrefix: 'QUOT',
          quotationNumberFormat: 'PREFIX-YYYY-NNNN',
          showCompanyLogoOnQuotations: true,
          showTaxBreakdown: true,
          orderPrefix: 'SO',
          orderNumberFormat: 'PREFIX-YYYY-NNNN',
          autoReserveInventory: true,
          requireCustomerPO: false,
          showCompanyLogoOnOrders: true
        }
      });
    }

    console.log('✅ Company settings ready');

    // Create all accounts
    for (const account of comprehensiveChartOfAccounts) {
      await createAccountWithChildren(account, null, companyId);
    }

    // Configure default accounts for various entities
    await configureDefaultAccounts(companyId);
    
    // Create sample tax rates with GL accounts
    await createDefaultTaxRates(companyId);
    
    // Create GL mapping documentation
    await createGLMappingDocumentation(companyId);

    console.log('✅ Production Chart of Accounts seeded successfully!');
    
    // Print summary
    const summary = await prisma.account.groupBy({
      by: ['type'],
      where: { companyId },
      _count: true
    });

    console.log('\n📊 Account Summary:');
    summary.forEach(s => {
      console.log(`  ${s.type}: ${s._count} accounts`);
    });

  } catch (error) {
    console.error('❌ Error seeding Chart of Accounts:', error);
    throw error;
  }
}

// Configure default accounts for various entities
async function configureDefaultAccounts(companyId: string) {
  console.log('\n🔗 Configuring default accounts...');

  // Update sample items with GL accounts
  const items = await prisma.item.findMany({
    where: { 
      OR: [
        { inventoryAccountId: null },
        { cogsAccountId: null },
        { salesAccountId: null }
      ]
    }
  });

  if (items.length > 0) {
    console.log(`Updating GL accounts for ${items.length} items...`);
    
    for (const item of items) {
      await prisma.item.update({
        where: { id: item.id },
        data: {
          inventoryAccountId: defaultAccounts.inventory || undefined,
          cogsAccountId: defaultAccounts.cogs || undefined,
          salesAccountId: defaultAccounts.sales || undefined
        }
      });
    }
  }

  // Update locations with inventory accounts
  const locations = await prisma.location.findMany({
    where: { inventoryAccountId: null }
  });

  if (locations.length > 0) {
    console.log(`Updating GL accounts for ${locations.length} locations...`);
    
    for (const location of locations) {
      await prisma.location.update({
        where: { id: location.id },
        data: {
          inventoryAccountId: defaultAccounts.inventory || undefined
        }
      });
    }
  }

  console.log('✅ Default accounts configured');
}

// Create default tax rates with GL accounts
async function createDefaultTaxRates(companyId: string) {
  console.log('\n💰 Creating default tax rates...');

  const taxRates = [
    {
      code: 'STANDARD',
      name: 'Standard Tax',
      description: 'Standard sales tax rate',
      rate: 10,
      isDefault: true,
      collectedAccountId: defaultAccounts.salesTax,
      paidAccountId: null // Could be set to a prepaid tax account
    },
    {
      code: 'EXEMPT',
      name: 'Tax Exempt',
      description: 'No tax applicable',
      rate: 0,
      isDefault: false,
      collectedAccountId: null,
      paidAccountId: null
    },
    {
      code: 'REDUCED',
      name: 'Reduced Tax',
      description: 'Reduced tax rate for essential items',
      rate: 5,
      isDefault: false,
      collectedAccountId: defaultAccounts.salesTax,
      paidAccountId: null
    }
  ];

  for (const taxRate of taxRates) {
    const existing = await prisma.taxRate.findUnique({
      where: { code: taxRate.code }
    });

    if (!existing) {
      await prisma.taxRate.create({
        data: {
          ...taxRate,
          companyId,
          createdBy: 'system',
          isActive: true
        }
      });
      console.log(`Created tax rate: ${taxRate.code} - ${taxRate.name}`);
    }
  }

  console.log('✅ Tax rates created');
}

// Create GL mapping documentation
async function createGLMappingDocumentation(companyId: string) {
  console.log('\n📄 GL Mapping Documentation');
  console.log('================================');
  
  const mappings = [
    {
      transactionType: 'SALES_INVOICE',
      description: 'Customer Invoice',
      entries: [
        { account: 'Accounts Receivable (1121)', type: 'DEBIT', description: 'AR from customer' },
        { account: 'Sales Revenue (4110)', type: 'CREDIT', description: 'Sales revenue' },
        { account: 'Sales Tax Payable (2131)', type: 'CREDIT', description: 'Sales tax collected' }
      ]
    },
    {
      transactionType: 'COST_OF_GOODS_SOLD',
      description: 'COGS on Sale',
      entries: [
        { account: 'Cost of Goods Sold (5110)', type: 'DEBIT', description: 'Cost of items sold' },
        { account: 'Inventory (1134)', type: 'CREDIT', description: 'Reduce inventory' }
      ]
    },
    {
      transactionType: 'PURCHASE_INVOICE',
      description: 'Vendor Invoice',
      entries: [
        { account: 'Inventory/Expense', type: 'DEBIT', description: 'Items/services received' },
        { account: 'Accounts Payable (2111)', type: 'CREDIT', description: 'AP to vendor' }
      ]
    },
    {
      transactionType: 'CUSTOMER_PAYMENT',
      description: 'Payment from Customer',
      entries: [
        { account: 'Cash (1113)', type: 'DEBIT', description: 'Cash received' },
        { account: 'Accounts Receivable (1121)', type: 'CREDIT', description: 'AR cleared' }
      ]
    },
    {
      transactionType: 'VENDOR_PAYMENT',
      description: 'Payment to Vendor',
      entries: [
        { account: 'Accounts Payable (2111)', type: 'DEBIT', description: 'AP cleared' },
        { account: 'Cash (1113)', type: 'CREDIT', description: 'Cash paid' }
      ]
    },
    {
      transactionType: 'INVENTORY_ADJUSTMENT',
      description: 'Inventory Count Adjustment',
      entries: [
        { account: 'Inventory (1134)', type: 'DEBIT/CREDIT', description: 'Adjust inventory value' },
        { account: 'Inventory Shrinkage (5220)', type: 'DEBIT/CREDIT', description: 'Record variance' }
      ]
    }
  ];

  console.log('\nStandard GL Posting Rules:');
  mappings.forEach(mapping => {
    console.log(`\n${mapping.transactionType}: ${mapping.description}`);
    mapping.entries.forEach(entry => {
      console.log(`  ${entry.type.padEnd(6)} ${entry.account.padEnd(30)} - ${entry.description}`);
    });
  });
  
  console.log('\n✅ GL mapping documentation created');
}

// Main execution function
async function main() {
  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Get the first company for demo purposes
    const company = await prisma.company.findFirst();
    
    if (!company) {
      console.error('❌ No company found. Please create a company first.');
      return;
    }

    await seedProductionChartOfAccounts(company.id);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed if called directly
if (require.main === module) {
  main();
}