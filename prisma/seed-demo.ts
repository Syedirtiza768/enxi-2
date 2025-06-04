import { PrismaClient } from '../lib/generated/prisma'
import bcrypt from 'bcryptjs'
import { 
  AccountType, 
  Role, 
  CustomerStatus, 
  LeadStatus,
  SalesCaseStatus,
  QuotationStatus,
  ItemType,
  MovementType,
  JournalStatus
} from '../lib/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Clean existing data
  await cleanDatabase()

  // Create users
  const users = await createUsers()
  console.log('✅ Created users')

  // Create chart of accounts
  const accounts = await createChartOfAccounts(users.admin.id)
  console.log('✅ Created chart of accounts')

  // Create customers
  const customers = await createCustomers(users.admin.id, users.sales.id)
  console.log('✅ Created customers')

  // Create leads
  const leads = await createLeads(users.sales.id)
  console.log('✅ Created leads')

  // Create sales cases
  const salesCases = await createSalesCases(users.sales.id, customers, leads)
  console.log('✅ Created sales cases')

  // Create inventory foundation
  const inventory = await createInventoryFoundation(users.admin.id, accounts)
  console.log('✅ Created inventory foundation')

  // Create quotations
  const quotations = await createQuotations(users.sales.id, customers, inventory.items)
  console.log('✅ Created quotations')

  // Create stock movements
  await createStockMovements(users.warehouse.id, inventory.items)
  console.log('✅ Created stock movements')

  // Create sample journal entries
  await createSampleJournalEntries(users.accountant.id, accounts)
  console.log('✅ Created journal entries')

  console.log('🎉 Seed completed successfully!')
}

async function cleanDatabase() {
  // Delete in correct order to respect foreign keys
  await prisma.auditLog.deleteMany()
  await prisma.journalLine.deleteMany()
  await prisma.journalEntry.deleteMany()
  await prisma.quotationItem.deleteMany()
  await prisma.quotationVersion.deleteMany()
  await prisma.quotation.deleteMany()
  await prisma.salesCaseUpdate.deleteMany()
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
      firstName: 'Admin',
      lastName: 'User',
      isActive: true
    }
  })

  const sales = await prisma.user.create({
    data: {
      username: 'sales',
      email: 'sales@enxi-erp.com',
      password: hashedPassword,
      role: Role.USER,
      firstName: 'Sarah',
      lastName: 'Johnson',
      isActive: true
    }
  })

  const accountant = await prisma.user.create({
    data: {
      username: 'accountant',
      email: 'accountant@enxi-erp.com',
      password: hashedPassword,
      role: Role.USER,
      firstName: 'Michael',
      lastName: 'Chen',
      isActive: true
    }
  })

  const warehouse = await prisma.user.create({
    data: {
      username: 'warehouse',
      email: 'warehouse@enxi-erp.com',
      password: hashedPassword,
      role: Role.USER,
      firstName: 'David',
      lastName: 'Smith',
      isActive: true
    }
  })

  return { admin, sales, accountant, warehouse }
}

async function createChartOfAccounts(userId: string) {
  // Assets
  const cash = await prisma.account.create({
    data: {
      code: '1000',
      name: 'Cash',
      type: AccountType.ASSET,
      description: 'Cash and cash equivalents',
      isActive: true,
      createdBy: userId
    }
  })

  const accountsReceivable = await prisma.account.create({
    data: {
      code: '1200',
      name: 'Accounts Receivable',
      type: AccountType.ASSET,
      description: 'Customer receivables',
      isActive: true,
      createdBy: userId
    }
  })

  const inventory = await prisma.account.create({
    data: {
      code: '1300',
      name: 'Inventory',
      type: AccountType.ASSET,
      description: 'Inventory asset',
      isActive: true,
      createdBy: userId
    }
  })

  // Liabilities
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

  // Equity
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

  // Income
  const salesRevenue = await prisma.account.create({
    data: {
      code: '4000',
      name: 'Sales Revenue',
      type: AccountType.INCOME,
      description: 'Revenue from sales',
      isActive: true,
      createdBy: userId
    }
  })

  // Expenses
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
      name: 'Salaries Expense',
      type: AccountType.EXPENSE,
      description: 'Employee salaries',
      isActive: true,
      createdBy: userId
    }
  })

  const rentExpense = await prisma.account.create({
    data: {
      code: '5200',
      name: 'Rent Expense',
      type: AccountType.EXPENSE,
      description: 'Office rent',
      isActive: true,
      createdBy: userId
    }
  })

  const utilitiesExpense = await prisma.account.create({
    data: {
      code: '5300',
      name: 'Utilities Expense',
      type: AccountType.EXPENSE,
      description: 'Utilities and services',
      isActive: true,
      createdBy: userId
    }
  })

  return {
    cash,
    accountsReceivable,
    inventory,
    accountsPayable,
    capitalStock,
    salesRevenue,
    cogs,
    salariesExpense,
    rentExpense,
    utilitiesExpense
  }
}

