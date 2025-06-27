import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { 
  AccountType, 
  Role, 
  LeadSource,
  LeadStatus,
  SalesCaseStatus,
  MovementType,
  JournalStatus
} from "@/lib/types/shared-enums"

// These constants are not yet in shared-enums, so define them locally
const QuotationStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
} as const

const ItemType = {
  PRODUCT: 'PRODUCT',
  SERVICE: 'SERVICE',
  CONSUMABLE: 'CONSUMABLE'
} as const

async function main(): Promise<void> {
  console.warn('🌱 Starting seed...')

  // Clean existing data
  await cleanDatabase()

  // Create users
  const users = await createUsers()
  console.warn('✅ Created users')

  // Create chart of accounts
  const accounts = await createChartOfAccounts(users.admin.id)
  console.warn('✅ Created chart of accounts')

  // Create customers
  const customers = await createCustomers(users.admin.id, users.sales.id)
  console.warn('✅ Created customers')

  // Create leads
  const leads = await createLeads(users.sales.id)
  console.warn('✅ Created leads')

  // Create sales cases
  const salesCases = await createSalesCases(users.sales.id, customers, leads)
  console.warn('✅ Created sales cases')

  // Create inventory foundation
  const inventory = await createInventoryFoundation(users.admin.id, accounts)
  console.warn('✅ Created inventory foundation')

  // Create quotations
  const quotations = await createQuotations(users.sales.id, salesCases, inventory.items)
  console.warn('✅ Created quotations')

  // Create stock movements
  await createStockMovements(users.warehouse.id, inventory.items)
  console.warn('✅ Created stock movements')

  // Create sample journal entries
  await createSampleJournalEntries(users.accountant.id, accounts)
  console.warn('✅ Created journal entries')

  console.warn('🎉 Seed completed successfully!')
}

async function cleanDatabase(): Promise<void> {
  // Delete in correct order to respect foreign keys
  await prisma.auditLog.deleteMany()
  await prisma.journalLine.deleteMany()
  await prisma.journalEntry.deleteMany()
  await prisma.quotationItem.deleteMany()
  await prisma.quotation.deleteMany()
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
      username: 'sales',
      email: 'sales@enxi-erp.com',
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    }
  })

  const accountant = await prisma.user.create({
    data: {
      username: 'accountant',
      email: 'accountant@enxi-erp.com',
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    }
  })

  const warehouse = await prisma.user.create({
    data: {
      username: 'warehouse',
      email: 'warehouse@enxi-erp.com',
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    }
  })

  return { admin, sales, accountant, warehouse }
}

async function createChartOfAccounts(userId: string) {
  // Create accounts in a structured order with parent-child relationships
  const accounts: Record<string, any> = {}

  // 1000 - ASSETS
  const assets = await prisma.account.create({
    data: {
      code: '1000',
      name: 'Assets',
      type: AccountType.ASSET,
      description: 'All company assets',
      status: 'ACTIVE',
      isSystemAccount: true,
      createdBy: userId
    }
  })

  // 1100 - Current Assets
  const currentAssets = await prisma.account.create({
    data: {
      code: '1100',
      name: 'Current Assets',
      type: AccountType.ASSET,
      description: 'Assets expected to be converted to cash within one year',
      parentId: assets.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  // Cash accounts
  accounts.cash = await prisma.account.create({
    data: {
      code: '1110',
      name: 'Cash on Hand',
      type: AccountType.ASSET,
      description: 'Physical cash and petty cash',
      parentId: currentAssets.id,
      status: 'ACTIVE',
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.bank = await prisma.account.create({
    data: {
      code: '1010',
      name: 'Bank Account',
      type: AccountType.ASSET,
      description: 'Main operating bank account',
      parentId: currentAssets.id,
      status: 'ACTIVE',
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.bankSavings = await prisma.account.create({
    data: {
      code: '1020',
      name: 'Bank Savings Account',
      type: AccountType.ASSET,
      description: 'Savings and reserve accounts',
      parentId: currentAssets.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  accounts.accountsReceivable = await prisma.account.create({
    data: {
      code: '1200',
      name: 'Accounts Receivable',
      type: AccountType.ASSET,
      description: 'Customer receivables',
      parentId: currentAssets.id,
      status: 'ACTIVE',
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.inventory = await prisma.account.create({
    data: {
      code: '1300',
      name: 'Inventory',
      type: AccountType.ASSET,
      description: 'Products held for sale',
      parentId: currentAssets.id,
      status: 'ACTIVE',
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.prepaidExpenses = await prisma.account.create({
    data: {
      code: '1400',
      name: 'Prepaid Expenses',
      type: AccountType.ASSET,
      description: 'Expenses paid in advance',
      parentId: currentAssets.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  // 1500 - Fixed Assets
  const fixedAssets = await prisma.account.create({
    data: {
      code: '1500',
      name: 'Fixed Assets',
      type: AccountType.ASSET,
      description: 'Long-term tangible assets',
      parentId: assets.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  accounts.equipment = await prisma.account.create({
    data: {
      code: '1510',
      name: 'Equipment',
      type: AccountType.ASSET,
      description: 'Office and operational equipment',
      parentId: fixedAssets.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  accounts.accumulatedDepreciation = await prisma.account.create({
    data: {
      code: '1520',
      name: 'Accumulated Depreciation - Equipment',
      type: AccountType.ASSET,
      description: 'Accumulated depreciation on equipment',
      parentId: fixedAssets.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  // 2000 - LIABILITIES
  const liabilities = await prisma.account.create({
    data: {
      code: '2000',
      name: 'Liabilities',
      type: AccountType.LIABILITY,
      description: 'All company liabilities',
      status: 'ACTIVE',
      isSystemAccount: true,
      createdBy: userId
    }
  })

  // 2100 - Current Liabilities
  const currentLiabilities = await prisma.account.create({
    data: {
      code: '2100',
      name: 'Current Liabilities',
      type: AccountType.LIABILITY,
      description: 'Liabilities due within one year',
      parentId: liabilities.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  accounts.accountsPayable = await prisma.account.create({
    data: {
      code: '2110',
      name: 'Accounts Payable',
      type: AccountType.LIABILITY,
      description: 'Amounts owed to suppliers',
      parentId: currentLiabilities.id,
      status: 'ACTIVE',
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.taxPayable = await prisma.account.create({
    data: {
      code: '2200',
      name: 'Tax Payable',
      type: AccountType.LIABILITY,
      description: 'Taxes owed to government',
      parentId: currentLiabilities.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  accounts.salariesPayable = await prisma.account.create({
    data: {
      code: '2300',
      name: 'Salaries Payable',
      type: AccountType.LIABILITY,
      description: 'Salaries owed to employees',
      parentId: currentLiabilities.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  // 3000 - EQUITY
  const equity = await prisma.account.create({
    data: {
      code: '3000',
      name: 'Equity',
      type: AccountType.EQUITY,
      description: 'Owner\'s equity',
      status: 'ACTIVE',
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.capitalStock = await prisma.account.create({
    data: {
      code: '3100',
      name: 'Capital Stock',
      type: AccountType.EQUITY,
      description: 'Common stock',
      parentId: equity.id,
      status: 'ACTIVE',
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.retainedEarnings = await prisma.account.create({
    data: {
      code: '3200',
      name: 'Retained Earnings',
      type: AccountType.EQUITY,
      description: 'Accumulated profits',
      parentId: equity.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  // 4000 - INCOME
  const income = await prisma.account.create({
    data: {
      code: '4000',
      name: 'Income',
      type: AccountType.INCOME,
      description: 'All revenue accounts',
      status: 'ACTIVE',
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.salesRevenue = await prisma.account.create({
    data: {
      code: '4100',
      name: 'Sales Revenue',
      type: AccountType.INCOME,
      description: 'Revenue from product sales',
      parentId: income.id,
      status: 'ACTIVE',
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.serviceRevenue = await prisma.account.create({
    data: {
      code: '4200',
      name: 'Service Revenue',
      type: AccountType.INCOME,
      description: 'Revenue from services',
      parentId: income.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  accounts.discountRevenue = await prisma.account.create({
    data: {
      code: '4300',
      name: 'Sales Discounts',
      type: AccountType.INCOME,
      description: 'Discounts given to customers',
      parentId: income.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  // 5000 - EXPENSES
  const expenses = await prisma.account.create({
    data: {
      code: '5000',
      name: 'Expenses',
      type: AccountType.EXPENSE,
      description: 'All expense accounts',
      status: 'ACTIVE',
      isSystemAccount: true,
      createdBy: userId
    }
  })

  accounts.cogs = await prisma.account.create({
    data: {
      code: '5010',
      name: 'Cost of Goods Sold',
      type: AccountType.EXPENSE,
      description: 'Direct cost of products sold',
      parentId: expenses.id,
      status: 'ACTIVE',
      isSystemAccount: true,
      createdBy: userId
    }
  })

  // Operating Expenses
  const operatingExpenses = await prisma.account.create({
    data: {
      code: '5100',
      name: 'Operating Expenses',
      type: AccountType.EXPENSE,
      description: 'General operating expenses',
      parentId: expenses.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  accounts.salariesExpense = await prisma.account.create({
    data: {
      code: '5110',
      name: 'Salaries and Wages',
      type: AccountType.EXPENSE,
      description: 'Employee salaries and wages',
      parentId: operatingExpenses.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  accounts.rentExpense = await prisma.account.create({
    data: {
      code: '5200',
      name: 'Rent Expense',
      type: AccountType.EXPENSE,
      description: 'Office and warehouse rent',
      parentId: operatingExpenses.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  accounts.utilitiesExpense = await prisma.account.create({
    data: {
      code: '5300',
      name: 'Utilities Expense',
      type: AccountType.EXPENSE,
      description: 'Electricity, water, internet',
      parentId: operatingExpenses.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  accounts.officeSupplies = await prisma.account.create({
    data: {
      code: '5400',
      name: 'Office Supplies Expense',
      type: AccountType.EXPENSE,
      description: 'Office supplies and materials',
      parentId: operatingExpenses.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  accounts.depreciationExpense = await prisma.account.create({
    data: {
      code: '5500',
      name: 'Depreciation Expense',
      type: AccountType.EXPENSE,
      description: 'Depreciation on fixed assets',
      parentId: operatingExpenses.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  accounts.bankCharges = await prisma.account.create({
    data: {
      code: '5600',
      name: 'Bank Charges',
      type: AccountType.EXPENSE,
      description: 'Bank fees and charges',
      parentId: operatingExpenses.id,
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  return accounts
}

async function createCustomers(adminId: string, salesId: string) {
  const techCorp = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-001',
      name: 'TechCorp Solutions',
      taxId: '12-3456789',
      email: 'info@techcorp.com',
      phone: '+1 (555) 123-4567',
      website: 'https://techcorp.com',
      industry: 'Technology',
      creditLimit: 100000,
      paymentTerms: 30,
      createdBy: adminId
    }
  })

  const globalRetail = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-002',
      name: 'Global Retail Inc',
      taxId: '98-7654321',
      email: 'purchasing@globalretail.com',
      phone: '+1 (555) 987-6543',
      website: 'https://globalretail.com',
      industry: 'Retail',
      creditLimit: 250000,
      paymentTerms: 45,
      createdBy: salesId
    }
  })

  const manufacturingCo = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-003',
      name: 'Manufacturing Co Ltd',
      taxId: '45-1234567',
      email: 'orders@manufacco.com',
      phone: '+1 (555) 456-7890',
      industry: 'Manufacturing',
      creditLimit: 150000,
      paymentTerms: 60,
      createdBy: salesId
    }
  })

  return { techCorp, globalRetail, manufacturingCo }
}

async function createLeads(salesId: string) {
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        company: 'StartupTech Inc',
        email: 'john@startuptech.com',
        phone: '+1 (555) 111-2222',
        jobTitle: 'CEO',
        status: LeadStatus.NEW,
        source: LeadSource.WEBSITE,
        notes: 'Interested in our enterprise solution',
        createdBy: salesId
      }
    }),
    prisma.lead.create({
      data: {
        firstName: 'Jane',
        lastName: 'Smith',
        company: 'Healthcare Plus',
        email: 'jane@healthcareplus.com',
        phone: '+1 (555) 333-4444',
        jobTitle: 'VP of Operations',
        status: LeadStatus.CONTACTED,
        source: LeadSource.TRADE_SHOW,
        notes: 'Met at Healthcare Expo 2024',
        createdBy: salesId
      }
    }),
    prisma.lead.create({
      data: {
        firstName: 'Robert',
        lastName: 'Johnson',
        company: 'Education First',
        email: 'robert@edufirst.com',
        phone: '+1 (555) 555-6666',
        jobTitle: 'Director of IT',
        status: LeadStatus.QUALIFIED,
        source: LeadSource.REFERRAL,
        notes: 'Referred by existing customer',
        createdBy: salesId
      }
    })
  ])

  return leads
}

async function createSalesCases(
  salesId: string, 
  customers: any, 
  leads: any[]
) {
  // Sales case from existing customer
  const customerCase = await prisma.salesCase.create({
    data: {
      caseNumber: 'SC-2024-001',
      title: 'Enterprise Software Upgrade',
      description: 'Customer wants to upgrade their existing software to enterprise version',
      customerId: customers.techCorp.id,
      estimatedValue: 150000,
      status: SalesCaseStatus.IN_PROGRESS,
      assignedTo: salesId,
      createdBy: salesId
    }
  })

  // Sales case from lead
  const leadCase = await prisma.salesCase.create({
    data: {
      caseNumber: 'SC-2024-002',
      title: 'New Healthcare System Implementation',
      description: 'Lead interested in complete healthcare management system',
      customerId: customers.globalRetail.id, // Using existing customer instead of lead
      estimatedValue: 75000,
      status: SalesCaseStatus.IN_PROGRESS,
      assignedTo: salesId,
      createdBy: salesId
    }
  })

  // Sales cases created successfully

  return { customerCase, leadCase }
}

async function createInventoryFoundation(userId: string, accounts: any) {
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

  const dozen = await prisma.unitOfMeasure.create({
    data: {
      code: 'DOZ',
      name: 'Dozen',
      symbol: 'dz',
      isBaseUnit: false,
      baseUnitId: pieces.id,
      conversionFactor: 12,
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

  const gram = await prisma.unitOfMeasure.create({
    data: {
      code: 'G',
      name: 'Gram',
      symbol: 'g',
      isBaseUnit: false,
      baseUnitId: kg.id,
      conversionFactor: 0.001,
      createdBy: userId
    }
  })

  // Categories
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
      name: 'Computers',
      description: 'Computers and accessories',
      parentId: electronics.id,
      createdBy: userId
    }
  })

  const phones = await prisma.category.create({
    data: {
      code: 'PHONE',
      name: 'Mobile Phones',
      description: 'Smartphones and mobile devices',
      parentId: electronics.id,
      createdBy: userId
    }
  })

  const office = await prisma.category.create({
    data: {
      code: 'OFFICE',
      name: 'Office Supplies',
      description: 'Office supplies and stationery',
      createdBy: userId
    }
  })

  // Items
  const laptop = await prisma.item.create({
    data: {
      code: 'LAP-001',
      name: 'Business Laptop Pro',
      description: 'High-performance business laptop with 16GB RAM, 512GB SSD',
      categoryId: computers.id,
      type: ItemType.PRODUCT,
      unitOfMeasureId: pieces.id,
      trackInventory: true,
      minStockLevel: 10,
      maxStockLevel: 100,
      reorderPoint: 20,
      standardCost: 800,
      listPrice: 1200,
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.cogs.id,
      salesAccountId: accounts.salesRevenue.id,
      isSaleable: true,
      isPurchaseable: true,
      createdBy: userId
    }
  })

  const smartphone = await prisma.item.create({
    data: {
      code: 'PHN-001',
      name: 'SmartPhone X Pro',
      description: '5G smartphone with 128GB storage',
      categoryId: phones.id,
      type: ItemType.PRODUCT,
      unitOfMeasureId: pieces.id,
      trackInventory: true,
      minStockLevel: 20,
      maxStockLevel: 200,
      reorderPoint: 40,
      standardCost: 600,
      listPrice: 900,
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.cogs.id,
      salesAccountId: accounts.salesRevenue.id,
      isSaleable: true,
      isPurchaseable: true,
      createdBy: userId
    }
  })

  const mouse = await prisma.item.create({
    data: {
      code: 'ACC-001',
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse',
      categoryId: computers.id,
      type: ItemType.PRODUCT,
      unitOfMeasureId: pieces.id,
      trackInventory: true,
      minStockLevel: 50,
      maxStockLevel: 500,
      reorderPoint: 100,
      standardCost: 20,
      listPrice: 35,
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.cogs.id,
      salesAccountId: accounts.salesRevenue.id,
      isSaleable: true,
      isPurchaseable: true,
      createdBy: userId
    }
  })

  const paperA4 = await prisma.item.create({
    data: {
      code: 'PAP-001',
      name: 'A4 Paper (500 sheets)',
      description: 'Premium quality A4 paper, 80gsm',
      categoryId: office.id,
      type: ItemType.PRODUCT,
      unitOfMeasureId: pieces.id,
      trackInventory: true,
      minStockLevel: 100,
      maxStockLevel: 1000,
      reorderPoint: 200,
      standardCost: 5,
      listPrice: 8,
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.cogs.id,
      salesAccountId: accounts.salesRevenue.id,
      isSaleable: true,
      isPurchaseable: true,
      createdBy: userId
    }
  })

  // Service item (non-inventory)
  const support = await prisma.item.create({
    data: {
      code: 'SRV-001',
      name: 'Technical Support (1 hour)',
      description: 'Professional technical support service',
      categoryId: computers.id,
      type: ItemType.SERVICE,
      unitOfMeasureId: pieces.id,
      trackInventory: false,
      standardCost: 50,
      listPrice: 100,
      salesAccountId: accounts.salesRevenue.id,
      isSaleable: true,
      isPurchaseable: false,
      createdBy: userId
    }
  })

  return {
    units: { pieces, dozen, kg, gram },
    categories: { electronics, computers, phones, office },
    items: { laptop, smartphone, mouse, paperA4, support }
  }
}

async function createQuotations(
  salesId: string, 
  salesCases: any, 
  items: any
) {
  // Quotation 1 - Active
  const quotation1 = await prisma.quotation.create({
    data: {
      quotationNumber: 'Q-2024-001',
      salesCaseId: salesCases.customerCase.id,
      version: 1,
      status: QuotationStatus.SENT,
      validUntil: new Date('2024-02-15'),
      paymentTerms: '30 days net',
      deliveryTerms: 'FOB Warehouse',
      notes: 'Special pricing for enterprise customer',
      subtotal: 42600,
      taxAmount: 3860,
      discountAmount: 3400,
      totalAmount: 43060,
      createdBy: salesId,
      items: {
        create: [
          {
            lineNumber: 1,
            lineDescription: 'Laptop Package',
            isLineHeader: true,
            itemType: ItemType.PRODUCT,
            itemId: items.laptop.id,
            itemCode: 'LAP-001',
            description: 'Business Laptop Pro - Enterprise configuration',
            quantity: 20,
            unitPrice: 1100,
            discount: 8.33,
            taxRate: 10,
            subtotal: 22000,
            discountAmount: 1833,
            taxAmount: 2017,
            totalAmount: 22184,
            sortOrder: 1
          },
          {
            lineNumber: 1,
            lineDescription: 'Laptop Package',
            isLineHeader: false,
            itemType: ItemType.PRODUCT,
            itemId: items.mouse.id,
            itemCode: 'ACC-001',
            description: 'Wireless Mouse - Included with laptop',
            quantity: 20,
            unitPrice: 30,
            discount: 14.29,
            taxRate: 10,
            subtotal: 600,
            discountAmount: 86,
            taxAmount: 51,
            totalAmount: 565,
            sortOrder: 2
          },
          {
            lineNumber: 2,
            lineDescription: 'Support Services',
            isLineHeader: true,
            itemType: ItemType.SERVICE,
            itemId: items.support.id,
            itemCode: 'SRV-001',
            description: 'Technical Support - 1 year package',
            quantity: 20,
            unitPrice: 1000,
            discount: 0,
            taxRate: 0,
            subtotal: 20000,
            discountAmount: 0,
            taxAmount: 0,
            totalAmount: 20000,
            sortOrder: 3
          }
        ]
      }
    }
  })

  // Quotation 2 - Draft
  const quotation2 = await prisma.quotation.create({
    data: {
      quotationNumber: 'Q-2024-002',
      salesCaseId: salesCases.leadCase.id,
      version: 1,
      status: QuotationStatus.DRAFT,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      paymentTerms: '45 days net',
      deliveryTerms: 'CIF',
      subtotal: 85000,
      taxAmount: 8500,
      discountAmount: 4722,
      totalAmount: 88778,
      createdBy: salesId,
      items: {
        create: [
          {
            lineNumber: 1,
            lineDescription: 'Smartphones Bulk Order',
            isLineHeader: true,
            itemType: ItemType.PRODUCT,
            itemId: items.smartphone.id,
            itemCode: 'PHN-001',
            description: 'SmartPhone X Pro - Bulk order',
            quantity: 100,
            unitPrice: 850,
            discount: 5.56,
            taxRate: 10,
            subtotal: 85000,
            discountAmount: 4722,
            taxAmount: 8028,
            totalAmount: 88306,
            sortOrder: 1
          }
        ]
      }
    }
  })

  return { quotation1, quotation2 }
}

async function createStockMovements(warehouseId: string, items: any) {
  // Create stock lot for laptop first
  const laptopLot = await prisma.stockLot.create({
    data: {
      lotNumber: 'LOT-LAP-001',
      itemId: items.laptop.id,
      receivedDate: new Date('2024-01-01'),
      receivedQty: 50,
      availableQty: 50,
      unitCost: 800,
      totalCost: 40000,
      createdBy: warehouseId
    }
  })

  // Opening stock for laptop
  await prisma.stockMovement.create({
    data: {
      movementNumber: 'OPEN-0001',
      itemId: items.laptop.id,
      stockLotId: laptopLot.id,
      movementType: MovementType.OPENING,
      movementDate: new Date('2024-01-01'),
      quantity: 50,
      unitCost: 800,
      totalCost: 40000,
      unitOfMeasureId: items.laptop.unitOfMeasureId,
      notes: 'Opening stock balance',
      createdBy: warehouseId
    }
  })

  // Create stock lot for smartphone
  const smartphoneLot = await prisma.stockLot.create({
    data: {
      lotNumber: 'LOT-PHN-001',
      itemId: items.smartphone.id,
      receivedDate: new Date('2024-01-01'),
      receivedQty: 100,
      availableQty: 100,
      unitCost: 600,
      totalCost: 60000,
      createdBy: warehouseId
    }
  })

  // Opening stock for smartphone
  await prisma.stockMovement.create({
    data: {
      movementNumber: 'OPEN-0002',
      itemId: items.smartphone.id,
      stockLotId: smartphoneLot.id,
      movementType: MovementType.OPENING,
      movementDate: new Date('2024-01-01'),
      quantity: 100,
      unitCost: 600,
      totalCost: 60000,
      unitOfMeasureId: items.smartphone.unitOfMeasureId,
      notes: 'Opening stock balance',
      createdBy: warehouseId
    }
  })

  // Create stock lot for mouse
  const mouseLot = await prisma.stockLot.create({
    data: {
      lotNumber: 'LOT-MSE-001',
      itemId: items.mouse.id,
      receivedDate: new Date('2024-01-10'),
      receivedQty: 200,
      availableQty: 200,
      unitCost: 20,
      totalCost: 4000,
      supplierName: 'Tech Supplies Inc',
      purchaseRef: 'PO-2024-001',
      createdBy: warehouseId
    }
  })

  // Stock in for mouse
  await prisma.stockMovement.create({
    data: {
      movementNumber: 'SIN-0001',
      itemId: items.mouse.id,
      stockLotId: mouseLot.id,
      movementType: MovementType.STOCK_IN,
      movementDate: new Date('2024-01-10'),
      quantity: 200,
      unitCost: 20,
      totalCost: 4000,
      unitOfMeasureId: items.mouse.unitOfMeasureId,
      referenceType: 'PURCHASE',
      referenceNumber: 'PO-2024-001',
      notes: 'Regular stock replenishment',
      createdBy: warehouseId
    }
  })

  // Create stock lot for paper with expiry
  const paperLot = await prisma.stockLot.create({
    data: {
      lotNumber: 'LOT-PAP-001',
      itemId: items.paperA4.id,
      receivedDate: new Date('2024-01-05'),
      receivedQty: 500,
      availableQty: 500,
      unitCost: 5,
      totalCost: 2500,
      supplierName: 'Office Supplies Co',
      purchaseRef: 'PO-2024-002',
      expiryDate: new Date('2025-01-05'), // 1 year shelf life
      createdBy: warehouseId
    }
  })

  // Stock in for paper with expiry
  await prisma.stockMovement.create({
    data: {
      movementNumber: 'SIN-0002',
      itemId: items.paperA4.id,
      stockLotId: paperLot.id,
      movementType: MovementType.STOCK_IN,
      movementDate: new Date('2024-01-05'),
      quantity: 500,
      unitCost: 5,
      totalCost: 2500,
      unitOfMeasureId: items.paperA4.unitOfMeasureId,
      referenceType: 'PURCHASE',
      referenceNumber: 'PO-2024-002',
      notes: 'Bulk paper purchase',
      createdBy: warehouseId
    }
  })

  // Some stock out movements
  await prisma.stockMovement.create({
    data: {
      movementNumber: 'SOUT-0001',
      itemId: items.laptop.id,
      movementType: MovementType.STOCK_OUT,
      movementDate: new Date('2024-01-20'),
      quantity: -5,
      unitCost: 800,
      totalCost: 4000,
      unitOfMeasureId: items.laptop.unitOfMeasureId,
      referenceType: 'SALE',
      referenceNumber: 'SO-2024-001',
      notes: 'Sale to customer',
      createdBy: warehouseId
    }
  })

  // Update stock lot available quantity
  await prisma.stockLot.updateMany({
    where: {
      itemId: items.laptop.id,
      lotNumber: 'LOT-LAP-001'
    },
    data: {
      availableQty: 45 // 50 - 5
    }
  })

  // Stock adjustment
  await prisma.stockMovement.create({
    data: {
      movementNumber: 'ADJ-0001',
      itemId: items.mouse.id,
      movementType: MovementType.ADJUSTMENT,
      movementDate: new Date('2024-01-25'),
      quantity: -2,
      unitCost: 20,
      totalCost: 40,
      unitOfMeasureId: items.mouse.unitOfMeasureId,
      referenceType: 'ADJUSTMENT',
      referenceNumber: 'ADJ-2024-001',
      notes: 'Damaged during handling',
      createdBy: warehouseId
    }
  })

  // Update stock lot for adjustment
  await prisma.stockLot.updateMany({
    where: {
      itemId: items.mouse.id,
      lotNumber: 'LOT-MSE-001'
    },
    data: {
      availableQty: 198 // 200 - 2
    }
  })
}

async function createSampleJournalEntries(accountantId: string, accounts: any) {
  // Opening balance entry
  const openingEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE2024-0001',
      date: new Date('2024-01-01'),
      description: 'Opening balances',
      reference: 'OPENING',
      currency: 'USD',
      exchangeRate: 1,
      status: JournalStatus.POSTED,
      postedAt: new Date('2024-01-01'),
      postedBy: accountantId,
      createdBy: accountantId
    }
  })

  // Opening balance lines
  await prisma.journalLine.createMany({
    data: [
      {
        journalEntryId: openingEntry.id,
        accountId: accounts.cash.id,
        description: 'Opening cash balance',
        debitAmount: 100000,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1,
        baseDebitAmount: 100000,
        baseCreditAmount: 0
      },
      {
        journalEntryId: openingEntry.id,
        accountId: accounts.capitalStock.id,
        description: 'Opening capital',
        debitAmount: 0,
        creditAmount: 100000,
        currency: 'USD',
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: 100000
      }
    ]
  })

  // Monthly rent payment
  const rentEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE2024-0002',
      date: new Date('2024-01-05'),
      description: 'Office rent payment - January',
      reference: 'RENT-JAN-2024',
      currency: 'USD',
      exchangeRate: 1,
      status: JournalStatus.POSTED,
      postedAt: new Date('2024-01-05'),
      postedBy: accountantId,
      createdBy: accountantId
    }
  })

  await prisma.journalLine.createMany({
    data: [
      {
        journalEntryId: rentEntry.id,
        accountId: accounts.rentExpense.id,
        description: 'Office rent - January',
        debitAmount: 5000,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1,
        baseDebitAmount: 5000,
        baseCreditAmount: 0
      },
      {
        journalEntryId: rentEntry.id,
        accountId: accounts.cash.id,
        description: 'Cash payment for rent',
        debitAmount: 0,
        creditAmount: 5000,
        currency: 'USD',
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: 5000
      }
    ]
  })

  // Sales transaction
  const salesEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE2024-0003',
      date: new Date('2024-01-20'),
      description: 'Sales invoice #INV-2024-001',
      reference: 'INV-2024-001',
      currency: 'USD',
      exchangeRate: 1,
      status: JournalStatus.POSTED,
      postedAt: new Date('2024-01-20'),
      postedBy: accountantId,
      createdBy: accountantId
    }
  })

  await prisma.journalLine.createMany({
    data: [
      {
        journalEntryId: salesEntry.id,
        accountId: accounts.accountsReceivable.id,
        description: 'Invoice to TechCorp Solutions',
        debitAmount: 6600,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1,
        baseDebitAmount: 6600,
        baseCreditAmount: 0
      },
      {
        journalEntryId: salesEntry.id,
        accountId: accounts.salesRevenue.id,
        description: 'Sales revenue',
        debitAmount: 0,
        creditAmount: 6000,
        currency: 'USD',
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: 6000
      },
      {
        journalEntryId: salesEntry.id,
        accountId: accounts.salesRevenue.id, // Simplified - should be tax payable
        description: 'Sales tax 10%',
        debitAmount: 0,
        creditAmount: 600,
        currency: 'USD',
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: 600
      }
    ]
  })

  // Draft entry for salary accrual
  const salaryEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE2024-0004',
      date: new Date('2024-01-31'),
      description: 'Salary accrual - January',
      reference: 'SAL-JAN-2024',
      currency: 'USD',
      exchangeRate: 1,
      status: JournalStatus.DRAFT,
      createdBy: accountantId
    }
  })

  await prisma.journalLine.createMany({
    data: [
      {
        journalEntryId: salaryEntry.id,
        accountId: accounts.salariesExpense.id,
        description: 'Salaries expense - January',
        debitAmount: 25000,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1,
        baseDebitAmount: 25000,
        baseCreditAmount: 0
      },
      {
        journalEntryId: salaryEntry.id,
        accountId: accounts.accountsPayable.id,
        description: 'Salaries payable',
        debitAmount: 0,
        creditAmount: 25000,
        currency: 'USD',
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: 25000
      }
    ]
  })
}

main()
  .then(() => {
    console.warn('✅ Seed completed successfully')
    process.exit(0)
  })
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })