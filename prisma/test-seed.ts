import { PrismaClient, Role, AccountType, AccountStatus, CustomerStatus, LeadStatus } from '../lib/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function setupTestDatabase(): Promise<void> {
  console.warn('🧪 Setting up test database...')
  
  try {
    // Clean database in correct order to avoid foreign key violations
    await cleanTestDatabase()
    
    // Create essential test data
    const testUser = await createTestUser()
    const accounts = await createTestChartOfAccounts(testUser.id)
    await createTestUnitsAndCategories(testUser.id)
    
    console.warn('✅ Test database setup completed')
    return { testUser, accounts }
  } catch (error) {
    console.error('Error in setupTestDatabase:', error)
    throw error
  }
}

export async function cleanTestDatabase(): Promise<void> {
  console.warn('🧹 Cleaning test database...')
  
  // Delete in dependency order to avoid foreign key violations
  await prisma.auditLog.deleteMany()
  await prisma.journalLine.deleteMany()
  await prisma.journalEntry.deleteMany()
  await prisma.quotationItem.deleteMany()
  await prisma.quotation.deleteMany()
  await prisma.customerPO.deleteMany()
  await prisma.caseExpense.deleteMany()
  await prisma.salesCase.deleteMany()
  await prisma.stockMovement.deleteMany()
  await prisma.stockLot.deleteMany()
  await prisma.item.deleteMany()
  await prisma.category.deleteMany()
  await prisma.unitOfMeasure.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()
  
  console.warn('✅ Test database cleaned')
}

async function createTestUser(): Promise<T> {
  const hashedPassword = await bcrypt.hash('testpass123', 10)
  
  const testUser = await prisma.user.create({
    data: {
      username: 'testuser',
      email: 'test@enxi-erp.com',
      password: hashedPassword,
      role: Role.ADMIN,
      isActive: true
    }
  })
  
  return testUser
}

async function createTestChartOfAccounts(userId: string): Promise<unknown> {
  console.warn('📊 Creating test chart of accounts...')
  
  // Create parent accounts first
  const assets = await prisma.account.create({
    data: {
      code: '1000',
      name: 'Assets',
      type: AccountType.ASSET,
      description: 'Total Assets',
      status: AccountStatus.ACTIVE,
      createdBy: userId
    }
  })

  const liabilities = await prisma.account.create({
    data: {
      code: '2000',
      name: 'Liabilities',
      type: AccountType.LIABILITY,
      description: 'Total Liabilities',
      status: AccountStatus.ACTIVE,
      createdBy: userId
    }
  })

  const equity = await prisma.account.create({
    data: {
      code: '3000',
      name: 'Equity',
      type: AccountType.EQUITY,
      description: 'Owner Equity',
      status: AccountStatus.ACTIVE,
      createdBy: userId
    }
  })

  const income = await prisma.account.create({
    data: {
      code: '4000',
      name: 'Income',
      type: AccountType.INCOME,
      description: 'Total Income',
      status: AccountStatus.ACTIVE,
      createdBy: userId
    }
  })

  const expenses = await prisma.account.create({
    data: {
      code: '5000',
      name: 'Expenses',
      type: AccountType.EXPENSE,
      description: 'Total Expenses',
      status: AccountStatus.ACTIVE,
      createdBy: userId
    }
  })

  // Create specific accounts with parent references
  const cash = await prisma.account.create({
    data: {
      code: '1110',
      name: 'Cash',
      type: AccountType.ASSET,
      description: 'Cash and cash equivalents',
      parentId: assets.id,
      status: AccountStatus.ACTIVE,
      createdBy: userId
    }
  })

  const accountsReceivable = await prisma.account.create({
    data: {
      code: '1120',
      name: 'Accounts Receivable',
      type: AccountType.ASSET,
      description: 'Customer receivables',
      parentId: assets.id,
      status: AccountStatus.ACTIVE,
      createdBy: userId
    }
  })

  const inventory = await prisma.account.create({
    data: {
      code: '1130',
      name: 'Inventory',
      type: AccountType.ASSET,
      description: 'Inventory asset',
      parentId: assets.id,
      status: AccountStatus.ACTIVE,
      createdBy: userId
    }
  })

  const equipment = await prisma.account.create({
    data: {
      code: '1210',
      name: 'Equipment',
      type: AccountType.ASSET,
      description: 'Office equipment',
      parentId: assets.id,
      status: AccountStatus.ACTIVE,
      createdBy: userId
    }
  })

  const accountsPayable = await prisma.account.create({
    data: {
      code: '2110',
      name: 'Accounts Payable',
      type: AccountType.LIABILITY,
      description: 'Vendor payables',
      parentId: liabilities.id,
      status: AccountStatus.ACTIVE,
      createdBy: userId
    }
  })

  const longTermLiabilities = await prisma.account.create({
    data: {
      code: '2200',
      name: 'Long-term Liabilities',
      type: AccountType.LIABILITY,
      description: 'Long-term debts',
      parentId: liabilities.id,
      status: AccountStatus.ACTIVE,
      createdBy: userId
    }
  })

  const shareCapital = await prisma.account.create({
    data: {
      code: '3100',
      name: 'Share Capital',
      type: AccountType.EQUITY,
      description: 'Common stock',
      parentId: equity.id,
      status: AccountStatus.ACTIVE,
      createdBy: userId
    }
  })

  const salesRevenue = await prisma.account.create({
    data: {
      code: '4100',
      name: 'Sales Revenue',
      type: AccountType.INCOME,
      description: 'Revenue from sales',
      parentId: income.id,
      status: AccountStatus.ACTIVE,
      createdBy: userId
    }
  })

  const serviceRevenue = await prisma.account.create({
    data: {
      code: '4200',
      name: 'Service Revenue',
      type: AccountType.INCOME,
      description: 'Revenue from services',
      parentId: income.id,
      status: AccountStatus.ACTIVE,
      createdBy: userId
    }
  })

  const cogs = await prisma.account.create({
    data: {
      code: '5100',
      name: 'Cost of Goods Sold',
      type: AccountType.EXPENSE,
      description: 'Direct cost of goods sold',
      parentId: expenses.id,
      status: AccountStatus.ACTIVE,
      createdBy: userId
    }
  })

  const salariesExpense = await prisma.account.create({
    data: {
      code: '5210',
      name: 'Salaries and Wages',
      type: AccountType.EXPENSE,
      description: 'Employee salaries',
      parentId: expenses.id,
      status: AccountStatus.ACTIVE,
      createdBy: userId
    }
  })

  const rentExpense = await prisma.account.create({
    data: {
      code: '5220',
      name: 'Rent Expense',
      type: AccountType.EXPENSE,
      description: 'Office rent',
      parentId: expenses.id,
      status: AccountStatus.ACTIVE,
      createdBy: userId
    }
  })

  const utilitiesExpense = await prisma.account.create({
    data: {
      code: '5230',
      name: 'Utilities Expense',
      type: AccountType.EXPENSE,
      description: 'Utilities and services',
      parentId: expenses.id,
      status: AccountStatus.ACTIVE,
      createdBy: userId
    }
  })

  return {
    // Parent accounts
    assets,
    liabilities,
    equity,
    income,
    expenses,
    // Specific accounts
    cash,
    accountsReceivable,
    inventory,
    equipment,
    accountsPayable,
    longTermLiabilities,
    shareCapital,
    salesRevenue,
    serviceRevenue,
    cogs,
    salariesExpense,
    rentExpense,
    utilitiesExpense
  }
}

async function createTestUnitsAndCategories(userId: string): Promise<unknown> {
  console.warn('📦 Creating test units and categories...')
  
  // Units of Measure
  const pieces = await prisma.unitOfMeasure.create({
    data: {
      code: 'PCS',
      name: 'Pieces',
      symbol: 'pcs',
      isBaseUnit: true,
      createdBy: userId
    }
  })

  const kg = await prisma.unitOfMeasure.create({
    data: {
      code: 'KG',
      name: 'Kilogram',
      symbol: 'kg',
      isBaseUnit: true,
      createdBy: userId
    }
  })

  // Categories
  const electronics = await prisma.category.create({
    data: {
      code: 'ELEC',
      name: 'Electronics',
      description: 'Electronic products',
      createdBy: userId
    }
  })

  const services = await prisma.category.create({
    data: {
      code: 'SRV',
      name: 'Services',
      description: 'Service items',
      createdBy: userId
    }
  })

  return {
    units: { pieces, kg },
    categories: { electronics, services }
  }
}

export async function createTestCustomer(userId: string, accounts: unknown): Promise<unknown> {
  const customer = await prisma.customer.create({
    data: {
      customerNumber: 'TEST-001',
      name: 'Test Corporation',
      email: 'test@testcorp.com',
      phone: '+1-555-TEST',
      taxId: 'TEST-123',
      industry: 'Testing',
      creditLimit: 50000,
      paymentTerms: 30,
      createdBy: userId,
      // Create dedicated AR account for this customer
      account: {
        create: {
          code: `1200-TEST-001`,
          name: 'Test Corporation - AR',
          type: AccountType.ASSET,
          parentId: accounts.accountsReceivable.id,
          description: 'Accounts receivable for Test Corporation',
          currency: 'USD',
          status: AccountStatus.ACTIVE,
          createdBy: userId
        }
      }
    },
    include: {
      account: true
    }
  })

  return customer
}

export async function createTestLead(userId: string): Promise<unknown> {
  const lead = await prisma.lead.create({
    data: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@testlead.com',
      company: 'Test Lead Corp',
      phone: '+1-555-LEAD',
      jobTitle: 'Manager',
      source: 'WEBSITE',
      status: LeadStatus.NEW,
      notes: 'Test lead for integration testing',
      createdBy: userId
    }
  })

  return lead
}

// Use this in tests
export default setupTestDatabase