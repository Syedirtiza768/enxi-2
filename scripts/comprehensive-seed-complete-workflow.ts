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
import { 
  AccountType, 
  Role, 
  CustomerStatus, 
  LeadStatus,
  SalesCaseStatus,
  QuotationStatus,
  OrderStatus,
  InvoiceStatus,
  InvoiceType,
  PaymentMethod,
  ItemType,
  MovementType,
  JournalStatus
} from '../lib/generated/prisma'

async function main() {
  console.log('🌱 Starting Comprehensive ERP Seed...\n')

  // Clean existing data
  await cleanDatabase()

  // Step 1: Create users and roles
  console.log('👥 Step 1: Creating users...')
  const users = await createUsers()
  console.log('✅ Created users\n')

  // Step 2: Create comprehensive chart of accounts
  console.log('💰 Step 2: Creating chart of accounts...')
  const accounts = await createComprehensiveChartOfAccounts(users.admin.id)
  console.log('✅ Created comprehensive chart of accounts\n')

  // Step 3: Create customers with proper AR accounts
  console.log('🏢 Step 3: Creating customers...')
  const customers = await createCustomersWithAR(users.admin.id, users.sales.id, accounts)
  console.log('✅ Created customers with AR accounts\n')

  // Step 4: Create leads and demonstrate conversion
  console.log('📞 Step 4: Creating leads...')
  const leads = await createLeads(users.sales.id)
  console.log('✅ Created leads\n')

  // Step 5: Create inventory system
  console.log('📦 Step 5: Creating inventory system...')
  const inventory = await createComprehensiveInventory(users.admin.id, accounts)
  console.log('✅ Created inventory system\n')

  // Step 6: Create sales cases linked to customers and leads
  console.log('💼 Step 6: Creating sales cases...')
  const salesCases = await createSalesCases(users.sales.id, customers, leads)
  console.log('✅ Created sales cases\n')

  // Step 7: Create quotations with multiple versions
  console.log('📋 Step 7: Creating quotations...')
  const quotations = await createQuotations(users.sales.id, customers, inventory.items, salesCases)
  console.log('✅ Created quotations\n')

  // Step 8: Create sales orders from quotations
  console.log('📝 Step 8: Creating sales orders...')
  const salesOrders = await createSalesOrders(users.sales.id, customers, quotations, inventory.items)
  console.log('✅ Created sales orders\n')

  // Step 9: Create stock movements for inventory
  console.log('📊 Step 9: Creating stock movements...')
  await createStockMovements(users.warehouse.id, inventory.items, accounts)
  console.log('✅ Created stock movements\n')

  // Step 10: Create invoices from sales orders
  console.log('🧾 Step 10: Creating invoices...')
  const invoices = await createInvoices(users.sales.id, customers, salesOrders, inventory.items)
  console.log('✅ Created invoices\n')

  // Step 11: Create payments for invoices
  console.log('💳 Step 11: Creating payments...')
  await createPayments(users.accountant.id, invoices, accounts)
  console.log('✅ Created payments\n')

  // Step 12: Create customer POs
  console.log('📄 Step 12: Creating customer POs...')
  await createCustomerPOs(users.sales.id, customers, quotations)
  console.log('✅ Created customer POs\n')

  // Step 13: Create additional journal entries
  console.log('📚 Step 13: Creating additional journal entries...')
  await createAdditionalJournalEntries(users.accountant.id, accounts)
  console.log('✅ Created additional journal entries\n')

  // Step 14: Create audit trail examples
  console.log('🔍 Step 14: Creating audit trail examples...')
  await createAuditExamples(users)
  console.log('✅ Created audit trail examples\n')

  // Step 15: Create currency and exchange rate data
  console.log('💱 Step 15: Creating currency data...')
  await createCurrencyData(users.admin.id)
  console.log('✅ Created currency data\n')

  // Final summary
  await printSeedSummary()
  
  console.log('🎉 Comprehensive ERP Seed completed successfully!')
  console.log('\n🚀 Ready to test complete business workflows!')
}

async function cleanDatabase() {
  console.log('🧹 Cleaning existing data...')
  
  // Clean in correct order to respect foreign key constraints
  try {
    await prisma.auditLog.deleteMany()
    await prisma.payment.deleteMany()
    await prisma.invoiceItem.deleteMany()
    await prisma.invoice.deleteMany()
    await prisma.salesOrderItem.deleteMany()
    await prisma.salesOrder.deleteMany()
    await prisma.customerPO.deleteMany()
    await prisma.quotationItem.deleteMany()
    await prisma.quotationVersion.deleteMany()
    await prisma.quotation.deleteMany()
    await prisma.salesCaseUpdate.deleteMany()
    await prisma.salesCase.deleteMany()
    await prisma.stockLot.deleteMany()
    await prisma.stockMovement.deleteMany()
    await prisma.journalLine.deleteMany()
    await prisma.journalEntry.deleteMany()
    await prisma.exchangeRate.deleteMany()
    await prisma.item.deleteMany()
    await prisma.category.deleteMany()
    await prisma.unitOfMeasure.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.account.deleteMany()
    await prisma.user.deleteMany()
    
    console.log('✅ Database cleaned')
  } catch (error) {
    console.log('⚠️ Some tables may not exist yet, continuing...')
  }
}

async function createUsers() {
  const hashedPassword = await bcrypt.hash('demo123', 10)

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@enxi-erp.com',
      password: hashedPassword,
      role: Role.ADMIN,
      isActive: true
    }
  })

  const sales = await prisma.user.create({
    data: {
      username: 'sarah',
      email: 'sarah@enxi-erp.com',
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    }
  })

  const accountant = await prisma.user.create({
    data: {
      username: 'michael',
      email: 'michael@enxi-erp.com',
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    }
  })

  const warehouse = await prisma.user.create({
    data: {
      username: 'david',
      email: 'david@enxi-erp.com',
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    }
  })

  const manager = await prisma.user.create({
    data: {
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
      isActive: true,
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
      isActive: true,
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
      isActive: true,
      createdBy: userId
    }
  })

  const accountsReceivable = await prisma.account.create({
    data: {
      code: '1200',
      name: 'Accounts Receivable',
      type: AccountType.ASSET,
      description: 'Customer receivables parent account',
      isActive: true,
      createdBy: userId
    }
  })

  const inventory = await prisma.account.create({
    data: {
      code: '1300',
      name: 'Inventory',
      type: AccountType.ASSET,
      description: 'Inventory assets',
      isActive: true,
      createdBy: userId
    }
  })

  const prepaidExpenses = await prisma.account.create({
    data: {
      code: '1400',
      name: 'Prepaid Expenses',
      type: AccountType.ASSET,
      description: 'Prepaid insurance, rent, etc.',
      isActive: true,
      createdBy: userId
    }
  })

  const fixedAssets = await prisma.account.create({
    data: {
      code: '1500',
      name: 'Property, Plant & Equipment',
      type: AccountType.ASSET,
      description: 'Fixed assets',
      isActive: true,
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
      isActive: true,
      createdBy: userId
    }
  })

  const salesTaxPayable = await prisma.account.create({
    data: {
      code: '2200',
      name: 'Sales Tax Payable',
      type: AccountType.LIABILITY,
      description: 'Sales tax collected from customers',
      isActive: true,
      createdBy: userId
    }
  })

  const accruedLiabilities = await prisma.account.create({
    data: {
      code: '2300',
      name: 'Accrued Liabilities',
      type: AccountType.LIABILITY,
      description: 'Wages, utilities, and other accrued expenses',
      isActive: true,
      createdBy: userId
    }
  })

  const shortTermDebt = await prisma.account.create({
    data: {
      code: '2400',
      name: 'Short-term Debt',
      type: AccountType.LIABILITY,
      description: 'Notes payable due within one year',
      isActive: true,
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
      isActive: true,
      createdBy: userId
    }
  })

  const retainedEarnings = await prisma.account.create({
    data: {
      code: '3100',
      name: 'Retained Earnings',
      type: AccountType.EQUITY,
      description: 'Accumulated earnings',
      isActive: true,
      createdBy: userId
    }
  })

  const ownerDrawings = await prisma.account.create({
    data: {
      code: '3200',
      name: 'Owner Drawings',
      type: AccountType.EQUITY,
      description: 'Owner withdrawals',
      isActive: true,
      createdBy: userId
    }
  })

  // 4000s - INCOME
  const salesRevenue = await prisma.account.create({
    data: {
      code: '4000',
      name: 'Sales Revenue',
      type: AccountType.INCOME,
      description: 'Revenue from product sales',
      isActive: true,
      createdBy: userId
    }
  })

  const serviceRevenue = await prisma.account.create({
    data: {
      code: '4100',
      name: 'Service Revenue',
      type: AccountType.INCOME,
      description: 'Revenue from services',
      isActive: true,
      createdBy: userId
    }
  })

  const otherIncome = await prisma.account.create({
    data: {
      code: '4900',
      name: 'Other Income',
      type: AccountType.INCOME,
      description: 'Miscellaneous income',
      isActive: true,
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
      isActive: true,
      createdBy: userId
    }
  })

  const salariesExpense = await prisma.account.create({
    data: {
      code: '5100',
      name: 'Salaries and Wages',
      type: AccountType.EXPENSE,
      description: 'Employee compensation',
      isActive: true,
      createdBy: userId
    }
  })

  const rentExpense = await prisma.account.create({
    data: {
      code: '5200',
      name: 'Rent Expense',
      type: AccountType.EXPENSE,
      description: 'Office and warehouse rent',
      isActive: true,
      createdBy: userId
    }
  })

  const utilitiesExpense = await prisma.account.create({
    data: {
      code: '5300',
      name: 'Utilities Expense',
      type: AccountType.EXPENSE,
      description: 'Electric, water, gas, internet',
      isActive: true,
      createdBy: userId
    }
  })

  const advertisingExpense = await prisma.account.create({
    data: {
      code: '5400',
      name: 'Advertising and Marketing',
      type: AccountType.EXPENSE,
      description: 'Marketing and promotional expenses',
      isActive: true,
      createdBy: userId
    }
  })

  const officeExpense = await prisma.account.create({
    data: {
      code: '5500',
      name: 'Office Expenses',
      type: AccountType.EXPENSE,
      description: 'Office supplies and miscellaneous',
      isActive: true,
      createdBy: userId
    }
  })

  const travelExpense = await prisma.account.create({
    data: {
      code: '5600',
      name: 'Travel and Entertainment',
      type: AccountType.EXPENSE,
      description: 'Business travel and client entertainment',
      isActive: true,
      createdBy: userId
    }
  })

  const professionalFees = await prisma.account.create({
    data: {
      code: '5700',
      name: 'Professional Fees',
      type: AccountType.EXPENSE,
      description: 'Legal, accounting, consulting fees',
      isActive: true,
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
      status: CustomerStatus.ACTIVE,
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
          isActive: true,
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
      status: CustomerStatus.ACTIVE,
      createdBy: salesId,
      account: {
        create: {
          code: '1200-002',
          name: 'AR - Global Retail Networks',
          type: AccountType.ASSET,
          parentId: accounts.accountsReceivable.id,
          currency: 'USD',
          description: 'Accounts Receivable for Global Retail Networks',
          isActive: true,
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
      status: CustomerStatus.ACTIVE,
      createdBy: salesId,
      account: {
        create: {
          code: '1200-003',
          name: 'AR - Advanced Manufacturing Ltd',
          type: AccountType.ASSET,
          parentId: accounts.accountsReceivable.id,
          currency: 'USD',
          description: 'Accounts Receivable for Advanced Manufacturing Ltd',
          isActive: true,
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
      status: CustomerStatus.ACTIVE,
      createdBy: salesId,
      account: {
        create: {
          code: '1200-004',
          name: 'AR - HealthCare Plus Systems',
          type: AccountType.ASSET,
          parentId: accounts.accountsReceivable.id,
          currency: 'USD',
          description: 'Accounts Receivable for HealthCare Plus Systems',
          isActive: true,
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
        estimatedValue: 75000,
        notes: 'Interested in enterprise software solution. Has budget approved.',
        assignedTo: salesId,
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
        estimatedValue: 120000,
        notes: 'Met at EdTech Expo 2024. Very interested in our learning management system.',
        assignedTo: salesId,
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
        estimatedValue: 300000,
        notes: 'Referred by TechCorp Solutions. Looking for comprehensive financial management system.',
        assignedTo: salesId,
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
        estimatedValue: 180000,
        notes: 'Proposal sent for inventory management system. Awaiting decision.',
        assignedTo: salesId,
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
        probability: 90,
        expectedCloseDate: new Date('2024-03-15'),
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
        probability: 75,
        expectedCloseDate: new Date('2024-04-30'),
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
        probability: 60,
        expectedCloseDate: new Date('2024-05-31'),
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
      customerId: customers.techCorp.id,
      salesCaseId: salesCases[0].id,
      createdBy: salesId
    }
  })

  await prisma.quotationVersion.create({
    data: {
      quotationId: quotation1.id,
      versionNumber: 1,
      date: new Date('2024-01-15'),
      validUntil: new Date('2024-02-29'),
      currency: 'USD',
      exchangeRate: 1.0,
      paymentTerms: 'Net 30',
      deliveryTerms: 'FOB Origin',
      notes: 'Volume discount applied for quantities over 20 units',
      termsAndConditions: 'Standard terms and conditions apply. Warranty: 3 years parts and labor.',
      status: QuotationStatus.SENT,
      isCurrent: true,
      createdBy: salesId,
      items: {
        create: [
          {
            itemId: items.laptopPro.id,
            description: 'Professional Laptop 15" - Executive Configuration',
            quantity: 25,
            unitPrice: 1750.00,
            discountPercent: 7.8,
            taxRate: 8.5,
            sortOrder: 1
          },
          {
            itemId: items.desktop.id,
            description: 'Workstation Desktop - Engineering Stations',
            quantity: 10,
            unitPrice: 3800.00,
            discountPercent: 5.0,
            taxRate: 8.5,
            sortOrder: 2
          },
          {
            itemId: items.monitor.id,
            description: '27" 4K Monitor - Dual setup per workstation',
            quantity: 20,
            unitPrice: 550.00,
            discountPercent: 8.0,
            taxRate: 8.5,
            sortOrder: 3
          },
          {
            itemId: items.office365.id,
            description: 'Office 365 Business Premium - Annual licenses',
            quantity: 35,
            unitPrice: 264.00,
            discountPercent: 15.0,
            taxRate: 0,
            sortOrder: 4
          },
          {
            itemId: items.setup.id,
            description: 'Professional setup and configuration',
            quantity: 35,
            unitPrice: 149.99,
            discountPercent: 0,
            taxRate: 8.5,
            sortOrder: 5
          }
        ]
      }
    }
  })

  // Healthcare quotation
  const quotation2 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2024-002',
      customerId: customers.healthcarePlus.id,
      salesCaseId: salesCases[1].id,
      createdBy: salesId
    }
  })

  await prisma.quotationVersion.create({
    data: {
      quotationId: quotation2.id,
      versionNumber: 1,
      date: new Date('2024-01-20'),
      validUntil: new Date('2024-03-20'),
      currency: 'USD',
      exchangeRate: 1.0,
      paymentTerms: 'Net 30',
      deliveryTerms: 'Delivered and Installed',
      notes: 'Healthcare compliance configuration included',
      termsAndConditions: 'HIPAA compliance setup included. Extended warranty available.',
      status: QuotationStatus.SENT,
      isCurrent: true,
      createdBy: salesId,
      items: {
        create: [
          {
            itemId: items.desktop.id,
            description: 'Medical Workstation - HIPAA Compliant',
            quantity: 15,
            unitPrice: 4200.00,
            discountPercent: 3.0,
            taxRate: 8.5,
            sortOrder: 1
          },
          {
            itemId: items.laptopBusiness.id,
            description: 'Mobile Carts Laptop Configuration',
            quantity: 8,
            unitPrice: 1400.00,
            discountPercent: 5.0,
            taxRate: 8.5,
            sortOrder: 2
          },
          {
            itemId: items.antivirus.id,
            description: 'Enterprise Security Suite - Healthcare Edition',
            quantity: 23,
            unitPrice: 120.00,
            discountPercent: 10.0,
            taxRate: 0,
            sortOrder: 3
          },
          {
            itemId: items.training.id,
            description: 'HIPAA Compliance Training - 2 sessions',
            quantity: 2,
            unitPrice: 800.00,
            discountPercent: 0,
            taxRate: 0,
            sortOrder: 4
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
      customerId: customers.techCorp.id,
      orderDate: new Date('2024-02-01'),
      requestedDeliveryDate: new Date('2024-02-29'),
      currency: 'USD',
      exchangeRate: 1.0,
      paymentTerms: 'Net 30',
      billingAddress: 'TechCorp Solutions Inc\\n123 Technology Blvd\\nSan Francisco, CA 94105',
      shippingAddress: 'TechCorp Solutions Inc\\n123 Technology Blvd\\nSan Francisco, CA 94105',
      status: OrderStatus.APPROVED,
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
      notes: 'Opening inventory balance - Professional Laptops',
      createdBy: warehouseId,
      stockLot: {
        create: {
          lotNumber: 'LOT-LAP-PRO-001',
          itemId: items.laptopPro.id,
          receivedDate: new Date('2024-01-01'),
          receivedQty: 50,
          availableQty: 50,
          unitCost: 1200.00,
          totalCost: 60000.00,
          createdBy: warehouseId
        }
      }
    }
  }))

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
      notes: 'Opening inventory balance - Business Laptops',
      createdBy: warehouseId,
      stockLot: {
        create: {
          lotNumber: 'LOT-LAP-BUS-001',
          itemId: items.laptopBusiness.id,
          receivedDate: new Date('2024-01-01'),
          receivedQty: 75,
          availableQty: 75,
          unitCost: 800.00,
          totalCost: 60000.00,
          createdBy: warehouseId
        }
      }
    }
  }))

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
      notes: 'Opening inventory balance - Workstation Desktops',
      createdBy: warehouseId,
      stockLot: {
        create: {
          lotNumber: 'LOT-DT-WORK-001',
          itemId: items.desktop.id,
          receivedDate: new Date('2024-01-01'),
          receivedQty: 20,
          availableQty: 20,
          unitCost: 2500.00,
          totalCost: 50000.00,
          createdBy: warehouseId
        }
      }
    }
  }))

  // Stock in for monitors
  movements.push(await prisma.stockMovement.create({
    data: {
      movementNumber: 'SIN-2024-001',
      itemId: items.monitor.id,
      movementType: MovementType.STOCK_IN,
      movementDate: new Date('2024-01-10'),
      quantity: 100,
      unitCost: 350.00,
      totalCost: 35000.00,
      unitOfMeasureId: items.monitor.unitOfMeasureId,
      referenceType: 'PURCHASE',
      referenceNumber: 'PO-2024-001',
      supplier: 'Display Tech Solutions',
      notes: 'Monthly monitor inventory replenishment',
      createdBy: warehouseId,
      stockLot: {
        create: {
          lotNumber: 'LOT-MON-27-001',
          itemId: items.monitor.id,
          receivedDate: new Date('2024-01-10'),
          receivedQty: 100,
          availableQty: 100,
          unitCost: 350.00,
          totalCost: 35000.00,
          supplier: 'Display Tech Solutions',
          purchaseRef: 'PO-2024-001',
          createdBy: warehouseId
        }
      }
    }
  }))

  // Stock in for peripherals
  movements.push(await prisma.stockMovement.create({
    data: {
      movementNumber: 'SIN-2024-002',
      itemId: items.keyboard.id,
      movementType: MovementType.STOCK_IN,
      movementDate: new Date('2024-01-15'),
      quantity: 200,
      unitCost: 75.00,
      totalCost: 15000.00,
      unitOfMeasureId: items.keyboard.unitOfMeasureId,
      referenceType: 'PURCHASE',
      referenceNumber: 'PO-2024-002',
      supplier: 'Peripheral Plus Inc',
      notes: 'Keyboard inventory for Q1 orders',
      createdBy: warehouseId,
      stockLot: {
        create: {
          lotNumber: 'LOT-KBD-MECH-001',
          itemId: items.keyboard.id,
          receivedDate: new Date('2024-01-15'),
          receivedQty: 200,
          availableQty: 200,
          unitCost: 75.00,
          totalCost: 15000.00,
          supplier: 'Peripheral Plus Inc',
          purchaseRef: 'PO-2024-002',
          createdBy: warehouseId
        }
      }
    }
  }))

  // Stock out for sales order fulfillment
  movements.push(await prisma.stockMovement.create({
    data: {
      movementNumber: 'SOUT-2024-001',
      itemId: items.laptopPro.id,
      movementType: MovementType.STOCK_OUT,
      movementDate: new Date('2024-02-05'),
      quantity: -10,
      unitCost: 1200.00,
      totalCost: 12000.00,
      unitOfMeasureId: items.laptopPro.unitOfMeasureId,
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
      customerPONumber: 'PO-TECH-2024-0156',
      quotationId: quotations[0].id,
      customerId: customers.techCorp.id,
      poDate: new Date('2024-01-30'),
      requestedDeliveryDate: new Date('2024-02-28'),
      amount: 115000.00,
      currency: 'USD',
      paymentTerms: 'Net 30',
      billingAddress: 'TechCorp Solutions Inc\\nAccounts Payable\\n123 Technology Blvd\\nSan Francisco, CA 94105',
      shippingAddress: 'TechCorp Solutions Inc\\nReceiving Dock\\n123 Technology Blvd\\nSan Francisco, CA 94105',
      notes: 'Please coordinate delivery with our IT team. Contact: John Smith (555) 123-4567',
      status: 'ACCEPTED',
      acceptedBy: salesId,
      acceptedAt: new Date('2024-01-30'),
      createdBy: salesId
    }
  })

  return [customerPO]
}