async function createCustomers(adminId: string, salesId: string) {
  const techCorp = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-001',
      companyName: 'TechCorp Solutions',
      tradeName: 'TechCorp',
      taxId: '12-3456789',
      email: 'info@techcorp.com',
      phone: '+1 (555) 123-4567',
      website: 'https://techcorp.com',
      industry: 'Technology',
      numberOfEmployees: 250,
      annualRevenue: 25000000,
      creditLimit: 100000,
      paymentTerms: 30,
      status: CustomerStatus.ACTIVE,
      createdBy: adminId
    }
  })

  const globalRetail = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-002',
      companyName: 'Global Retail Inc',
      tradeName: 'Global Retail',
      taxId: '98-7654321',
      email: 'purchasing@globalretail.com',
      phone: '+1 (555) 987-6543',
      website: 'https://globalretail.com',
      industry: 'Retail',
      numberOfEmployees: 5000,
      annualRevenue: 500000000,
      creditLimit: 250000,
      paymentTerms: 45,
      status: CustomerStatus.ACTIVE,
      createdBy: salesId
    }
  })

  const manufacturingCo = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-003',
      companyName: 'Manufacturing Co Ltd',
      tradeName: 'ManufacCo',
      taxId: '45-1234567',
      email: 'orders@manufacco.com',
      phone: '+1 (555) 456-7890',
      industry: 'Manufacturing',
      numberOfEmployees: 1000,
      annualRevenue: 100000000,
      creditLimit: 150000,
      paymentTerms: 60,
      status: CustomerStatus.ACTIVE,
      createdBy: salesId
    }
  })

  return { techCorp, globalRetail, manufacturingCo }
}

