import { PrismaClient, AccountType, Prisma } from '@prisma/client';

// Initialize Prisma Client with production-friendly settings
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
});

interface AccountDefinition {
  code: string;
  name: string;
  type: AccountType;
  isSystemAccount?: boolean;
  description?: string;
  children?: AccountDefinition[];
}

// Store default account IDs for later configuration
const defaultAccounts: Record<string, string> = {};

/**
 * Production-ready Chart of Accounts seed
 * Supports multiple deployment environments
 */
export async function seedProductionChartOfAccounts(companyId?: string) {
  console.log('🌱 Seeding Production Chart of Accounts...');

  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    // Get or create company
    let targetCompanyId = companyId;
    
    if (!targetCompanyId) {
      // Try to get from environment variable first
      const envCompanyId = process.env.COMPANY_ID;
      
      if (envCompanyId) {
        targetCompanyId = envCompanyId;
      } else {
        // Find first active company or create one
        const existingCompany = await prisma.company.findFirst({
          where: { isActive: true }
        });

        if (existingCompany) {
          targetCompanyId = existingCompany.id;
          console.log(`Using existing company: ${existingCompany.name}`);
        } else {
          // Create a default company
          const newCompany = await prisma.company.create({
            data: {
              name: process.env.COMPANY_NAME || 'Default Company',
              code: process.env.COMPANY_CODE || 'DEFAULT',
              registrationNumber: process.env.COMPANY_REG_NO || 'REG-001',
              taxNumber: process.env.COMPANY_TAX_NO || 'TAX-001',
              email: process.env.COMPANY_EMAIL || 'info@company.com',
              phone: process.env.COMPANY_PHONE || '+1234567890',
              website: process.env.COMPANY_WEBSITE || 'https://company.com',
              address: process.env.COMPANY_ADDRESS || '123 Business St',
              city: process.env.COMPANY_CITY || 'Business City',
              state: process.env.COMPANY_STATE || 'BC',
              country: process.env.COMPANY_COUNTRY || 'US',
              postalCode: process.env.COMPANY_POSTAL || '12345',
              currency: process.env.DEFAULT_CURRENCY || 'USD',
              fiscalYearStart: new Date(new Date().getFullYear(), 0, 1),
              isActive: true,
              createdBy: 'system'
            }
          });
          targetCompanyId = newCompany.id;
          console.log(`Created new company: ${newCompany.name}`);
        }
      }
    }

    // Check if accounts already exist
    const existingAccounts = await prisma.account.count({
      where: { companyId: targetCompanyId }
    });

    if (existingAccounts > 0 && !process.env.FORCE_RESEED) {
      console.log(`Company already has ${existingAccounts} accounts.`);
      console.log('Use FORCE_RESEED=true to override existing accounts.');
      return;
    }

    // Clear existing accounts if force reseed
    if (existingAccounts > 0 && process.env.FORCE_RESEED === 'true') {
      console.log('Force reseed enabled. Clearing existing accounts...');
      
      // Delete in correct order to respect foreign keys
      await prisma.journalLine.deleteMany({});
      await prisma.journalEntry.deleteMany({});
      await prisma.account.deleteMany({ where: { companyId: targetCompanyId } });
      
      console.log('✅ Existing accounts cleared');
    }

    // Create the chart of accounts
    await createChartOfAccounts(targetCompanyId);

    // Configure default accounts for the system
    await configureSystemDefaults(targetCompanyId);

    // Create default tax rates
    await createDefaultTaxRates(targetCompanyId);

    // Print summary
    const summary = await prisma.account.groupBy({
      by: ['type'],
      where: { companyId: targetCompanyId },
      _count: true
    });

    console.log('\n✅ Chart of Accounts created successfully!');
    console.log('\n📊 Account Summary:');
    summary.forEach(s => {
      console.log(`  ${s.type}: ${s._count} accounts`);
    });

    console.log('\n📋 GL Posting Configuration:');
    console.log('  Default Cash Account:', defaultAccounts.cash ? '✅' : '❌');
    console.log('  Default AR Account:', defaultAccounts.ar ? '✅' : '❌');
    console.log('  Default AP Account:', defaultAccounts.ap ? '✅' : '❌');
    console.log('  Default Sales Account:', defaultAccounts.sales ? '✅' : '❌');
    console.log('  Default COGS Account:', defaultAccounts.cogs ? '✅' : '❌');
    console.log('  Default Inventory Account:', defaultAccounts.inventory ? '✅' : '❌');

  } catch (error) {
    console.error('❌ Error seeding Chart of Accounts:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createChartOfAccounts(companyId: string) {
  // Essential accounts for any business
  const accounts: AccountDefinition[] = [
    // ASSETS (1000)
    {
      code: '1000',
      name: 'Assets',
      type: 'ASSET',
      isSystemAccount: true,
      children: [
        {
          code: '1100',
          name: 'Current Assets',
          type: 'ASSET',
          children: [
            {
              code: '1110',
              name: 'Cash and Cash Equivalents',
              type: 'ASSET',
              children: [
                {
                  code: '1111',
                  name: 'Cash on Hand',
                  type: 'ASSET',
                  description: 'Physical cash'
                },
                {
                  code: '1112',
                  name: 'Cash in Bank - Operating',
                  type: 'ASSET',
                  isSystemAccount: true,
                  description: 'Main operating bank account'
                }
              ]
            },
            {
              code: '1120',
              name: 'Accounts Receivable',
              type: 'ASSET',
              isSystemAccount: true,
              description: 'Customer receivables'
            },
            {
              code: '1130',
              name: 'Inventory',
              type: 'ASSET',
              isSystemAccount: true,
              description: 'Goods for sale'
            },
            {
              code: '1140',
              name: 'Prepaid Expenses',
              type: 'ASSET',
              description: 'Expenses paid in advance'
            }
          ]
        },
        {
          code: '1200',
          name: 'Fixed Assets',
          type: 'ASSET',
          children: [
            {
              code: '1210',
              name: 'Property and Equipment',
              type: 'ASSET',
              description: 'Tangible fixed assets'
            },
            {
              code: '1290',
              name: 'Accumulated Depreciation',
              type: 'ASSET',
              description: 'Depreciation contra account'
            }
          ]
        }
      ]
    },
    // LIABILITIES (2000)
    {
      code: '2000',
      name: 'Liabilities',
      type: 'LIABILITY',
      isSystemAccount: true,
      children: [
        {
          code: '2100',
          name: 'Current Liabilities',
          type: 'LIABILITY',
          children: [
            {
              code: '2110',
              name: 'Accounts Payable',
              type: 'LIABILITY',
              isSystemAccount: true,
              description: 'Vendor payables'
            },
            {
              code: '2120',
              name: 'Sales Tax Payable',
              type: 'LIABILITY',
              isSystemAccount: true,
              description: 'Sales tax collected'
            },
            {
              code: '2130',
              name: 'Accrued Expenses',
              type: 'LIABILITY',
              description: 'Expenses incurred but not paid'
            }
          ]
        },
        {
          code: '2200',
          name: 'Long-term Liabilities',
          type: 'LIABILITY',
          description: 'Long-term debts'
        }
      ]
    },
    // EQUITY (3000)
    {
      code: '3000',
      name: 'Equity',
      type: 'EQUITY',
      isSystemAccount: true,
      children: [
        {
          code: '3100',
          name: 'Owner\'s Equity',
          type: 'EQUITY',
          description: 'Owner investments'
        },
        {
          code: '3200',
          name: 'Retained Earnings',
          type: 'EQUITY',
          isSystemAccount: true,
          description: 'Accumulated profits'
        }
      ]
    },
    // REVENUE (4000)
    {
      code: '4000',
      name: 'Revenue',
      type: 'INCOME',
      isSystemAccount: true,
      children: [
        {
          code: '4100',
          name: 'Sales Revenue',
          type: 'INCOME',
          isSystemAccount: true,
          description: 'Revenue from sales'
        },
        {
          code: '4200',
          name: 'Service Revenue',
          type: 'INCOME',
          description: 'Revenue from services'
        },
        {
          code: '4900',
          name: 'Other Income',
          type: 'INCOME',
          description: 'Miscellaneous income'
        }
      ]
    },
    // EXPENSES (5000-6000)
    {
      code: '5000',
      name: 'Cost of Goods Sold',
      type: 'EXPENSE',
      isSystemAccount: true,
      children: [
        {
          code: '5100',
          name: 'Product Costs',
          type: 'EXPENSE',
          isSystemAccount: true,
          description: 'Direct product costs'
        },
        {
          code: '5200',
          name: 'Labor Costs',
          type: 'EXPENSE',
          description: 'Direct labor costs'
        }
      ]
    },
    {
      code: '6000',
      name: 'Operating Expenses',
      type: 'EXPENSE',
      children: [
        {
          code: '6100',
          name: 'Administrative Expenses',
          type: 'EXPENSE',
          children: [
            {
              code: '6110',
              name: 'Office Supplies',
              type: 'EXPENSE',
              description: 'Office supplies and materials'
            },
            {
              code: '6120',
              name: 'Rent Expense',
              type: 'EXPENSE',
              description: 'Office rent'
            },
            {
              code: '6130',
              name: 'Utilities',
              type: 'EXPENSE',
              description: 'Utilities expenses'
            }
          ]
        },
        {
          code: '6200',
          name: 'Selling Expenses',
          type: 'EXPENSE',
          children: [
            {
              code: '6210',
              name: 'Marketing',
              type: 'EXPENSE',
              description: 'Marketing and advertising'
            },
            {
              code: '6220',
              name: 'Sales Commissions',
              type: 'EXPENSE',
              description: 'Sales team commissions'
            }
          ]
        }
      ]
    }
  ];

  // Create accounts recursively
  for (const account of accounts) {
    await createAccountWithChildren(account, null, companyId);
  }
}

async function createAccountWithChildren(
  account: AccountDefinition,
  parentId: string | null,
  companyId: string
): Promise<string> {
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
      isActive: true
    }
  });

  console.log(`Created account: ${account.code} - ${account.name}`);

  // Store system account IDs for configuration
  if (account.isSystemAccount) {
    switch (account.code) {
      case '1112': defaultAccounts.cash = createdAccount.id; break;
      case '1120': defaultAccounts.ar = createdAccount.id; break;
      case '1130': defaultAccounts.inventory = createdAccount.id; break;
      case '2110': defaultAccounts.ap = createdAccount.id; break;
      case '2120': defaultAccounts.salesTax = createdAccount.id; break;
      case '4100': defaultAccounts.sales = createdAccount.id; break;
      case '5100': defaultAccounts.cogs = createdAccount.id; break;
    }
  }

  // Create children
  if (account.children) {
    for (const child of account.children) {
      await createAccountWithChildren(child, createdAccount.id, companyId);
    }
  }

  return createdAccount.id;
}

async function configureSystemDefaults(companyId: string) {
  console.log('\n🔧 Configuring system defaults...');

  // Update items with default GL accounts
  const itemsWithoutAccounts = await prisma.item.findMany({
    where: {
      OR: [
        { inventoryAccountId: null },
        { cogsAccountId: null },
        { salesAccountId: null }
      ]
    }
  });

  if (itemsWithoutAccounts.length > 0) {
    console.log(`Updating ${itemsWithoutAccounts.length} items with default GL accounts...`);
    
    await prisma.item.updateMany({
      where: {
        id: { in: itemsWithoutAccounts.map(i => i.id) }
      },
      data: {
        inventoryAccountId: defaultAccounts.inventory,
        cogsAccountId: defaultAccounts.cogs,
        salesAccountId: defaultAccounts.sales
      }
    });
  }

  // Update locations with default inventory account
  await prisma.location.updateMany({
    where: { inventoryAccountId: null },
    data: { inventoryAccountId: defaultAccounts.inventory }
  });

  console.log('✅ System defaults configured');
}

async function createDefaultTaxRates(companyId: string) {
  console.log('\n💰 Creating default tax rates...');

  const defaultTaxRate = parseFloat(process.env.DEFAULT_TAX_RATE || '10');
  
  const taxRates = [
    {
      code: 'STANDARD',
      name: 'Standard Tax',
      description: 'Standard sales tax',
      rate: defaultTaxRate,
      isDefault: true,
      collectedAccountId: defaultAccounts.salesTax
    },
    {
      code: 'EXEMPT',
      name: 'Tax Exempt',
      description: 'No tax',
      rate: 0,
      isDefault: false
    }
  ];

  for (const taxRate of taxRates) {
    try {
      await prisma.taxRate.create({
        data: {
          ...taxRate,
          companyId,
          createdBy: 'system',
          isActive: true
        }
      });
      console.log(`Created tax rate: ${taxRate.code} - ${taxRate.name}`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`Tax rate ${taxRate.code} already exists`);
      } else {
        throw error;
      }
    }
  }

  console.log('✅ Tax rates created');
}

// Main execution
async function main() {
  try {
    await seedProductionChartOfAccounts();
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for use in other scripts
export default seedProductionChartOfAccounts;