async function createAdditionalJournalEntries(accountantId: string, accounts: any) {
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
}

async function createAuditExamples(users: any) {
  // Sample audit entries will be created automatically by the system
  // when transactions occur, so we don't need to create them manually
  console.log('Audit trail will be automatically populated by system transactions')
}

async function createCurrencyData(adminId: string) {
  // Create exchange rates for common currencies
  await Promise.all([
    prisma.exchangeRate.create({
      data: {
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        rate: 1.08,
        effectiveDate: new Date('2024-01-01'),
        source: 'MANUAL',
        createdBy: adminId
      }
    }),
    prisma.exchangeRate.create({
      data: {
        fromCurrency: 'GBP',
        toCurrency: 'USD',
        rate: 1.26,
        effectiveDate: new Date('2024-01-01'),
        source: 'MANUAL',
        createdBy: adminId
      }
    }),
    prisma.exchangeRate.create({
      data: {
        fromCurrency: 'CAD',
        toCurrency: 'USD',
        rate: 0.74,
        effectiveDate: new Date('2024-01-01'),
        source: 'MANUAL',
        createdBy: adminId
      }
    })
  ])
}

async function printSeedSummary() {
  console.log('\n' + '='.repeat(60))
  console.log('📊 COMPREHENSIVE SEED SUMMARY')
  console.log('='.repeat(60))

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

  console.log(`\n📈 DATA CREATED:`)
  console.log(`   👥 Users: ${counts[0]}`)
  console.log(`   💰 Chart of Accounts: ${counts[1]}`)
  console.log(`   🏢 Customers: ${counts[2]}`)
  console.log(`   📞 Leads: ${counts[3]}`)
  console.log(`   📦 Inventory Items: ${counts[4]}`)
  console.log(`   📂 Categories: ${counts[5]}`)
  console.log(`   💼 Sales Cases: ${counts[6]}`)
  console.log(`   📋 Quotations: ${counts[7]}`)
  console.log(`   📝 Sales Orders: ${counts[8]}`)
  console.log(`   🧾 Invoices: ${counts[9]}`)
  console.log(`   💳 Payments: ${counts[10]}`)
  console.log(`   📊 Stock Movements: ${counts[11]}`)
  console.log(`   📚 Journal Entries: ${counts[12]}`)
  console.log(`   🔍 Audit Logs: ${counts[13]}`)

  console.log(`\n🔑 LOGIN CREDENTIALS:`)
  console.log(`   Admin: admin / demo123`)
  console.log(`   Sales: sarah / demo123`)
  console.log(`   Accountant: michael / demo123`)
  console.log(`   Warehouse: david / demo123`)
  console.log(`   Manager: lisa / demo123`)

  console.log(`\n🚀 READY TO TEST:`)
  console.log(`   ✅ Complete business workflow from leads to payments`)
  console.log(`   ✅ Multi-user access with different roles`)
  console.log(`   ✅ Full GL integration with journal entries`)
  console.log(`   ✅ Customer AR accounts and credit management`)
  console.log(`   ✅ FIFO inventory costing with stock lots`)
  console.log(`   ✅ Sales order to invoice workflow`)
  console.log(`   ✅ Payment processing and customer ledgers`)
  console.log(`   ✅ Audit trail for all transactions`)

  console.log(`\n🎯 TEST SCENARIOS:`)
  console.log(`   1. Login as different users`)
  console.log(`   2. View financial reports and trial balance`)
  console.log(`   3. Create new quotations and sales orders`)
  console.log(`   4. Process invoices and payments`)
  console.log(`   5. Check inventory levels and stock movements`)
  console.log(`   6. Review customer balances and credit limits`)
  console.log(`   7. Examine audit trails and journal entries`)
}

main()
  .then(() => {
    console.log('\n✅ Comprehensive ERP Seed completed successfully!')
    process.exit(0)
  })
  .catch((e) => {
    console.error('\n❌ Seed error:', e)
    process.exit(1)
  })