async function createLeads(salesId: string) {
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        companyName: 'StartupTech Inc',
        contactName: 'John Doe',
        email: 'john@startuptech.com',
        phone: '+1 (555) 111-2222',
        industry: 'Software',
        estimatedValue: 50000,
        status: LeadStatus.NEW,
        source: 'Website',
        notes: 'Interested in our enterprise solution',
        createdBy: salesId
      }
    }),
    prisma.lead.create({
      data: {
        companyName: 'Healthcare Plus',
        contactName: 'Jane Smith',
        email: 'jane@healthcareplus.com',
        phone: '+1 (555) 333-4444',
        industry: 'Healthcare',
        estimatedValue: 75000,
        status: LeadStatus.CONTACTED,
        source: 'Trade Show',
        notes: 'Met at Healthcare Expo 2024',
        createdBy: salesId
      }
    }),
    prisma.lead.create({
      data: {
        companyName: 'Education First',
        contactName: 'Robert Johnson',
        email: 'robert@edufirst.com',
        phone: '+1 (555) 555-6666',
        industry: 'Education',
        estimatedValue: 30000,
        status: LeadStatus.QUALIFIED,
        source: 'Referral',
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
      probability: 80,
      expectedCloseDate: new Date('2024-03-31'),
      stage: 'Proposal',
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
      leadId: leads[1].id, // Healthcare Plus
      estimatedValue: 75000,
      probability: 60,
      expectedCloseDate: new Date('2024-04-30'),
      stage: 'Discovery',
      status: SalesCaseStatus.IN_PROGRESS,
      assignedTo: salesId,
      createdBy: salesId
    }
  })

  // Add updates to sales cases
  await prisma.salesCaseUpdate.create({
    data: {
      salesCaseId: customerCase.id,
      updateType: 'PROGRESS',
      description: 'Initial meeting completed. Customer very interested.',
      createdBy: salesId
    }
  })

  await prisma.salesCaseUpdate.create({
    data: {
      salesCaseId: customerCase.id,
      updateType: 'PROGRESS',
      description: 'Demo scheduled for next week.',
      createdBy: salesId
    }
  })

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
  customers: any, 
  items: any
) {
  // Quotation 1 - Active
  const quotation1 = await prisma.quotation.create({
    data: {
      quotationNumber: 'Q-2024-001',
      customerId: customers.techCorp.id,
      createdBy: salesId
    }
  })

  const version1 = await prisma.quotationVersion.create({
    data: {
      quotationId: quotation1.id,
      versionNumber: 1,
      date: new Date('2024-01-15'),
      validUntil: new Date('2024-02-15'),
      currency: 'USD',
      exchangeRate: 1,
      paymentTerms: '30 days net',
      deliveryTerms: 'FOB Warehouse',
      notes: 'Special pricing for enterprise customer',
      termsAndConditions: 'Standard terms apply',
      status: QuotationStatus.SENT,
      isCurrent: true,
      createdBy: salesId,
      items: {
        create: [
          {
            itemId: items.laptop.id,
            description: 'Business Laptop Pro - Enterprise configuration',
            quantity: 20,
            unitPrice: 1100,
            discountPercent: 8.33,
            taxRate: 10,
            sortOrder: 1
          },
          {
            itemId: items.mouse.id,
            description: 'Wireless Mouse - Included with laptop',
            quantity: 20,
            unitPrice: 30,
            discountPercent: 14.29,
            taxRate: 10,
            sortOrder: 2
          },
          {
            itemId: items.support.id,
            description: 'Technical Support - 1 year package',
            quantity: 20,
            unitPrice: 1000,
            discountPercent: 0,
            taxRate: 0,
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
      customerId: customers.globalRetail.id,
      createdBy: salesId
    }
  })

  const version2 = await prisma.quotationVersion.create({
    data: {
      quotationId: quotation2.id,
      versionNumber: 1,
      date: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      currency: 'USD',
      exchangeRate: 1,
      paymentTerms: '45 days net',
      deliveryTerms: 'CIF',
      status: QuotationStatus.DRAFT,
      isCurrent: true,
      createdBy: salesId,
      items: {
        create: [
          {
            itemId: items.smartphone.id,
            description: 'SmartPhone X Pro - Bulk order',
            quantity: 100,
            unitPrice: 850,
            discountPercent: 5.56,
            taxRate: 10,
            sortOrder: 1
          }
        ]
      }
    }
  })

  return { quotation1, quotation2 }
}

async function createStockMovements(warehouseId: string, items: any) {
  // Opening stock for laptop
  await prisma.stockMovement.create({
    data: {
      movementNumber: 'OPEN-0001',
      itemId: items.laptop.id,
      movementType: MovementType.OPENING,
      movementDate: new Date('2024-01-01'),
      quantity: 50,
      unitCost: 800,
      totalCost: 40000,
      unitOfMeasureId: items.laptop.unitOfMeasureId,
      notes: 'Opening stock balance',
      createdBy: warehouseId,
      stockLot: {
        create: {
          lotNumber: 'LOT-LAP-001',
          itemId: items.laptop.id,
          receivedDate: new Date('2024-01-01'),
          receivedQty: 50,
          availableQty: 50,
          unitCost: 800,
          totalCost: 40000,
          createdBy: warehouseId
        }
      }
    }
  })

  // Opening stock for smartphone
  await prisma.stockMovement.create({
    data: {
      movementNumber: 'OPEN-0002',
      itemId: items.smartphone.id,
      movementType: MovementType.OPENING,
      movementDate: new Date('2024-01-01'),
      quantity: 100,
      unitCost: 600,
      totalCost: 60000,
      unitOfMeasureId: items.smartphone.unitOfMeasureId,
      notes: 'Opening stock balance',
      createdBy: warehouseId,
      stockLot: {
        create: {
          lotNumber: 'LOT-PHN-001',
          itemId: items.smartphone.id,
          receivedDate: new Date('2024-01-01'),
          receivedQty: 100,
          availableQty: 100,
          unitCost: 600,
          totalCost: 60000,
          createdBy: warehouseId
        }
      }
    }
  })

  // Stock in for mouse
  await prisma.stockMovement.create({
    data: {
      movementNumber: 'SIN-0001',
      itemId: items.mouse.id,
      movementType: MovementType.STOCK_IN,
      movementDate: new Date('2024-01-10'),
      quantity: 200,
      unitCost: 20,
      totalCost: 4000,
      unitOfMeasureId: items.mouse.unitOfMeasureId,
      referenceType: 'PURCHASE',
      referenceNumber: 'PO-2024-001',
      supplier: 'Tech Supplies Inc',
      notes: 'Regular stock replenishment',
      createdBy: warehouseId,
      stockLot: {
        create: {
          lotNumber: 'LOT-MSE-001',
          itemId: items.mouse.id,
          receivedDate: new Date('2024-01-10'),
          receivedQty: 200,
          availableQty: 200,
          unitCost: 20,
          totalCost: 4000,
          supplier: 'Tech Supplies Inc',
          purchaseRef: 'PO-2024-001',
          createdBy: warehouseId
        }
      }
    }
  })

  // Stock in for paper with expiry
  await prisma.stockMovement.create({
    data: {
      movementNumber: 'SIN-0002',
      itemId: items.paperA4.id,
      movementType: MovementType.STOCK_IN,
      movementDate: new Date('2024-01-05'),
      quantity: 500,
      unitCost: 5,
      totalCost: 2500,
      unitOfMeasureId: items.paperA4.unitOfMeasureId,
      referenceType: 'PURCHASE',
      referenceNumber: 'PO-2024-002',
      supplier: 'Office Supplies Co',
      notes: 'Bulk paper purchase',
      createdBy: warehouseId,
      stockLot: {
        create: {
          lotNumber: 'LOT-PAP-001',
          itemId: items.paperA4.id,
          receivedDate: new Date('2024-01-05'),
          receivedQty: 500,
          availableQty: 500,
          unitCost: 5,
          totalCost: 2500,
          supplier: 'Office Supplies Co',
          purchaseRef: 'PO-2024-002',
          expiryDate: new Date('2025-01-05'), // 1 year shelf life
          createdBy: warehouseId
        }
      }
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
    console.log('✅ Seed completed')
    process.exit(0)
  })
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })