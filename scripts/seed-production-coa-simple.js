const { PrismaClient } = require('../lib/generated/prisma');

console.log('PrismaClient loaded:', PrismaClient);
const prisma = new PrismaClient();
console.log('prisma instance created:', prisma);

async function main() {
  console.log('🚀 Setting up Production Chart of Accounts...\n');

  try {
    // Get the first company
    let company = await prisma.company.findFirst({
      where: { isActive: true }
    });

    if (!company) {
      console.log('📦 Creating default company...');
      company = await prisma.company.create({
        data: {
          name: 'Production Company',
          code: 'PROD',
          registrationNumber: 'PROD-001',
          taxNumber: 'TAX-001',
          email: 'info@production.com',
          phone: '+1234567890',
          website: 'https://production.com',
          address: '123 Business St',
          city: 'Business City',
          state: 'BC',
          country: 'US',
          postalCode: '12345',
          currency: 'USD',
          fiscalYearStart: new Date(new Date().getFullYear(), 0, 1),
          logoUrl: null,
          isActive: true,
          createdBy: 'system'
        }
      });
      console.log('✅ Company created\n');
    } else {
      console.log(`📦 Using existing company: ${company.name}\n`);
    }

    // Check if accounts already exist
    const existingAccounts = await prisma.account.count({
      where: { companyId: company.id }
    });

    if (existingAccounts > 0) {
      console.log(`❌ Company already has ${existingAccounts} accounts. Skipping seed.`);
      return;
    }

    console.log('📊 Creating Chart of Accounts...');

    // Create main account categories
    const assets = await prisma.account.create({
      data: {
        code: '1000',
        name: 'Assets',
        type: 'ASSET',
        isSystemAccount: true,
        balance: 0,
        companyId: company.id,
        isActive: true
      }
    });

    const liabilities = await prisma.account.create({
      data: {
        code: '2000',
        name: 'Liabilities',
        type: 'LIABILITY',
        isSystemAccount: true,
        balance: 0,
        companyId: company.id,
        isActive: true
      }
    });

    const equity = await prisma.account.create({
      data: {
        code: '3000',
        name: 'Equity',
        type: 'EQUITY',
        isSystemAccount: true,
        balance: 0,
        companyId: company.id,
        isActive: true
      }
    });

    const income = await prisma.account.create({
      data: {
        code: '4000',
        name: 'Revenue',
        type: 'INCOME',
        isSystemAccount: true,
        balance: 0,
        companyId: company.id,
        isActive: true
      }
    });

    const expenses = await prisma.account.create({
      data: {
        code: '5000',
        name: 'Cost of Goods Sold',
        type: 'EXPENSE',
        isSystemAccount: true,
        balance: 0,
        companyId: company.id,
        isActive: true
      }
    });

    const operatingExpenses = await prisma.account.create({
      data: {
        code: '6000',
        name: 'Operating Expenses',
        type: 'EXPENSE',
        balance: 0,
        companyId: company.id,
        isActive: true
      }
    });

    // Create essential sub-accounts
    // Current Assets
    const currentAssets = await prisma.account.create({
      data: {
        code: '1100',
        name: 'Current Assets',
        type: 'ASSET',
        parentId: assets.id,
        balance: 0,
        companyId: company.id,
        isActive: true
      }
    });

    // Cash accounts
    await prisma.account.create({
      data: {
        code: '1113',
        name: 'Cash in Banks - Checking',
        type: 'ASSET',
        parentId: currentAssets.id,
        isSystemAccount: true,
        description: 'Primary operating bank account',
        balance: 0,
        companyId: company.id,
        isActive: true
      }
    });

    // Accounts Receivable
    await prisma.account.create({
      data: {
        code: '1121',
        name: 'Trade Receivables',
        type: 'ASSET',
        parentId: currentAssets.id,
        isSystemAccount: true,
        description: 'Amounts owed by customers',
        balance: 0,
        companyId: company.id,
        isActive: true
      }
    });

    // Inventory
    await prisma.account.create({
      data: {
        code: '1134',
        name: 'Merchandise Inventory',
        type: 'ASSET',
        parentId: currentAssets.id,
        isSystemAccount: true,
        description: 'Goods held for resale',
        balance: 0,
        companyId: company.id,
        isActive: true
      }
    });

    // Current Liabilities
    const currentLiabilities = await prisma.account.create({
      data: {
        code: '2100',
        name: 'Current Liabilities',
        type: 'LIABILITY',
        parentId: liabilities.id,
        balance: 0,
        companyId: company.id,
        isActive: true
      }
    });

    // Accounts Payable
    await prisma.account.create({
      data: {
        code: '2111',
        name: 'Trade Payables',
        type: 'LIABILITY',
        parentId: currentLiabilities.id,
        isSystemAccount: true,
        description: 'Amounts owed to suppliers',
        balance: 0,
        companyId: company.id,
        isActive: true
      }
    });

    // Sales Tax Payable
    await prisma.account.create({
      data: {
        code: '2131',
        name: 'Sales Tax Payable',
        type: 'LIABILITY',
        parentId: currentLiabilities.id,
        isSystemAccount: true,
        description: 'Sales tax collected from customers',
        balance: 0,
        companyId: company.id,
        isActive: true
      }
    });

    // Retained Earnings
    await prisma.account.create({
      data: {
        code: '3210',
        name: 'Retained Earnings',
        type: 'EQUITY',
        parentId: equity.id,
        isSystemAccount: true,
        description: 'Accumulated profits',
        balance: 0,
        companyId: company.id,
        isActive: true
      }
    });

    // Sales Revenue
    await prisma.account.create({
      data: {
        code: '4110',
        name: 'Product Sales',
        type: 'INCOME',
        parentId: income.id,
        isSystemAccount: true,
        description: 'Revenue from product sales',
        balance: 0,
        companyId: company.id,
        isActive: true
      }
    });

    // Cost of Goods Sold
    await prisma.account.create({
      data: {
        code: '5110',
        name: 'Materials Cost',
        type: 'EXPENSE',
        parentId: expenses.id,
        isSystemAccount: true,
        description: 'Cost of materials used in production',
        balance: 0,
        companyId: company.id,
        isActive: true
      }
    });

    // Office Supplies Expense
    await prisma.account.create({
      data: {
        code: '6220',
        name: 'Office Supplies',
        type: 'EXPENSE',
        parentId: operatingExpenses.id,
        isSystemAccount: true,
        description: 'Office supplies and materials',
        balance: 0,
        companyId: company.id,
        isActive: true
      }
    });

    console.log('✅ Chart of Accounts created successfully!');

    // Create default tax rates
    console.log('\n💰 Creating default tax rates...');

    const salesTaxAccount = await prisma.account.findFirst({
      where: { code: '2131', companyId: company.id }
    });

    const taxRates = [
      {
        code: 'STANDARD',
        name: 'Standard Tax',
        description: 'Standard sales tax rate',
        rate: 10,
        isDefault: true,
        collectedAccountId: salesTaxAccount?.id,
        paidAccountId: null
      },
      {
        code: 'EXEMPT',
        name: 'Tax Exempt',
        description: 'No tax applicable',
        rate: 0,
        isDefault: false,
        collectedAccountId: null,
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
            companyId: company.id,
            createdBy: 'system',
            isActive: true
          }
        });
        console.log(`Created tax rate: ${taxRate.code} - ${taxRate.name}`);
      }
    }

    console.log('\n🎉 Production Chart of Accounts setup complete!');
    console.log('\n📋 Summary:');
    
    const accountSummary = await prisma.account.groupBy({
      by: ['type'],
      where: { companyId: company.id },
      _count: true
    });

    accountSummary.forEach(s => {
      console.log(`  ${s.type}: ${s._count} accounts`);
    });

    console.log('\n📋 Next steps:');
    console.log('1. Review the created accounts in your system');
    console.log('2. Add more detailed accounts as needed');
    console.log('3. Configure item-specific GL accounts');
    console.log('4. Set up additional tax rates');
    console.log('5. Train users on GL posting procedures');

  } catch (error) {
    console.error('\n❌ Error setting up Chart of Accounts:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();