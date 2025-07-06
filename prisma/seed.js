import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  try {
    // Clean existing data
    await cleanDatabase()
    console.log('✅ Cleaned database')

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
    const quotations = await createQuotations(users.sales.id, customers, inventory.items, salesCases)
    console.log('✅ Created quotations')

    // Create stock movements
    await createStockMovements(users.warehouse.id, inventory.items)
    console.log('✅ Created stock movements')

    // Create sample journal entries
    await createSampleJournalEntries(users.accountant.id, accounts)
    console.log('✅ Created journal entries')

    console.log('🎉 Seed completed successfully!')
    console.log('\nDemo users created:')
    console.log('  Username: admin, Password: demo123')
    console.log('  Username: sales, Password: demo123')
    console.log('  Username: accountant, Password: demo123')
    console.log('  Username: warehouse, Password: demo123')

  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  }
}

async function cleanDatabase() {
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
      role: 'ADMIN',
      isActive: true
    }
  })

  const sales = await prisma.user.create({
    data: {
      username: 'sales',
      email: 'sales@enxi-erp.com',
      password: hashedPassword,
      role: 'USER',
      isActive: true
    }
  })

  const accountant = await prisma.user.create({
    data: {
      username: 'accountant',
      email: 'accountant@enxi-erp.com',
      password: hashedPassword,
      role: 'USER',
      isActive: true
    }
  })

  const warehouse = await prisma.user.create({
    data: {
      username: 'warehouse',
      email: 'warehouse@enxi-erp.com',
      password: hashedPassword,
      role: 'USER',
      isActive: true
    }
  })

  return { admin, sales, accountant, warehouse }
}

async function createChartOfAccounts(userId) {
  // Assets
  const cash = await prisma.account.create({
    data: {
      code: '1000',
      name: 'Cash',
      type: 'ASSET',
      description: 'Cash and cash equivalents',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const accountsReceivable = await prisma.account.create({
    data: {
      code: '1200',
      name: 'Accounts Receivable',
      type: 'ASSET',
      description: 'Customer receivables',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const inventory = await prisma.account.create({
    data: {
      code: '1300',
      name: 'Inventory',
      type: 'ASSET',
      description: 'Inventory asset',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  // Liabilities
  const accountsPayable = await prisma.account.create({
    data: {
      code: '2000',
      name: 'Accounts Payable',
      type: 'LIABILITY',
      description: 'Vendor payables',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  // Equity
  const capitalStock = await prisma.account.create({
    data: {
      code: '3000',
      name: 'Capital Stock',
      type: 'EQUITY',
      description: 'Common stock',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  // Income
  const salesRevenue = await prisma.account.create({
    data: {
      code: '4000',
      name: 'Sales Revenue',
      type: 'INCOME',
      description: 'Revenue from sales',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  // Expenses
  const cogs = await prisma.account.create({
    data: {
      code: '5000',
      name: 'Cost of Goods Sold',
      type: 'EXPENSE',
      description: 'Direct cost of goods sold',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const salariesExpense = await prisma.account.create({
    data: {
      code: '5100',
      name: 'Salaries Expense',
      type: 'EXPENSE',
      description: 'Employee salaries',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const rentExpense = await prisma.account.create({
    data: {
      code: '5200',
      name: 'Rent Expense',
      type: 'EXPENSE',
      description: 'Office rent',
      status: 'ACTIVE',
      createdBy: userId
    }
  })

  const utilitiesExpense = await prisma.account.create({
    data: {
      code: '5300',
      name: 'Utilities Expense',
      type: 'EXPENSE',
      description: 'Utilities and services',
      status: 'ACTIVE',
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

async function createCustomers(adminId, salesId) {
  const techCorp = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-001',
      name: 'TechCorp Solutions',
      email: 'info@techcorp.com',
      phone: '+1 (555) 123-4567',
      website: 'https://techcorp.com',
      industry: 'Technology',
      taxId: '12-3456789',
      currency: 'USD',
      creditLimit: 100000,
      paymentTerms: 30,
      address: '123 Tech Street, Silicon Valley, CA 94000',
      createdBy: adminId
    }
  })

  const globalRetail = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-002',
      name: 'Global Retail Inc',
      email: 'purchasing@globalretail.com',
      phone: '+1 (555) 987-6543',
      website: 'https://globalretail.com',
      industry: 'Retail',
      taxId: '98-7654321',
      currency: 'USD',
      creditLimit: 250000,
      paymentTerms: 45,
      address: '456 Commerce Blvd, New York, NY 10001',
      createdBy: salesId
    }
  })

  const manufacturingCo = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-003',
      name: 'Manufacturing Co Ltd',
      email: 'orders@manufacco.com',
      phone: '+1 (555) 456-7890',
      industry: 'Manufacturing',
      taxId: '45-1234567',
      currency: 'USD',
      creditLimit: 150000,
      paymentTerms: 60,
      address: '789 Industrial Park, Detroit, MI 48201',
      createdBy: salesId
    }
  })

  return { techCorp, globalRetail, manufacturingCo }
}

async function createLeads(salesId) {
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@startuptech.com',
        phone: '+1 (555) 111-2222',
        company: 'StartupTech Inc',
        jobTitle: 'CEO',
        source: 'WEBSITE',
        status: 'NEW',
        notes: 'Interested in our enterprise solution',
        createdBy: salesId
      }
    }),
    prisma.lead.create({
      data: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@healthcareplus.com',
        phone: '+1 (555) 333-4444',
        company: 'Healthcare Plus',
        jobTitle: 'VP of IT',
        source: 'TRADE_SHOW',
        status: 'CONTACTED',
        notes: 'Met at Healthcare Expo 2024',
        createdBy: salesId
      }
    }),
    prisma.lead.create({
      data: {
        firstName: 'Robert',
        lastName: 'Johnson',
        email: 'robert@edufirst.com',
        phone: '+1 (555) 555-6666',
        company: 'Education First',
        jobTitle: 'Director of Technology',
        source: 'REFERRAL',
        status: 'QUALIFIED',
        notes: 'Referred by existing customer',
        createdBy: salesId
      }
    })
  ])

  return leads
}

async function createSalesCases(salesId, customers, leads) {
  // Sales case from existing customer
  const customerCase = await prisma.salesCase.create({
    data: {
      caseNumber: 'SC-2024-001',
      customerId: customers.techCorp.id,
      title: 'Enterprise Software Upgrade',
      description: 'Customer wants to upgrade their existing software to enterprise version',
      status: 'OPEN',
      estimatedValue: 150000,
      actualValue: 0,
      cost: 0,
      profitMargin: 0,
      assignedTo: salesId,
      createdBy: salesId
    }
  })

  // Sales case from another customer
  const leadCase = await prisma.salesCase.create({
    data: {
      caseNumber: 'SC-2024-002',
      customerId: customers.globalRetail.id,
      title: 'New Retail System Implementation',
      description: 'Customer interested in complete retail management system',
      status: 'OPEN',
      estimatedValue: 75000,
      actualValue: 0,
      cost: 0,
      profitMargin: 0,
      assignedTo: salesId,
      createdBy: salesId
    }
  })

  // Sales cases created - updates model not in current schema

  return { customerCase, leadCase }
}

async function createInventoryFoundation(userId, accounts) {
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
      type: 'PRODUCT',
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
      type: 'PRODUCT',
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
      type: 'PRODUCT',
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
      type: 'PRODUCT',
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
      type: 'SERVICE',
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

async function createQuotations(salesId, customers, items, salesCases) {
  // Calculate quotation totals
  const laptopTotal = 20 * 1100 * (1 - 0.0833) // quantity * price * (1 - discount%)
  const mouseTotal = 20 * 30 * (1 - 0.1429)
  const supportTotal = 20 * 1000
  const subtotal1 = laptopTotal + mouseTotal + supportTotal
  const tax1 = (laptopTotal + mouseTotal) * 0.1 // 10% tax on products only
  const total1 = subtotal1 + tax1

  // Quotation 1 - For sales case
  const quotation1 = await prisma.quotation.create({
    data: {
      quotationNumber: 'Q-2024-001',
      salesCaseId: salesCases.customerCase.id,
      version: 1,
      status: 'SENT',
      validUntil: new Date('2024-02-15'),
      subtotal: subtotal1,
      taxAmount: tax1,
      discountAmount: 0,
      totalAmount: total1,
      paymentTerms: '30 days net',
      deliveryTerms: 'FOB Warehouse',
      notes: 'Special pricing for enterprise customer',
      createdBy: salesId,
      items: {
        create: [
          {
            itemId: items.laptop.id,
            itemCode: 'LAP-001',
            description: 'Business Laptop Pro - Enterprise configuration',
            quantity: 20,
            unitPrice: 1100,
            discount: 8.33,
            taxAmount: laptopTotal * 0.1,
            totalAmount: laptopTotal * 1.1,
            sortOrder: 1
          },
          {
            itemId: items.mouse.id,
            itemCode: 'ACC-001',
            description: 'Wireless Mouse - Included with laptop',
            quantity: 20,
            unitPrice: 30,
            discount: 14.29,
            taxAmount: mouseTotal * 0.1,
            totalAmount: mouseTotal * 1.1,
            sortOrder: 2
          },
          {
            itemId: items.support.id,
            itemCode: 'SRV-001',
            description: 'Technical Support - 1 year package',
            quantity: 20,
            unitPrice: 1000,
            discount: 0,
            taxAmount: 0,
            totalAmount: supportTotal,
            sortOrder: 3
          }
        ]
      }
    }
  })

  // Quotation 2 - Draft for lead case
  const phoneTotal = 100 * 850 * (1 - 0.0556)
  const tax2 = phoneTotal * 0.1
  
  const quotation2 = await prisma.quotation.create({
    data: {
      quotationNumber: 'Q-2024-002',
      salesCaseId: salesCases.leadCase.id,
      version: 1,
      status: 'DRAFT',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      subtotal: phoneTotal,
      taxAmount: tax2,
      discountAmount: 0,
      totalAmount: phoneTotal + tax2,
      paymentTerms: '45 days net',
      deliveryTerms: 'CIF',
      createdBy: salesId,
      items: {
        create: [
          {
            itemId: items.smartphone.id,
            itemCode: 'PHN-001',
            description: 'SmartPhone X Pro - Bulk order',
            quantity: 100,
            unitPrice: 850,
            discount: 5.56,
            taxAmount: tax2,
            totalAmount: phoneTotal + tax2,
            sortOrder: 1
          }
        ]
      }
    }
  })

  return { quotation1, quotation2 }
}

async function createStockMovements(warehouseId, items) {
  // Note: Stock movements require the stock movement service to properly handle GL integration
  // For demo purposes, we'll create basic movements without GL entries
  
  // Create stock lots first
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
      movementType: 'OPENING',
      movementDate: new Date('2024-01-01'),
      quantity: 50,
      unitCost: 800,
      totalCost: 40000,
      unitOfMeasureId: items.laptop.unitOfMeasureId,
      notes: 'Opening stock balance',
      createdBy: warehouseId
    }
  })

  // Create smartphone lot
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
      movementType: 'OPENING',
      movementDate: new Date('2024-01-01'),
      quantity: 100,
      unitCost: 600,
      totalCost: 60000,
      unitOfMeasureId: items.smartphone.unitOfMeasureId,
      notes: 'Opening stock balance',
      createdBy: warehouseId
    }
  })

  // Create mouse lot  
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
      movementType: 'STOCK_IN',
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

  // Create paper lot
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
      expiryDate: new Date('2025-01-05'),
      createdBy: warehouseId
    }
  })

  // Stock in for paper with expiry
  await prisma.stockMovement.create({
    data: {
      movementNumber: 'SIN-0002',
      itemId: items.paperA4.id,
      stockLotId: paperLot.id,
      movementType: 'STOCK_IN',
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
      stockLotId: laptopLot.id,
      movementType: 'STOCK_OUT',
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
}

async function createSampleJournalEntries(accountantId, accounts) {
  // Opening balance entry
  const openingEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE2024-0001',
      date: new Date('2024-01-01'),
      description: 'Opening balances',
      reference: 'OPENING',
      currency: 'USD',
      exchangeRate: 1,
      status: 'POSTED',
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
      status: 'POSTED',
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
      status: 'POSTED',
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
      status: 'DRAFT',
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
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })