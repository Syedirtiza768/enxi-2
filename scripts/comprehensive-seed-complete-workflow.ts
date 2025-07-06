#!/usr/bin/env npx tsx

/**
 * Comprehensive ERP Data Seeding Script
 * 
 * This script creates a complete business workflow with all entities and relationships:
 * 1. Users and authentication
 * 2. Complete chart of accounts
 * 3. Customers with AR accounts
 * 4. Leads and lead-to-customer conversion
 * 5. Inventory system with categories, items, and stock
 * 6. Sales cases and quotations
 * 7. Sales orders and deliveries
 * 8. Invoices and payments
 * 9. Complete GL transactions
 * 10. Audit trails and multi-currency
 */

import { prisma } from '../lib/db/prisma'
import bcrypt from 'bcryptjs'
// Define enum-like constants for database values
const AccountType = {
  ASSET: 'ASSET',
  LIABILITY: 'LIABILITY',
  EQUITY: 'EQUITY',
  REVENUE: 'REVENUE',
  EXPENSE: 'EXPENSE'
} as const

const Role = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  USER: 'USER',
  SALES: 'SALES'
} as const

// CustomerStatus removed - Customer model doesn't have status field

const LeadStatus = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  PROPOSAL: 'PROPOSAL',
  CONVERTED: 'CONVERTED',
  LOST: 'LOST'
} as const

const SalesCaseStatus = {
  OPEN: 'OPEN',
  QUALIFIED: 'QUALIFIED',
  PROPOSAL: 'PROPOSAL',
  WON: 'WON',
  LOST: 'LOST'
} as const

const QuotationStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED'
} as const

const OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
} as const

const InvoiceStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  PAID: 'PAID',
  PARTIAL: 'PARTIAL',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED'
} as const

const InvoiceType = {
  SALES: 'SALES',
  PURCHASE: 'PURCHASE',
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT'
} as const

const PaymentMethod = {
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CHECK: 'CHECK',
  CREDIT_CARD: 'CREDIT_CARD'
} as const

const ItemType = {
  PRODUCT: 'PRODUCT',
  SERVICE: 'SERVICE',
  ASSEMBLY: 'ASSEMBLY'
} as const

const MovementType = {
  IN: 'IN',
  OUT: 'OUT',
  ADJUSTMENT: 'ADJUSTMENT',
  TRANSFER: 'TRANSFER',
  OPENING: 'OPENING'
} as const

const JournalStatus = {
  DRAFT: 'DRAFT',
  POSTED: 'POSTED',
  CANCELLED: 'CANCELLED'
} as const

async function main(): Promise<void> {
  console.warn('🌱 Starting Comprehensive ERP Seed...\n')

  // Clean existing data
  await cleanDatabase()

  // Step 1: Create users and roles
  console.warn('👥 Step 1: Creating users...')
  const users = await createUsers()
  console.warn('✅ Created users\n')

  // Step 2: Create comprehensive chart of accounts
  console.warn('💰 Step 2: Creating chart of accounts...')
  const accounts = await createComprehensiveChartOfAccounts(users.admin.id)
  console.warn('✅ Created comprehensive chart of accounts\n')

  // Step 3: Create customers with proper AR accounts
  console.warn('🏢 Step 3: Creating customers...')
  const customers = await createCustomersWithAR(users.admin.id, users.sales.id, accounts)
  console.warn('✅ Created customers with AR accounts\n')

  // Step 4: Create leads and demonstrate conversion
  console.warn('📞 Step 4: Creating leads...')
  const leads = await createLeads(users.sales.id)
  console.warn('✅ Created leads\n')

  // Step 5: Create inventory system
  console.warn('📦 Step 5: Creating inventory system...')
  const inventory = await createComprehensiveInventory(users.admin.id, accounts)
  console.warn('✅ Created inventory system\n')

  // Step 6: Create sales cases linked to customers and leads
  console.warn('💼 Step 6: Creating sales cases...')
  const salesCases = await createSalesCases(users.sales.id, customers, leads)
  console.warn('✅ Created sales cases\n')

  // Step 7: Create quotations with multiple versions
  console.warn('📋 Step 7: Creating quotations...')
  const quotations = await createQuotations(users.sales.id, customers, inventory.items, salesCases)
  console.warn('✅ Created quotations\n')

  // Step 8: Create sales orders from quotations
  console.warn('📝 Step 8: Creating sales orders...')
  const salesOrders = await createSalesOrders(users.sales.id, customers, quotations, inventory.items)
  console.warn('✅ Created sales orders\n')

  // Step 9: Create stock movements for inventory
  console.warn('📊 Step 9: Creating stock movements...')
  await createStockMovements(users.warehouse.id, inventory.items, accounts)
  console.warn('✅ Created stock movements\n')

  // Step 10: Create invoices from sales orders
  console.warn('🧾 Step 10: Creating invoices...')
  const invoices = await createInvoices(users.sales.id, customers, salesOrders, inventory.items)
  console.warn('✅ Created invoices\n')

  // Step 11: Create payments for invoices
  console.warn('💳 Step 11: Creating payments...')
  await createPayments(users.accountant.id, invoices, accounts)
  console.warn('✅ Created payments\n')

  // Step 12: Create customer POs
  console.warn('📄 Step 12: Creating customer POs...')
  await createCustomerPOs(users.sales.id, customers, quotations)
  console.warn('✅ Created customer POs\n')

  // Step 13: Create comprehensive GL journal entries  
  console.warn('📚 Step 13: Creating comprehensive GL journal entries...')
  await createComprehensiveJournalEntries(users.accountant.id, accounts, invoices, inventory.items)
  console.warn('✅ Created comprehensive GL journal entries\n')

  // Step 14: Create audit trail examples
  console.warn('🔍 Step 14: Creating audit trail examples...')
  await createAuditExamples(users)
  console.warn('✅ Created audit trail examples\n')

  // Step 15: Create currency and exchange rate data
  console.warn('💱 Step 15: Creating currency data...')
  await createCurrencyData(users.admin.id)
  console.warn('✅ Created currency data\n')

  // Final summary
  await printSeedSummary()
  
  console.warn('🎉 Comprehensive ERP Seed completed successfully!')
  console.warn('\n🚀 Ready to test complete business workflows!')
}

async function cleanDatabase(): Promise<void> {
  console.warn('🧹 Cleaning existing data...')
  
  try {
    await prisma.$connect()
    console.warn('✅ Database connected successfully')
    
    // Clean in correct order to respect foreign key constraints
    // Only clean models that actually exist in the schema
    const cleanupOperations = [
      () => prisma.auditLog.deleteMany(),
      () => prisma.payment.deleteMany(),
      () => prisma.invoiceItem.deleteMany(),
      () => prisma.invoice.deleteMany(),
      () => prisma.salesOrderItem.deleteMany(),
      () => prisma.salesOrder.deleteMany(),
      () => prisma.customerPO.deleteMany(),
      () => prisma.quotationItem.deleteMany(),
      () => prisma.quotation.deleteMany(),
      () => prisma.salesCase.deleteMany(),
      () => prisma.stockLot.deleteMany(),
      () => prisma.stockMovement.deleteMany(),
      () => prisma.journalLine.deleteMany(),
      () => prisma.journalEntry.deleteMany(),
      () => prisma.exchangeRate.deleteMany(),
      () => prisma.item.deleteMany(),
      () => prisma.category.deleteMany(),
      () => prisma.unitOfMeasure.deleteMany(),
      () => prisma.lead.deleteMany(),
      () => prisma.customer.deleteMany(),
      () => prisma.account.deleteMany(),
      () => prisma.user.deleteMany()
    ]
    
    for (const operation of cleanupOperations) {
      try {
        await operation()
      } catch (error) {
        console.warn(`⚠️  Failed to clean a table:`, error.message)
      }
    }
    
    console.warn('✅ Database cleaned')
  } catch (error) {
    console.warn('⚠️  Database cleanup failed:', error)
  }
}

async function createUsers() {
  const hashedPassword = await bcrypt.hash('demo123', 10)

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: hashedPassword,
      role: Role.ADMIN,
      isActive: true
    },
    create: {
      username: 'admin',
      email: 'admin@enxi-erp.com',
      password: hashedPassword,
      role: Role.ADMIN,
      isActive: true
    }
  })

  const sales = await prisma.user.upsert({
    where: { username: 'sarah' },
    update: {
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    },
    create: {
      username: 'sarah',
      email: 'sarah@enxi-erp.com',
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    }
  })

  const accountant = await prisma.user.upsert({
    where: { username: 'michael' },
    update: {
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    },
    create: {
      username: 'michael',
      email: 'michael@enxi-erp.com',
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    }
  })

  const warehouse = await prisma.user.upsert({
    where: { username: 'david' },
    update: {
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    },
    create: {
      username: 'david',
      email: 'david@enxi-erp.com',
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    }
  })

  const manager = await prisma.user.upsert({
    where: { username: 'lisa' },
    update: {
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    },
    create: {
      username: 'lisa',
      email: 'lisa@enxi-erp.com',
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    }
  })

  return { admin, sales, accountant, warehouse, manager }
}

async function createComprehensiveChartOfAccounts(userId: string) {
  // 1000s - ASSETS
  const cash = await prisma.account.create({
    data: {
      code: '1000',
      name: 'Cash and Cash Equivalents',
      type: AccountType.ASSET,
      description: 'Cash, checking, and savings accounts',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const bank = await prisma.account.create({
    data: {
      code: '1010',
      name: 'Bank - Operating Account',
      type: AccountType.ASSET,
      description: 'Main business checking account',
      parentId: cash.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const pettyCash = await prisma.account.create({
    data: {
      code: '1020',
      name: 'Petty Cash',
      type: AccountType.ASSET,
      description: 'Small cash fund for miscellaneous expenses',
      parentId: cash.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const accountsReceivable = await prisma.account.create({
    data: {
      code: '1200',
      name: 'Accounts Receivable',
      type: AccountType.ASSET,
      description: 'Customer receivables parent account',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const inventory = await prisma.account.create({
    data: {
      code: '1300',
      name: 'Inventory',
      type: AccountType.ASSET,
      description: 'Inventory assets',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const prepaidExpenses = await prisma.account.create({
    data: {
      code: '1400',
      name: 'Prepaid Expenses',
      type: AccountType.ASSET,
      description: 'Prepaid insurance, rent, etc.',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const fixedAssets = await prisma.account.create({
    data: {
      code: '1500',
      name: 'Property, Plant & Equipment',
      type: AccountType.ASSET,
      description: 'Fixed assets',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  // 2000s - LIABILITIES
  const accountsPayable = await prisma.account.create({
    data: {
      code: '2000',
      name: 'Accounts Payable',
      type: AccountType.LIABILITY,
      description: 'Vendor payables',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const salesTaxPayable = await prisma.account.create({
    data: {
      code: '2200',
      name: 'Sales Tax Payable',
      type: AccountType.LIABILITY,
      description: 'Sales tax collected from customers',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const accruedLiabilities = await prisma.account.create({
    data: {
      code: '2300',
      name: 'Accrued Liabilities',
      type: AccountType.LIABILITY,
      description: 'Wages, utilities, and other accrued expenses',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const shortTermDebt = await prisma.account.create({
    data: {
      code: '2400',
      name: 'Short-term Debt',
      type: AccountType.LIABILITY,
      description: 'Notes payable due within one year',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  // 3000s - EQUITY
  const capitalStock = await prisma.account.create({
    data: {
      code: '3000',
      name: 'Capital Stock',
      type: AccountType.EQUITY,
      description: 'Common stock',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const retainedEarnings = await prisma.account.create({
    data: {
      code: '3100',
      name: 'Retained Earnings',
      type: AccountType.EQUITY,
      description: 'Accumulated earnings',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const ownerDrawings = await prisma.account.create({
    data: {
      code: '3200',
      name: 'Owner Drawings',
      type: AccountType.EQUITY,
      description: 'Owner withdrawals',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  // 4000s - INCOME
  const salesRevenue = await prisma.account.create({
    data: {
      code: '4000',
      name: 'Sales Revenue',
      type: AccountType.REVENUE,
      description: 'Revenue from product sales',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const serviceRevenue = await prisma.account.create({
    data: {
      code: '4100',
      name: 'Service Revenue',
      type: AccountType.REVENUE,
      description: 'Revenue from services',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const otherIncome = await prisma.account.create({
    data: {
      code: '4900',
      name: 'Other Income',
      type: AccountType.REVENUE,
      description: 'Miscellaneous income',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  // 5000s - EXPENSES
  const cogs = await prisma.account.create({
    data: {
      code: '5000',
      name: 'Cost of Goods Sold',
      type: AccountType.EXPENSE,
      description: 'Direct cost of goods sold',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const salariesExpense = await prisma.account.create({
    data: {
      code: '5100',
      name: 'Salaries and Wages',
      type: AccountType.EXPENSE,
      description: 'Employee compensation',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const rentExpense = await prisma.account.create({
    data: {
      code: '5200',
      name: 'Rent Expense',
      type: AccountType.EXPENSE,
      description: 'Office and warehouse rent',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const utilitiesExpense = await prisma.account.create({
    data: {
      code: '5300',
      name: 'Utilities Expense',
      type: AccountType.EXPENSE,
      description: 'Electric, water, gas, internet',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const advertisingExpense = await prisma.account.create({
    data: {
      code: '5400',
      name: 'Advertising and Marketing',
      type: AccountType.EXPENSE,
      description: 'Marketing and promotional expenses',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const officeExpense = await prisma.account.create({
    data: {
      code: '5500',
      name: 'Office Expenses',
      type: AccountType.EXPENSE,
      description: 'Office supplies and miscellaneous',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const travelExpense = await prisma.account.create({
    data: {
      code: '5600',
      name: 'Travel and Entertainment',
      type: AccountType.EXPENSE,
      description: 'Business travel and client entertainment',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const professionalFees = await prisma.account.create({
    data: {
      code: '5700',
      name: 'Professional Fees',
      type: AccountType.EXPENSE,
      description: 'Legal, accounting, consulting fees',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  return {
    // Assets
    cash, bank, pettyCash, accountsReceivable, inventory, prepaidExpenses, fixedAssets,
    // Liabilities  
    accountsPayable, salesTaxPayable, accruedLiabilities, shortTermDebt,
    // Equity
    capitalStock, retainedEarnings, ownerDrawings,
    // Income
    salesRevenue, serviceRevenue, otherIncome,
    // Expenses
    cogs, salariesExpense, rentExpense, utilitiesExpense, 
    advertisingExpense, officeExpense, travelExpense, professionalFees
  }
}

async function createCustomersWithAR(adminId: string, salesId: string, accounts: any) {
  // Create customers with dedicated AR accounts
  const techCorp = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-0001',
      name: 'TechCorp Solutions Inc',
      email: 'accounts@techcorp.com',
      phone: '+1 (555) 123-4567',
      website: 'https://techcorp.com',
      industry: 'Technology',
      creditLimit: 100000,
      paymentTerms: 30,
      currency: 'USD',
      createdBy: adminId,
      // Create dedicated AR account
      account: {
        create: {
          code: '1200-001',
          name: 'AR - TechCorp Solutions Inc',
          type: AccountType.ASSET,
          parentId: accounts.accountsReceivable.id,
          currency: 'USD',
          description: 'Accounts Receivable for TechCorp Solutions',
          status: 'ACTIVE',
          createdBy: adminId
        }
      }
    },
    include: { account: true }
  })

  const globalRetail = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-0002',
      name: 'Global Retail Networks',
      email: 'purchasing@globalretail.com',
      phone: '+1 (555) 987-6543',
      website: 'https://globalretail.com',
      industry: 'Retail',
      creditLimit: 250000,
      paymentTerms: 45,
      currency: 'USD',
      createdBy: salesId,
      account: {
        create: {
          code: '1200-002',
          name: 'AR - Global Retail Networks',
          type: AccountType.ASSET,
          parentId: accounts.accountsReceivable.id,
          currency: 'USD',
          description: 'Accounts Receivable for Global Retail Networks',
          status: 'ACTIVE',
          createdBy: salesId
        }
      }
    },
    include: { account: true }
  })

  const manufacturingCo = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-0003',
      name: 'Advanced Manufacturing Ltd',
      email: 'orders@advancedmanuf.com',
      phone: '+1 (555) 456-7890',
      industry: 'Manufacturing',
      creditLimit: 150000,
      paymentTerms: 60,
      currency: 'USD',
      createdBy: salesId,
      account: {
        create: {
          code: '1200-003',
          name: 'AR - Advanced Manufacturing Ltd',
          type: AccountType.ASSET,
          parentId: accounts.accountsReceivable.id,
          currency: 'USD',
          description: 'Accounts Receivable for Advanced Manufacturing Ltd',
          status: 'ACTIVE',
          createdBy: salesId
        }
      }
    },
    include: { account: true }
  })

  const healthcarePlus = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-0004',
      name: 'HealthCare Plus Systems',
      email: 'procurement@healthcareplus.com',
      phone: '+1 (555) 789-0123',
      industry: 'Healthcare',
      creditLimit: 200000,
      paymentTerms: 30,
      currency: 'USD',
      createdBy: salesId,
      account: {
        create: {
          code: '1200-004',
          name: 'AR - HealthCare Plus Systems',
          type: AccountType.ASSET,
          parentId: accounts.accountsReceivable.id,
          currency: 'USD',
          description: 'Accounts Receivable for HealthCare Plus Systems',
          status: 'ACTIVE',
          createdBy: salesId
        }
      }
    },
    include: { account: true }
  })

  return { techCorp, globalRetail, manufacturingCo, healthcarePlus }
}

async function createLeads(salesId: string) {
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        company: 'StartupTech Innovations',
        email: 'john.doe@startuptech.com',
        phone: '+1 (555) 111-2222',
        source: 'WEBSITE',
        status: LeadStatus.NEW,
        notes: 'Interested in enterprise software solution. Has budget approved.',
        createdBy: salesId
      }
    }),
    prisma.lead.create({
      data: {
        firstName: 'Jane',
        lastName: 'Smith',
        company: 'Education Excellence Corp',
        email: 'jane.smith@eduexcellence.com',
        phone: '+1 (555) 333-4444',
        source: 'TRADE_SHOW',
        status: LeadStatus.CONTACTED,
        notes: 'Met at EdTech Expo 2024. Very interested in our learning management system.',
        createdBy: salesId
      }
    }),
    prisma.lead.create({
      data: {
        firstName: 'Robert',
        lastName: 'Johnson',
        company: 'Financial Services Group',
        email: 'robert.johnson@finservices.com',
        phone: '+1 (555) 555-6666',
        source: 'REFERRAL',
        status: LeadStatus.QUALIFIED,
        notes: 'Referred by TechCorp Solutions. Looking for comprehensive financial management system.',
        createdBy: salesId
      }
    }),
    prisma.lead.create({
      data: {
        firstName: 'Maria',
        lastName: 'Garcia',
        company: 'Green Energy Solutions',
        email: 'maria.garcia@greenenergy.com',
        phone: '+1 (555) 777-8888',
        source: 'COLD_CALL',
        status: LeadStatus.PROPOSAL,
        notes: 'Proposal sent for inventory management system. Awaiting decision.',
        createdBy: salesId
      }
    })
  ])

  return leads
}

async function createComprehensiveInventory(userId: string, accounts: any) {
  // Units of Measure
  const pieces = await prisma.unitOfMeasure.create({
    data: { code: 'PCS', name: 'Pieces', symbol: 'pcs', isBaseUnit: true, createdBy: userId }
  })

  const dozen = await prisma.unitOfMeasure.create({
    data: { 
      code: 'DOZ', name: 'Dozen', symbol: 'dz', isBaseUnit: false, 
      baseUnitId: pieces.id, conversionFactor: 12, createdBy: userId 
    }
  })

  const kg = await prisma.unitOfMeasure.create({
    data: { code: 'KG', name: 'Kilogram', symbol: 'kg', isBaseUnit: true, createdBy: userId }
  })

  const hours = await prisma.unitOfMeasure.create({
    data: { code: 'HR', name: 'Hours', symbol: 'hr', isBaseUnit: true, createdBy: userId }
  })

  // Categories with hierarchy
  const electronics = await prisma.category.create({
    data: {
      code: 'ELEC',
      name: 'Electronics',
      description: 'Electronic products and components',
      createdBy: userId
    }
  })

  const computers = await prisma.category.create({
    data: {
      code: 'COMP',
      name: 'Computers & Laptops',
      description: 'Desktop computers, laptops, and workstations',
      parentId: electronics.id,
      createdBy: userId
    }
  })

  const accessories = await prisma.category.create({
    data: {
      code: 'ACC',
      name: 'Computer Accessories',
      description: 'Keyboards, mice, monitors, and peripherals',
      parentId: electronics.id,
      createdBy: userId
    }
  })

  const software = await prisma.category.create({
    data: {
      code: 'SOFT',
      name: 'Software & Licenses',
      description: 'Software applications and licenses',
      createdBy: userId
    }
  })

  const services = await prisma.category.create({
    data: {
      code: 'SRV',
      name: 'Professional Services',
      description: 'Consulting, training, and support services',
      createdBy: userId
    }
  })

  const office = await prisma.category.create({
    data: {
      code: 'OFFICE',
      name: 'Office Supplies',
      description: 'Stationery, paper, and office equipment',
      createdBy: userId
    }
  })

  // Comprehensive item catalog
  const items = await Promise.all([
    // High-end laptops
    prisma.item.create({
      data: {
        code: 'LAP-PRO-15',
        name: 'Professional Laptop 15" - Intel i7',
        description: 'High-performance business laptop: Intel i7, 16GB RAM, 512GB SSD, 15.6" 4K display',
        categoryId: computers.id,
        type: ItemType.PRODUCT,
        unitOfMeasureId: pieces.id,
        trackInventory: true,
        minStockLevel: 5,
        maxStockLevel: 50,
        reorderPoint: 10,
        standardCost: 1200.00,
        listPrice: 1899.99,
        inventoryAccountId: accounts.inventory.id,
        cogsAccountId: accounts.cogs.id,
        salesAccountId: accounts.salesRevenue.id,
        isSaleable: true,
        isPurchaseable: true,
        createdBy: userId
      }
    }),

    // Business laptops
    prisma.item.create({
      data: {
        code: 'LAP-BUS-14',
        name: 'Business Laptop 14" - Intel i5',
        description: 'Standard business laptop: Intel i5, 8GB RAM, 256GB SSD, 14" FHD display',
        categoryId: computers.id,
        type: ItemType.PRODUCT,
        unitOfMeasureId: pieces.id,
        trackInventory: true,
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderPoint: 20,
        standardCost: 800.00,
        listPrice: 1299.99,
        inventoryAccountId: accounts.inventory.id,
        cogsAccountId: accounts.cogs.id,
        salesAccountId: accounts.salesRevenue.id,
        isSaleable: true,
        isPurchaseable: true,
        createdBy: userId
      }
    }),

    // Desktop computers
    prisma.item.create({
      data: {
        code: 'DT-WORK-01',
        name: 'Workstation Desktop - High Performance',
        description: 'Professional workstation: Intel Xeon, 32GB RAM, 1TB NVMe SSD, Nvidia RTX',
        categoryId: computers.id,
        type: ItemType.PRODUCT,
        unitOfMeasureId: pieces.id,
        trackInventory: true,
        minStockLevel: 3,
        maxStockLevel: 25,
        reorderPoint: 5,
        standardCost: 2500.00,
        listPrice: 3999.99,
        inventoryAccountId: accounts.inventory.id,
        cogsAccountId: accounts.cogs.id,
        salesAccountId: accounts.salesRevenue.id,
        isSaleable: true,
        isPurchaseable: true,
        createdBy: userId
      }
    }),

    // Monitors
    prisma.item.create({
      data: {
        code: 'MON-27-4K',
        name: '27" 4K Professional Monitor',
        description: '27-inch 4K UHD monitor with USB-C dock, height adjustable',
        categoryId: accessories.id,
        type: ItemType.PRODUCT,
        unitOfMeasureId: pieces.id,
        trackInventory: true,
        minStockLevel: 15,
        maxStockLevel: 100,
        reorderPoint: 25,
        standardCost: 350.00,
        listPrice: 599.99,
        inventoryAccountId: accounts.inventory.id,
        cogsAccountId: accounts.cogs.id,
        salesAccountId: accounts.salesRevenue.id,
        isSaleable: true,
        isPurchaseable: true,
        createdBy: userId
      }
    }),

    // Peripherals
    prisma.item.create({
      data: {
        code: 'KBD-MECH-01',
        name: 'Mechanical Keyboard - RGB Backlit',
        description: 'Professional mechanical keyboard with RGB backlighting and programmable keys',
        categoryId: accessories.id,
        type: ItemType.PRODUCT,
        unitOfMeasureId: pieces.id,
        trackInventory: true,
        minStockLevel: 25,
        maxStockLevel: 200,
        reorderPoint: 50,
        standardCost: 75.00,
        listPrice: 149.99,
        inventoryAccountId: accounts.inventory.id,
        cogsAccountId: accounts.cogs.id,
        salesAccountId: accounts.salesRevenue.id,
        isSaleable: true,
        isPurchaseable: true,
        createdBy: userId
      }
    }),

    prisma.item.create({
      data: {
        code: 'MSE-PRO-01',
        name: 'Professional Wireless Mouse',
        description: 'Ergonomic wireless mouse with precision tracking and 30-day battery life',
        categoryId: accessories.id,
        type: ItemType.PRODUCT,
        unitOfMeasureId: pieces.id,
        trackInventory: true,
        minStockLevel: 50,
        maxStockLevel: 500,
        reorderPoint: 100,
        standardCost: 25.00,
        listPrice: 59.99,
        inventoryAccountId: accounts.inventory.id,
        cogsAccountId: accounts.cogs.id,
        salesAccountId: accounts.salesRevenue.id,
        isSaleable: true,
        isPurchaseable: true,
        createdBy: userId
      }
    }),

    // Software licenses
    prisma.item.create({
      data: {
        code: 'SW-OFFICE-365',
        name: 'Microsoft Office 365 Business Premium',
        description: 'Annual subscription to Office 365 Business Premium per user',
        categoryId: software.id,
        type: ItemType.PRODUCT,
        unitOfMeasureId: pieces.id,
        trackInventory: false,
        standardCost: 180.00,
        listPrice: 264.00,
        salesAccountId: accounts.salesRevenue.id,
        isSaleable: true,
        isPurchaseable: true,
        createdBy: userId
      }
    }),

    prisma.item.create({
      data: {
        code: 'SW-ANTIVIRUS-ENT',
        name: 'Enterprise Antivirus Solution',
        description: 'Enterprise antivirus and security suite - annual license per device',
        categoryId: software.id,
        type: ItemType.PRODUCT,
        unitOfMeasureId: pieces.id,
        trackInventory: false,
        standardCost: 45.00,
        listPrice: 89.99,
        salesAccountId: accounts.salesRevenue.id,
        isSaleable: true,
        isPurchaseable: true,
        createdBy: userId
      }
    }),

    // Services
    prisma.item.create({
      data: {
        code: 'SRV-SETUP',
        name: 'Computer Setup and Configuration',
        description: 'Professional setup and configuration service per device',
        categoryId: services.id,
        type: ItemType.SERVICE,
        unitOfMeasureId: pieces.id,
        trackInventory: false,
        standardCost: 75.00,
        listPrice: 149.99,
        salesAccountId: accounts.serviceRevenue.id,
        isSaleable: true,
        isPurchaseable: false,
        createdBy: userId
      }
    }),

    prisma.item.create({
      data: {
        code: 'SRV-SUPPORT',
        name: 'Technical Support (Hourly)',
        description: 'Professional technical support and troubleshooting service',
        categoryId: services.id,
        type: ItemType.SERVICE,
        unitOfMeasureId: hours.id,
        trackInventory: false,
        standardCost: 60.00,
        listPrice: 125.00,
        salesAccountId: accounts.serviceRevenue.id,
        isSaleable: true,
        isPurchaseable: false,
        createdBy: userId
      }
    }),

    prisma.item.create({
      data: {
        code: 'SRV-TRAINING',
        name: 'User Training Session',
        description: 'Comprehensive user training session (8 hours)',
        categoryId: services.id,
        type: ItemType.SERVICE,
        unitOfMeasureId: pieces.id,
        trackInventory: false,
        standardCost: 400.00,
        listPrice: 800.00,
        salesAccountId: accounts.serviceRevenue.id,
        isSaleable: true,
        isPurchaseable: false,
        createdBy: userId
      }
    }),

    // Office supplies
    prisma.item.create({
      data: {
        code: 'OFF-PAPER-A4',
        name: 'Premium A4 Paper (500 sheets)',
        description: 'High-quality 80gsm A4 paper, 500 sheets per ream',
        categoryId: office.id,
        type: ItemType.PRODUCT,
        unitOfMeasureId: pieces.id,
        trackInventory: true,
        minStockLevel: 100,
        maxStockLevel: 1000,
        reorderPoint: 200,
        standardCost: 4.50,
        listPrice: 8.99,
        inventoryAccountId: accounts.inventory.id,
        cogsAccountId: accounts.cogs.id,
        salesAccountId: accounts.salesRevenue.id,
        isSaleable: true,
        isPurchaseable: true,
        createdBy: userId
      }
    })
  ])

  return {
    units: { pieces, dozen, kg, hours },
    categories: { electronics, computers, accessories, software, services, office },
    items: {
      laptopPro: items[0],
      laptopBusiness: items[1], 
      desktop: items[2],
      monitor: items[3],
      keyboard: items[4],
      mouse: items[5],
      office365: items[6],
      antivirus: items[7],
      setup: items[8],
      support: items[9],
      training: items[10],
      paper: items[11]
    }
  }
}

async function createSalesCases(salesId: string, customers: any, leads: any) {
  const salesCases = await Promise.all([
    // Case from existing customer
    prisma.salesCase.create({
      data: {
        caseNumber: 'SC-2024-001',
        title: 'TechCorp Office Modernization Project',
        description: 'Complete office technology upgrade including laptops, workstations, and software licenses',
        customerId: customers.techCorp.id,
        estimatedValue: 125000,
        actualValue: 0,
        cost: 0,
        profitMargin: 0,
        status: SalesCaseStatus.OPEN,
        assignedTo: salesId,
        createdBy: salesId
      }
    }),

    // Case from lead conversion
    prisma.salesCase.create({
      data: {
        caseNumber: 'SC-2024-002',
        title: 'Healthcare Technology Infrastructure',
        description: 'New healthcare system implementation with workstations and specialized software',
        customerId: customers.healthcarePlus.id,
        estimatedValue: 200000,
        actualValue: 0,
        cost: 0,
        profitMargin: 0,
        status: SalesCaseStatus.OPEN,
        assignedTo: salesId,
        createdBy: salesId
      }
    }),

    // Manufacturing case
    prisma.salesCase.create({
      data: {
        caseNumber: 'SC-2024-003',
        title: 'Manufacturing Plant IT Upgrade',
        description: 'Industrial workstations and monitoring systems for manufacturing floor',
        customerId: customers.manufacturingCo.id,
        estimatedValue: 150000,
        actualValue: 0,
        cost: 0,
        profitMargin: 0,
        status: SalesCaseStatus.OPEN,
        assignedTo: salesId,
        createdBy: salesId
      }
    })
  ])

  return salesCases
}

async function createQuotations(salesId: string, customers: any, items: any, salesCases: any) {
  // Major quotation for TechCorp
  const quotation1 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2024-001',
      salesCaseId: salesCases[0].id,
      validUntil: new Date('2024-02-29'),
      status: QuotationStatus.SENT,
      notes: 'Volume discount applied for quantities over 20 units',
      paymentTerms: 'Net 30',
      deliveryTerms: 'FOB Origin',
      createdBy: salesId,
      items: {
        create: [
          {
            itemCode: items.laptopPro.code,
            description: 'Professional Laptop 15" - Executive Configuration',
            quantity: 25,
            unitPrice: 1750.00,
            discount: 7.8,
            taxRate: 8.5,
            sortOrder: 1,
            item: {
              connect: { id: items.laptopPro.id }
            }
          },
          {
            itemCode: items.desktop.code,
            description: 'Workstation Desktop - Engineering Stations',
            quantity: 10,
            unitPrice: 3800.00,
            discount: 5.0,
            taxRate: 8.5,
            sortOrder: 2,
            item: {
              connect: { id: items.desktop.id }
            }
          },
          {
            itemCode: items.monitor.code,
            description: '27" 4K Monitor - Dual setup per workstation',
            quantity: 20,
            unitPrice: 550.00,
            discount: 8.0,
            taxRate: 8.5,
            sortOrder: 3,
            item: {
              connect: { id: items.monitor.id }
            }
          },
          {
            itemCode: items.office365.code,
            description: 'Office 365 Business Premium - Annual licenses',
            quantity: 35,
            unitPrice: 264.00,
            discount: 15.0,
            taxRate: 0,
            sortOrder: 4,
            item: {
              connect: { id: items.office365.id }
            }
          },
          {
            itemCode: items.setup.code,
            description: 'Professional setup and configuration',
            quantity: 35,
            unitPrice: 149.99,
            discount: 0,
            taxRate: 8.5,
            sortOrder: 5,
            item: {
              connect: { id: items.setup.id }
            }
          }
        ]
      }
    }
  })

  // Healthcare quotation
  const quotation2 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2024-002',
      salesCaseId: salesCases[1].id,
      validUntil: new Date('2024-03-20'),
      status: QuotationStatus.SENT,
      notes: 'Healthcare compliance configuration included',
      paymentTerms: 'Net 30',
      deliveryTerms: 'Delivered and Installed',
      createdBy: salesId,
      items: {
        create: [
          {
            itemCode: items.desktop.code,
            description: 'Medical Workstation - HIPAA Compliant',
            quantity: 15,
            unitPrice: 4200.00,
            discount: 3.0,
            taxRate: 8.5,
            sortOrder: 1,
            item: {
              connect: { id: items.desktop.id }
            }
          },
          {
            itemCode: items.laptopBusiness.code,
            description: 'Mobile Carts Laptop Configuration',
            quantity: 8,
            unitPrice: 1400.00,
            discount: 5.0,
            taxRate: 8.5,
            sortOrder: 2,
            item: {
              connect: { id: items.laptopBusiness.id }
            }
          },
          {
            itemCode: items.antivirus.code,
            description: 'Enterprise Security Suite - Healthcare Edition',
            quantity: 23,
            unitPrice: 120.00,
            discount: 10.0,
            taxRate: 0,
            sortOrder: 3,
            item: {
              connect: { id: items.antivirus.id }
            }
          },
          {
            itemCode: items.training.code,
            description: 'HIPAA Compliance Training - 2 sessions',
            quantity: 2,
            unitPrice: 800.00,
            discount: 0,
            taxRate: 0,
            sortOrder: 4,
            item: {
              connect: { id: items.training.id }
            }
          }
        ]
      }
    }
  })

  return [quotation1, quotation2]
}

async function createSalesOrders(salesId: string, customers: any, quotations: any, items: any) {
  // Sales order from first quotation
  const salesOrder1 = await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-2024-001',
      quotationId: quotations[0].id,
      salesCaseId: quotations[0].salesCaseId,
      orderDate: new Date('2024-02-01'),
      requestedDate: new Date('2024-02-29'),
      paymentTerms: 'Net 30',
      billingAddress: 'TechCorp Solutions Inc\\n123 Technology Blvd\\nSan Francisco, CA 94105',
      shippingAddress: 'TechCorp Solutions Inc\\n123 Technology Blvd\\nSan Francisco, CA 94105',
      status: OrderStatus.CONFIRMED,
      notes: 'Rush delivery requested for executive laptops',
      approvedBy: salesId,
      approvedAt: new Date('2024-02-01'),
      createdBy: salesId
    }
  })

  // Create order items
  await Promise.all([
    prisma.salesOrderItem.create({
      data: {
        salesOrderId: salesOrder1.id,
        itemId: items.laptopPro.id,
        itemCode: items.laptopPro.code,
        description: 'Professional Laptop 15" - Executive Configuration',
        quantity: 25,
        unitPrice: 1750.00,
        discount: 7.8,
        taxRate: 8.5,
        sortOrder: 1
      }
    }),
    prisma.salesOrderItem.create({
      data: {
        salesOrderId: salesOrder1.id,
        itemId: items.desktop.id,
        itemCode: items.desktop.code,
        description: 'Workstation Desktop - Engineering Stations',
        quantity: 10,
        unitPrice: 3800.00,
        discount: 5.0,
        taxRate: 8.5,
        sortOrder: 2
      }
    }),
    prisma.salesOrderItem.create({
      data: {
        salesOrderId: salesOrder1.id,
        itemId: items.setup.id,
        itemCode: items.setup.code,
        description: 'Professional setup and configuration',
        quantity: 35,
        unitPrice: 149.99,
        discount: 0,
        taxRate: 8.5,
        sortOrder: 3
      }
    })
  ])

  return [salesOrder1]
}

async function createStockMovements(warehouseId: string, items: any, accounts: any) {
  const movements = []

  // Create stock lot first for laptops
  const laptopProLot = await prisma.stockLot.create({
    data: {
      lotNumber: 'LOT-LAP-PRO-001',
      itemId: items.laptopPro.id,
      receivedDate: new Date('2024-01-01'),
      receivedQty: 50,
      availableQty: 50,
      unitCost: 1200.00,
      totalCost: 60000.00,
      createdBy: warehouseId
    }
  })

  // Opening stock for laptops
  movements.push(await prisma.stockMovement.create({
    data: {
      movementNumber: 'OPEN-2024-001',
      itemId: items.laptopPro.id,
      movementType: MovementType.OPENING,
      movementDate: new Date('2024-01-01'),
      quantity: 50,
      unitCost: 1200.00,
      totalCost: 60000.00,
      unitOfMeasureId: items.laptopPro.unitOfMeasureId,
      stockLotId: laptopProLot.id,
      notes: 'Opening inventory balance - Professional Laptops',
      createdBy: warehouseId
    }
  }))

  // Create stock lot for business laptops
  const laptopBusinessLot = await prisma.stockLot.create({
    data: {
      lotNumber: 'LOT-LAP-BUS-001',
      itemId: items.laptopBusiness.id,
      receivedDate: new Date('2024-01-01'),
      receivedQty: 75,
      availableQty: 75,
      unitCost: 800.00,
      totalCost: 60000.00,
      createdBy: warehouseId
    }
  })

  // Opening stock for business laptops
  movements.push(await prisma.stockMovement.create({
    data: {
      movementNumber: 'OPEN-2024-002',
      itemId: items.laptopBusiness.id,
      movementType: MovementType.OPENING,
      movementDate: new Date('2024-01-01'),
      quantity: 75,
      unitCost: 800.00,
      totalCost: 60000.00,
      unitOfMeasureId: items.laptopBusiness.unitOfMeasureId,
      stockLotId: laptopBusinessLot.id,
      notes: 'Opening inventory balance - Business Laptops',
      createdBy: warehouseId
    }
  }))

  // Create stock lot for desktops
  const desktopLot = await prisma.stockLot.create({
    data: {
      lotNumber: 'LOT-DT-WORK-001',
      itemId: items.desktop.id,
      receivedDate: new Date('2024-01-01'),
      receivedQty: 20,
      availableQty: 20,
      unitCost: 2500.00,
      totalCost: 50000.00,
      createdBy: warehouseId
    }
  })

  // Opening stock for desktops
  movements.push(await prisma.stockMovement.create({
    data: {
      movementNumber: 'OPEN-2024-003',
      itemId: items.desktop.id,
      movementType: MovementType.OPENING,
      movementDate: new Date('2024-01-01'),
      quantity: 20,
      unitCost: 2500.00,
      totalCost: 50000.00,
      unitOfMeasureId: items.desktop.unitOfMeasureId,
      stockLotId: desktopLot.id,
      notes: 'Opening inventory balance - Workstation Desktops',
      createdBy: warehouseId
    }
  }))

  // Create stock lot for monitors
  const monitorLot = await prisma.stockLot.create({
    data: {
      lotNumber: 'LOT-MON-27-001',
      itemId: items.monitor.id,
      receivedDate: new Date('2024-01-10'),
      receivedQty: 100,
      availableQty: 100,
      unitCost: 350.00,
      totalCost: 35000.00,
      supplierName: 'Display Tech Solutions',
      createdBy: warehouseId
    }
  })

  // Stock in for monitors
  movements.push(await prisma.stockMovement.create({
    data: {
      movementNumber: 'SIN-2024-001',
      itemId: items.monitor.id,
      movementType: MovementType.IN,
      movementDate: new Date('2024-01-10'),
      quantity: 100,
      unitCost: 350.00,
      totalCost: 35000.00,
      unitOfMeasureId: items.monitor.unitOfMeasureId,
      stockLotId: monitorLot.id,
      referenceType: 'PURCHASE',
      referenceNumber: 'PO-2024-001',
      notes: 'Monthly monitor inventory replenishment',
      createdBy: warehouseId
    }
  }))

  // Create stock lot for keyboards
  const keyboardLot = await prisma.stockLot.create({
    data: {
      lotNumber: 'LOT-KBD-MECH-001',
      itemId: items.keyboard.id,
      receivedDate: new Date('2024-01-15'),
      receivedQty: 200,
      availableQty: 200,
      unitCost: 75.00,
      totalCost: 15000.00,
      supplierName: 'Peripheral Plus Inc',
      createdBy: warehouseId
    }
  })

  // Stock in for peripherals
  movements.push(await prisma.stockMovement.create({
    data: {
      movementNumber: 'SIN-2024-002',
      itemId: items.keyboard.id,
      movementType: MovementType.IN,
      movementDate: new Date('2024-01-15'),
      quantity: 200,
      unitCost: 75.00,
      totalCost: 15000.00,
      unitOfMeasureId: items.keyboard.unitOfMeasureId,
      stockLotId: keyboardLot.id,
      referenceType: 'PURCHASE',
      referenceNumber: 'PO-2024-002',
      notes: 'Keyboard inventory for Q1 orders',
      createdBy: warehouseId
    }
  }))

  // Stock out for sales order fulfillment
  movements.push(await prisma.stockMovement.create({
    data: {
      movementNumber: 'SOUT-2024-001',
      itemId: items.laptopPro.id,
      movementType: MovementType.OUT,
      movementDate: new Date('2024-02-05'),
      quantity: -10,
      unitCost: 1200.00,
      totalCost: -12000.00,
      unitOfMeasureId: items.laptopPro.unitOfMeasureId,
      stockLotId: laptopProLot.id,
      referenceType: 'SALE',
      referenceNumber: 'SO-2024-001',
      notes: 'Partial fulfillment for TechCorp order SO-2024-001',
      createdBy: warehouseId
    }
  }))

  // Update lot availability
  await prisma.stockLot.updateMany({
    where: {
      itemId: items.laptopPro.id,
      lotNumber: 'LOT-LAP-PRO-001'
    },
    data: {
      availableQty: 40
    }
  })

  return movements
}

async function createInvoices(salesId: string, customers: any, salesOrders: any, items: any) {
  // Create invoice from sales order
  const invoice1 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2024-001',
      salesOrderId: salesOrders[0].id,
      customerId: customers.techCorp.id,
      type: InvoiceType.SALES,
      status: InvoiceStatus.SENT,
      invoiceDate: new Date('2024-02-10'),
      dueDate: new Date('2024-03-12'), // 30 days
      subtotal: 70000.00,
      taxAmount: 5950.00,
      discountAmount: 2800.00,
      totalAmount: 73150.00,
      balanceAmount: 73150.00,
      paidAmount: 0,
      paymentTerms: 'Net 30',
      billingAddress: 'TechCorp Solutions Inc\\n123 Technology Blvd\\nSan Francisco, CA 94105',
      notes: 'Thank you for your business. Please remit payment within 30 days.',
      sentBy: salesId,
      sentAt: new Date('2024-02-10'),
      createdBy: salesId
    }
  })

  // Create invoice items
  await Promise.all([
    prisma.invoiceItem.create({
      data: {
        invoiceId: invoice1.id,
        itemId: items.laptopPro.id,
        itemCode: items.laptopPro.code,
        description: 'Professional Laptop 15" - Executive Configuration',
        quantity: 25,
        unitPrice: 1750.00,
        discount: 7.8,
        taxRate: 8.5,
        subtotal: 43750.00,
        discountAmount: 3412.50,
        taxAmount: 3428.69,
        totalAmount: 43766.19
      }
    }),
    prisma.invoiceItem.create({
      data: {
        invoiceId: invoice1.id,
        itemId: items.desktop.id,
        itemCode: items.desktop.code,
        description: 'Workstation Desktop - Engineering Stations',
        quantity: 10,
        unitPrice: 3800.00,
        discount: 5.0,
        taxRate: 8.5,
        subtotal: 38000.00,
        discountAmount: 1900.00,
        taxAmount: 3068.50,
        totalAmount: 39168.50
      }
    })
  ])

  // Create standalone invoice for services
  const invoice2 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2024-002',
      customerId: customers.healthcarePlus.id,
      type: InvoiceType.SALES,
      status: InvoiceStatus.SENT,
      invoiceDate: new Date('2024-02-15'),
      dueDate: new Date('2024-03-17'), // 30 days
      subtotal: 1600.00,
      taxAmount: 136.00,
      discountAmount: 0,
      totalAmount: 1736.00,
      balanceAmount: 1736.00,
      paidAmount: 0,
      paymentTerms: 'Net 30',
      billingAddress: 'HealthCare Plus Systems\\n456 Medical Center Dr\\nBoston, MA 02115',
      notes: 'Training services as requested. Additional sessions available.',
      sentBy: salesId,
      sentAt: new Date('2024-02-15'),
      createdBy: salesId
    }
  })

  await prisma.invoiceItem.create({
    data: {
      invoiceId: invoice2.id,
      itemId: items.training.id,
      itemCode: items.training.code,
      description: 'HIPAA Compliance Training - 2 sessions',
      quantity: 2,
      unitPrice: 800.00,
      discount: 0,
      taxRate: 8.5,
      subtotal: 1600.00,
      discountAmount: 0,
      taxAmount: 136.00,
      totalAmount: 1736.00
    }
  })

  return [invoice1, invoice2]
}

async function createPayments(accountantId: string, invoices: any, accounts: any) {
  // Partial payment for first invoice
  const payment1 = await prisma.payment.create({
    data: {
      paymentNumber: 'PAY-2024-001',
      invoiceId: invoices[0].id,
      customerId: invoices[0].customerId,
      amount: 35000.00,
      paymentDate: new Date('2024-02-20'),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      reference: 'Wire Transfer #WTR-789123',
      notes: 'Partial payment - balance to follow',
      createdBy: accountantId
    }
  })

  // Update invoice
  await prisma.invoice.update({
    where: { id: invoices[0].id },
    data: {
      paidAmount: 35000.00,
      balanceAmount: 38150.00,
      status: InvoiceStatus.PARTIAL
    }
  })

  // Full payment for second invoice
  const payment2 = await prisma.payment.create({
    data: {
      paymentNumber: 'PAY-2024-002',
      invoiceId: invoices[1].id,
      customerId: invoices[1].customerId,
      amount: 1736.00,
      paymentDate: new Date('2024-02-25'),
      paymentMethod: PaymentMethod.CHECK,
      reference: 'Check #4567',
      notes: 'Payment in full for training services',
      createdBy: accountantId
    }
  })

  // Update invoice
  await prisma.invoice.update({
    where: { id: invoices[1].id },
    data: {
      paidAmount: 1736.00,
      balanceAmount: 0,
      status: InvoiceStatus.PAID,
      paidAt: new Date('2024-02-25')
    }
  })

  return [payment1, payment2]
}

async function createCustomerPOs(salesId: string, customers: any, quotations: any) {
  const customerPO = await prisma.customerPO.create({
    data: {
      poNumber: 'PO-TECH-2024-0156',
      quotationId: quotations[0].id,
      customerId: customers.techCorp.id,
      poDate: new Date('2024-01-30'),
      poAmount: 115000.00,
      currency: 'USD',
      notes: 'Please coordinate delivery with our IT team. Contact: John Smith (555) 123-4567',
      isAccepted: true,
      acceptedBy: salesId,
      acceptedAt: new Date('2024-01-30'),
      createdBy: salesId
    }
  })

  return [customerPO]
}

async function createComprehensiveJournalEntries(accountantId: string, accounts: any, invoices: any, items: any) {
  // Create opening balances
  const openingEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2024-001',
      date: new Date('2024-01-01'),
      description: 'Opening balances for fiscal year 2024',
      reference: 'OPENING-2024',
      currency: 'USD',
      exchangeRate: 1.0,
      status: JournalStatus.POSTED,
      postedAt: new Date('2024-01-01'),
      postedBy: accountantId,
      createdBy: accountantId
    }
  })

  await Promise.all([
    // Cash opening balance
    prisma.journalLine.create({
      data: {
        journalEntryId: openingEntry.id,
        accountId: accounts.bank.id,
        description: 'Opening cash balance',
        debitAmount: 250000.00,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 250000.00,
        baseCreditAmount: 0
      }
    }),
    // Inventory opening balance
    prisma.journalLine.create({
      data: {
        journalEntryId: openingEntry.id,
        accountId: accounts.inventory.id,
        description: 'Opening inventory balance',
        debitAmount: 280000.00,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 280000.00,
        baseCreditAmount: 0
      }
    }),
    // Equipment opening balance
    prisma.journalLine.create({
      data: {
        journalEntryId: openingEntry.id,
        accountId: accounts.fixedAssets.id,
        description: 'Opening equipment balance',
        debitAmount: 150000.00,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 150000.00,
        baseCreditAmount: 0
      }
    }),
    // Capital stock opening
    prisma.journalLine.create({
      data: {
        journalEntryId: openingEntry.id,
        accountId: accounts.capitalStock.id,
        description: 'Opening capital stock',
        debitAmount: 0,
        creditAmount: 500000.00,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 0,
        baseCreditAmount: 500000.00
      }
    }),
    // Retained earnings opening
    prisma.journalLine.create({
      data: {
        journalEntryId: openingEntry.id,
        accountId: accounts.retainedEarnings.id,
        description: 'Opening retained earnings',
        debitAmount: 0,
        creditAmount: 180000.00,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 0,
        baseCreditAmount: 180000.00
      }
    })
  ])

  // Monthly operating expenses
  const expenseEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2024-002',
      date: new Date('2024-01-31'),
      description: 'January operating expenses',
      reference: 'OP-EXP-JAN-2024',
      currency: 'USD',
      exchangeRate: 1.0,
      status: JournalStatus.POSTED,
      postedAt: new Date('2024-01-31'),
      postedBy: accountantId,
      createdBy: accountantId
    }
  })

  await Promise.all([
    // Rent expense
    prisma.journalLine.create({
      data: {
        journalEntryId: expenseEntry.id,
        accountId: accounts.rentExpense.id,
        description: 'Office rent - January 2024',
        debitAmount: 8500.00,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 8500.00,
        baseCreditAmount: 0
      }
    }),
    // Salaries expense  
    prisma.journalLine.create({
      data: {
        journalEntryId: expenseEntry.id,
        accountId: accounts.salariesExpense.id,
        description: 'Salaries - January 2024',
        debitAmount: 45000.00,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 45000.00,
        baseCreditAmount: 0
      }
    }),
    // Utilities
    prisma.journalLine.create({
      data: {
        journalEntryId: expenseEntry.id,
        accountId: accounts.utilitiesExpense.id,
        description: 'Utilities - January 2024',
        debitAmount: 2800.00,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 2800.00,
        baseCreditAmount: 0
      }
    }),
    // Cash payment
    prisma.journalLine.create({
      data: {
        journalEntryId: expenseEntry.id,
        accountId: accounts.bank.id,
        description: 'Cash payments for expenses',
        debitAmount: 0,
        creditAmount: 56300.00,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 0,
        baseCreditAmount: 56300.00
      }
    })
  ])

  // Journal entry for sales revenue recognition (Invoice INV-2024-001)
  const salesRevenueEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2024-003',
      date: new Date('2024-02-10'),
      description: 'Sales revenue recognition - INV-2024-001 TechCorp',
      reference: 'INV-2024-001',
      currency: 'USD',
      exchangeRate: 1.0,
      status: JournalStatus.POSTED,
      postedAt: new Date('2024-02-10'),
      postedBy: accountantId,
      createdBy: accountantId
    }
  })

  await Promise.all([
    // Debit AR for full invoice amount
    prisma.journalLine.create({
      data: {
        journalEntryId: salesRevenueEntry.id,
        accountId: accounts.accountsReceivable.id,
        description: 'AR - TechCorp Solutions - INV-2024-001',
        debitAmount: 73150.00,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 73150.00,
        baseCreditAmount: 0
      }
    }),
    // Credit sales revenue for net amount
    prisma.journalLine.create({
      data: {
        journalEntryId: salesRevenueEntry.id,
        accountId: accounts.salesRevenue.id,
        description: 'Sales revenue - Computer hardware',
        debitAmount: 0,
        creditAmount: 67200.00,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 0,
        baseCreditAmount: 67200.00
      }
    }),
    // Credit sales tax payable
    prisma.journalLine.create({
      data: {
        journalEntryId: salesRevenueEntry.id,
        accountId: accounts.salesTaxPayable.id,
        description: 'Sales tax collected - 8.5%',
        debitAmount: 0,
        creditAmount: 5950.00,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 0,
        baseCreditAmount: 5950.00
      }
    })
  ])

  // Cost of goods sold entry for inventory sold
  const cogsEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2024-004',
      date: new Date('2024-02-10'),
      description: 'Cost of goods sold - INV-2024-001',
      reference: 'INV-2024-001-COGS',
      currency: 'USD',
      exchangeRate: 1.0,
      status: JournalStatus.POSTED,
      postedAt: new Date('2024-02-10'),
      postedBy: accountantId,
      createdBy: accountantId
    }
  })

  await Promise.all([
    // Debit COGS for cost of items sold
    prisma.journalLine.create({
      data: {
        journalEntryId: cogsEntry.id,
        accountId: accounts.cogs.id,
        description: 'COGS - Laptops and desktops sold',
        debitAmount: 55000.00, // 25 laptops @ $1200 + 10 desktops @ $2500
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 55000.00,
        baseCreditAmount: 0
      }
    }),
    // Credit inventory for cost of items sold
    prisma.journalLine.create({
      data: {
        journalEntryId: cogsEntry.id,
        accountId: accounts.inventory.id,
        description: 'Inventory reduction - items sold',
        debitAmount: 0,
        creditAmount: 55000.00,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 0,
        baseCreditAmount: 55000.00
      }
    })
  ])

  // Customer payment entry for first payment
  const paymentEntry1 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2024-005',
      date: new Date('2024-02-20'),
      description: 'Customer payment received - PAY-2024-001',
      reference: 'PAY-2024-001',
      currency: 'USD',
      exchangeRate: 1.0,
      status: JournalStatus.POSTED,
      postedAt: new Date('2024-02-20'),
      postedBy: accountantId,
      createdBy: accountantId
    }
  })

  await Promise.all([
    // Debit cash for payment received
    prisma.journalLine.create({
      data: {
        journalEntryId: paymentEntry1.id,
        accountId: accounts.bank.id,
        description: 'Payment received - Wire transfer',
        debitAmount: 35000.00,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 35000.00,
        baseCreditAmount: 0
      }
    }),
    // Credit AR for payment applied
    prisma.journalLine.create({
      data: {
        journalEntryId: paymentEntry1.id,
        accountId: accounts.accountsReceivable.id,
        description: 'AR payment - TechCorp partial payment',
        debitAmount: 0,
        creditAmount: 35000.00,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 0,
        baseCreditAmount: 35000.00
      }
    })
  ])

  // Service revenue entry for training invoice
  const serviceRevenueEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2024-006',
      date: new Date('2024-02-15'),
      description: 'Service revenue recognition - INV-2024-002',
      reference: 'INV-2024-002',
      currency: 'USD',
      exchangeRate: 1.0,
      status: JournalStatus.POSTED,
      postedAt: new Date('2024-02-15'),
      postedBy: accountantId,
      createdBy: accountantId
    }
  })

  await Promise.all([
    // Debit AR for service invoice
    prisma.journalLine.create({
      data: {
        journalEntryId: serviceRevenueEntry.id,
        accountId: accounts.accountsReceivable.id,
        description: 'AR - HealthCare Plus - Training services',
        debitAmount: 1736.00,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 1736.00,
        baseCreditAmount: 0
      }
    }),
    // Credit service revenue
    prisma.journalLine.create({
      data: {
        journalEntryId: serviceRevenueEntry.id,
        accountId: accounts.serviceRevenue.id,
        description: 'Training service revenue',
        debitAmount: 0,
        creditAmount: 1600.00,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 0,
        baseCreditAmount: 1600.00
      }
    }),
    // Credit sales tax payable
    prisma.journalLine.create({
      data: {
        journalEntryId: serviceRevenueEntry.id,
        accountId: accounts.salesTaxPayable.id,
        description: 'Sales tax on training services',
        debitAmount: 0,
        creditAmount: 136.00,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 0,
        baseCreditAmount: 136.00
      }
    })
  ])

  // Payment for service invoice
  const paymentEntry2 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2024-007',
      date: new Date('2024-02-25'),
      description: 'Customer payment - Training services',
      reference: 'PAY-2024-002',
      currency: 'USD',
      exchangeRate: 1.0,
      status: JournalStatus.POSTED,
      postedAt: new Date('2024-02-25'),
      postedBy: accountantId,
      createdBy: accountantId
    }
  })

  await Promise.all([
    // Debit cash for payment
    prisma.journalLine.create({
      data: {
        journalEntryId: paymentEntry2.id,
        accountId: accounts.bank.id,
        description: 'Payment received - Check #4567',
        debitAmount: 1736.00,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 1736.00,
        baseCreditAmount: 0
      }
    }),
    // Credit AR
    prisma.journalLine.create({
      data: {
        journalEntryId: paymentEntry2.id,
        accountId: accounts.accountsReceivable.id,
        description: 'AR payment - HealthCare Plus full payment',
        debitAmount: 0,
        creditAmount: 1736.00,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 0,
        baseCreditAmount: 1736.00
      }
    })
  ])

  // Inventory purchase entries for stock received
  const inventoryPurchaseEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2024-008',
      date: new Date('2024-01-10'),
      description: 'Inventory purchase - Monitors',
      reference: 'PO-2024-001',
      currency: 'USD',
      exchangeRate: 1.0,
      status: JournalStatus.POSTED,
      postedAt: new Date('2024-01-10'),
      postedBy: accountantId,
      createdBy: accountantId
    }
  })

  await Promise.all([
    // Debit inventory for goods received
    prisma.journalLine.create({
      data: {
        journalEntryId: inventoryPurchaseEntry.id,
        accountId: accounts.inventory.id,
        description: 'Inventory - 27" Monitors purchased',
        debitAmount: 35000.00,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 35000.00,
        baseCreditAmount: 0
      }
    }),
    // Credit accounts payable
    prisma.journalLine.create({
      data: {
        journalEntryId: inventoryPurchaseEntry.id,
        accountId: accounts.accountsPayable.id,
        description: 'AP - Display Tech Solutions',
        debitAmount: 0,
        creditAmount: 35000.00,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 0,
        baseCreditAmount: 35000.00
      }
    })
  ])

  // Keyboard purchase entry
  const keyboardPurchaseEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2024-009',
      date: new Date('2024-01-15'),
      description: 'Inventory purchase - Keyboards',
      reference: 'PO-2024-002',
      currency: 'USD',
      exchangeRate: 1.0,
      status: JournalStatus.POSTED,
      postedAt: new Date('2024-01-15'),
      postedBy: accountantId,
      createdBy: accountantId
    }
  })

  await Promise.all([
    // Debit inventory for keyboards
    prisma.journalLine.create({
      data: {
        journalEntryId: keyboardPurchaseEntry.id,
        accountId: accounts.inventory.id,
        description: 'Inventory - Mechanical keyboards purchased',
        debitAmount: 15000.00,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 15000.00,
        baseCreditAmount: 0
      }
    }),
    // Credit accounts payable
    prisma.journalLine.create({
      data: {
        journalEntryId: keyboardPurchaseEntry.id,
        accountId: accounts.accountsPayable.id,
        description: 'AP - Peripheral Plus Inc',
        debitAmount: 0,
        creditAmount: 15000.00,
        currency: 'USD',
        exchangeRate: 1.0,
        baseDebitAmount: 0,
        baseCreditAmount: 15000.00
      }
    })
  ])
}

async function createAuditExamples(users: any) {
  // Sample audit entries will be created automatically by the system
  // when transactions occur, so we don't need to create them manually
  console.warn('Audit trail will be automatically populated by system transactions')
}

async function createCurrencyData(adminId: string) {
  // Create exchange rates for common currencies
  await Promise.all([
    prisma.exchangeRate.create({
      data: {
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        rate: 1.08,
        rateDate: new Date('2024-01-01'),
        source: 'MANUAL',
        createdBy: adminId
      }
    }),
    prisma.exchangeRate.create({
      data: {
        fromCurrency: 'GBP',
        toCurrency: 'USD',
        rate: 1.26,
        rateDate: new Date('2024-01-01'),
        source: 'MANUAL',
        createdBy: adminId
      }
    }),
    prisma.exchangeRate.create({
      data: {
        fromCurrency: 'CAD',
        toCurrency: 'USD',
        rate: 0.74,
        rateDate: new Date('2024-01-01'),
        source: 'MANUAL',
        createdBy: adminId
      }
    })
  ])
}

async function printSeedSummary(): Promise<void> {
  console.warn('\n' + '='.repeat(60))
  console.warn('📊 COMPREHENSIVE SEED SUMMARY')
  console.warn('='.repeat(60))

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.account.count(),
    prisma.customer.count(),
    prisma.lead.count(),
    prisma.item.count(),
    prisma.category.count(),
    prisma.salesCase.count(),
    prisma.quotation.count(),
    prisma.salesOrder.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.stockMovement.count(),
    prisma.journalEntry.count(),
    prisma.auditLog.count()
  ])

  console.warn(`\n📈 DATA CREATED:`)
  console.warn(`   👥 Users: ${counts[0]}`)
  console.warn(`   💰 Chart of Accounts: ${counts[1]}`)
  console.warn(`   🏢 Customers: ${counts[2]}`)
  console.warn(`   📞 Leads: ${counts[3]}`)
  console.warn(`   📦 Inventory Items: ${counts[4]}`)
  console.warn(`   📂 Categories: ${counts[5]}`)
  console.warn(`   💼 Sales Cases: ${counts[6]}`)
  console.warn(`   📋 Quotations: ${counts[7]}`)
  console.warn(`   📝 Sales Orders: ${counts[8]}`)
  console.warn(`   🧾 Invoices: ${counts[9]}`)
  console.warn(`   💳 Payments: ${counts[10]}`)
  console.warn(`   📊 Stock Movements: ${counts[11]}`)
  console.warn(`   📚 Journal Entries: ${counts[12]}`)
  console.warn(`   🔍 Audit Logs: ${counts[13]}`)

  console.warn(`\n🔑 LOGIN CREDENTIALS:`)
  console.warn(`   Admin: admin / demo123`)
  console.warn(`   Sales: sarah / demo123`)
  console.warn(`   Accountant: michael / demo123`)
  console.warn(`   Warehouse: david / demo123`)
  console.warn(`   Manager: lisa / demo123`)

  console.warn(`\n🚀 READY TO TEST:`)
  console.warn(`   ✅ Complete business workflow from leads to payments`)
  console.warn(`   ✅ Multi-user access with different roles`)
  console.warn(`   ✅ Full GL integration with journal entries`)
  console.warn(`   ✅ Customer AR accounts and credit management`)
  console.warn(`   ✅ FIFO inventory costing with stock lots`)
  console.warn(`   ✅ Sales order to invoice workflow`)
  console.warn(`   ✅ Payment processing and customer ledgers`)
  console.warn(`   ✅ Audit trail for all transactions`)

  console.warn(`\n🎯 TEST SCENARIOS:`)
  console.warn(`   1. Login as different users`)
  console.warn(`   2. View financial reports and trial balance`)
  console.warn(`   3. Create new quotations and sales orders`)
  console.warn(`   4. Process invoices and payments`)
  console.warn(`   5. Check inventory levels and stock movements`)
  console.warn(`   6. Review customer balances and credit limits`)
  console.warn(`   7. Examine audit trails and journal entries`)
}

main()
  .then(() => {
    console.warn('\n✅ Comprehensive ERP Seed completed successfully!')
    process.exit(0)
  })
  .catch((e) => {
    console.error('\n❌ Seed error:', e)
    process.exit(1)
  })