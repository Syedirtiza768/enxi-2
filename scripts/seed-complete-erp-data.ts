#!/usr/bin/env npx tsx

/**
 * Complete ERP Data Seeding Script
 * 
 * This script populates the database with comprehensive test data
 * following the correct schema and relationships.
 */

import { PrismaClient } from '../lib/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Helper function to generate dates
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)
const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)

async function main() {
  console.log('🌱 Starting Complete ERP Data Seed...\n')

  try {
    // Clean database first
    await cleanDatabase()

    // Step 1: Create Users
    console.log('👥 Creating users...')
    const users = await createUsers()
    console.log('✅ Users created')

    // Step 2: Create Chart of Accounts
    console.log('\n💰 Creating chart of accounts...')
    const accounts = await createChartOfAccounts(users.admin.id)
    console.log('✅ Chart of accounts created')

    // Step 3: Create Customers with AR Accounts
    console.log('\n🏢 Creating customers...')
    const customers = await createCustomers(users.admin.id, accounts.accountsReceivable.id)
    console.log('✅ Customers created with AR accounts')

    // Step 4: Create Leads
    console.log('\n📞 Creating leads...')
    const leads = await createLeads(users.sales.id)
    console.log('✅ Leads created')

    // Step 5: Create Inventory System
    console.log('\n📦 Creating inventory system...')
    const inventory = await createInventorySystem(users.admin.id, accounts)
    console.log('✅ Inventory system created')

    // Step 6: Create Opening Stock
    console.log('\n📊 Creating opening stock...')
    await createOpeningStock(users.warehouse.id, inventory.items)
    console.log('✅ Opening stock created')

    // Step 7: Create Sales Cases
    console.log('\n💼 Creating sales cases...')
    const salesCases = await createSalesCases(users.sales.id, customers, leads)
    console.log('✅ Sales cases created')

    // Step 8: Create Quotations
    console.log('\n📋 Creating quotations...')
    const quotations = await createQuotations(users.sales.id, customers, salesCases, inventory.items)
    console.log('✅ Quotations created')

    // Step 9: Create Customer POs
    console.log('\n📄 Creating customer POs...')
    const customerPOs = await createCustomerPOs(users.sales.id, customers, quotations)
    console.log('✅ Customer POs created')

    // Step 10: Create Sales Orders
    console.log('\n📝 Creating sales orders...')
    const salesOrders = await createSalesOrders(users.sales.id, quotations, salesCases)
    console.log('✅ Sales orders created')

    // Step 11: Create Invoices
    console.log('\n🧾 Creating invoices...')
    const invoices = await createInvoices(users.accountant.id, salesOrders, customers, inventory.items)
    console.log('✅ Invoices created')

    // Step 12: Create Payments
    console.log('\n💳 Creating payments...')
    await createPayments(users.accountant.id, invoices)
    console.log('✅ Payments created')

    // Step 13: Create Journal Entries
    console.log('\n📚 Creating additional journal entries...')
    await createJournalEntries(users.accountant.id, accounts)
    console.log('✅ Journal entries created')

    // Step 14: Create Exchange Rates
    console.log('\n💱 Creating exchange rates...')
    await createExchangeRates(users.admin.id)
    console.log('✅ Exchange rates created')

    // Print Summary
    await printSummary()

  } catch (error) {
    console.error('❌ Seed error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

async function cleanDatabase() {
  console.log('🧹 Cleaning database...')
  
  // Delete in correct order to respect foreign key constraints
  try {
    // Clean tables that exist in the schema
    await prisma.$transaction([
      prisma.auditLog.deleteMany(),
      prisma.payment.deleteMany(),
      prisma.invoiceItem.deleteMany(),
      prisma.invoice.deleteMany(),
      prisma.salesOrderItem.deleteMany(),
      prisma.salesOrder.deleteMany(),
      prisma.customerPO.deleteMany(),
      prisma.quotationItem.deleteMany(),
      prisma.quotation.deleteMany(),
      prisma.caseExpense.deleteMany(),
      prisma.salesCase.deleteMany(),
      prisma.stockLot.deleteMany(),
      prisma.stockMovement.deleteMany(),
      prisma.journalLine.deleteMany(),
      prisma.journalEntry.deleteMany(),
      prisma.exchangeRate.deleteMany(),
      prisma.item.deleteMany(),
      prisma.category.deleteMany(),
      prisma.unitOfMeasure.deleteMany(),
      prisma.lead.deleteMany(),
      prisma.customer.deleteMany(),
      prisma.account.deleteMany(),
      prisma.user.deleteMany()
    ])
    
    console.log('✅ Database cleaned')
  } catch (error) {
    console.log('⚠️ Some tables may not exist, continuing...')
  }
}

async function createUsers() {
  const hashedPassword = await bcrypt.hash('demo123', 10)

  const [admin, sales, accountant, warehouse] = await Promise.all([
    prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@enxi-erp.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        username: 'sarah',
        email: 'sarah@enxi-erp.com',
        password: hashedPassword,
        role: 'USER',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        username: 'michael',
        email: 'michael@enxi-erp.com',
        password: hashedPassword,
        role: 'USER',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        username: 'david',
        email: 'david@enxi-erp.com',
        password: hashedPassword,
        role: 'USER',
        isActive: true
      }
    })
  ])

  return { admin, sales, accountant, warehouse }
}

async function createChartOfAccounts(adminId: string) {
  // Create main accounts
  const [
    cash,
    bank,
    accountsReceivable,
    inventory,
    accountsPayable,
    salesTaxPayable,
    capitalStock,
    retainedEarnings,
    salesRevenue,
    serviceRevenue,
    cogs,
    salariesExpense,
    rentExpense,
    utilitiesExpense
  ] = await Promise.all([
    // Assets
    prisma.account.create({
      data: {
        code: '1000',
        name: 'Cash',
        type: 'ASSET',
        currency: 'USD',
        description: 'Cash on hand',
        createdBy: adminId
      }
    }),
    prisma.account.create({
      data: {
        code: '1010',
        name: 'Bank Account',
        type: 'ASSET',
        currency: 'USD',
        description: 'Business checking account',
        createdBy: adminId
      }
    }),
    prisma.account.create({
      data: {
        code: '1200',
        name: 'Accounts Receivable',
        type: 'ASSET',
        currency: 'USD',
        description: 'Customer receivables',
        createdBy: adminId
      }
    }),
    prisma.account.create({
      data: {
        code: '1300',
        name: 'Inventory',
        type: 'ASSET',
        currency: 'USD',
        description: 'Inventory assets',
        createdBy: adminId
      }
    }),
    // Liabilities
    prisma.account.create({
      data: {
        code: '2000',
        name: 'Accounts Payable',
        type: 'LIABILITY',
        currency: 'USD',
        description: 'Vendor payables',
        createdBy: adminId
      }
    }),
    prisma.account.create({
      data: {
        code: '2200',
        name: 'Sales Tax Payable',
        type: 'LIABILITY',
        currency: 'USD',
        description: 'Sales tax collected',
        createdBy: adminId
      }
    }),
    // Equity
    prisma.account.create({
      data: {
        code: '3000',
        name: 'Capital Stock',
        type: 'EQUITY',
        currency: 'USD',
        description: 'Owner capital',
        createdBy: adminId
      }
    }),
    prisma.account.create({
      data: {
        code: '3100',
        name: 'Retained Earnings',
        type: 'EQUITY',
        currency: 'USD',
        description: 'Accumulated earnings',
        createdBy: adminId
      }
    }),
    // Income
    prisma.account.create({
      data: {
        code: '4000',
        name: 'Sales Revenue',
        type: 'INCOME',
        currency: 'USD',
        description: 'Product sales revenue',
        createdBy: adminId
      }
    }),
    prisma.account.create({
      data: {
        code: '4100',
        name: 'Service Revenue',
        type: 'INCOME',
        currency: 'USD',
        description: 'Service revenue',
        createdBy: adminId
      }
    }),
    // Expenses
    prisma.account.create({
      data: {
        code: '5000',
        name: 'Cost of Goods Sold',
        type: 'EXPENSE',
        currency: 'USD',
        description: 'Direct cost of goods sold',
        createdBy: adminId
      }
    }),
    prisma.account.create({
      data: {
        code: '5100',
        name: 'Salaries Expense',
        type: 'EXPENSE',
        currency: 'USD',
        description: 'Employee salaries',
        createdBy: adminId
      }
    }),
    prisma.account.create({
      data: {
        code: '5200',
        name: 'Rent Expense',
        type: 'EXPENSE',
        currency: 'USD',
        description: 'Office rent',
        createdBy: adminId
      }
    }),
    prisma.account.create({
      data: {
        code: '5300',
        name: 'Utilities Expense',
        type: 'EXPENSE',
        currency: 'USD',
        description: 'Utilities and services',
        createdBy: adminId
      }
    })
  ])

  return {
    cash,
    bank,
    accountsReceivable,
    inventory,
    accountsPayable,
    salesTaxPayable,
    capitalStock,
    retainedEarnings,
    salesRevenue,
    serviceRevenue,
    cogs,
    salariesExpense,
    rentExpense,
    utilitiesExpense
  }
}

async function createCustomers(adminId: string, arParentId: string) {
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        customerNumber: 'CUST-0001',
        name: 'TechCorp Solutions',
        email: 'finance@techcorp.com',
        phone: '+1 (555) 123-4567',
        industry: 'Technology',
        website: 'https://techcorp.com',
        address: '123 Tech Street, San Francisco, CA 94105',
        currency: 'USD',
        creditLimit: 100000,
        paymentTerms: 30,
        status: 'ACTIVE',
        createdBy: adminId,
        account: {
          create: {
            code: '1200-0001',
            name: 'AR - TechCorp Solutions',
            type: 'ASSET',
            currency: 'USD',
            description: 'Accounts Receivable for TechCorp Solutions',
            parentId: arParentId,
            createdBy: adminId
          }
        }
      },
      include: { account: true }
    }),
    prisma.customer.create({
      data: {
        customerNumber: 'CUST-0002',
        name: 'Global Manufacturing Inc',
        email: 'purchasing@globalmanuf.com',
        phone: '+1 (555) 987-6543',
        industry: 'Manufacturing',
        website: 'https://globalmanuf.com',
        address: '456 Industrial Ave, Detroit, MI 48201',
        currency: 'USD',
        creditLimit: 250000,
        paymentTerms: 45,
        status: 'ACTIVE',
        createdBy: adminId,
        account: {
          create: {
            code: '1200-0002',
            name: 'AR - Global Manufacturing Inc',
            type: 'ASSET',
            currency: 'USD',
            description: 'Accounts Receivable for Global Manufacturing Inc',
            parentId: arParentId,
            createdBy: adminId
          }
        }
      },
      include: { account: true }
    }),
    prisma.customer.create({
      data: {
        customerNumber: 'CUST-0003',
        name: 'Healthcare Systems Ltd',
        email: 'procurement@healthsystems.com',
        phone: '+1 (555) 456-7890',
        industry: 'Healthcare',
        website: 'https://healthsystems.com',
        address: '789 Medical Center Dr, Boston, MA 02115',
        currency: 'USD',
        creditLimit: 150000,
        paymentTerms: 30,
        status: 'ACTIVE',
        createdBy: adminId,
        account: {
          create: {
            code: '1200-0003',
            name: 'AR - Healthcare Systems Ltd',
            type: 'ASSET',
            currency: 'USD',
            description: 'Accounts Receivable for Healthcare Systems Ltd',
            parentId: arParentId,
            createdBy: adminId
          }
        }
      },
      include: { account: true }
    })
  ])

  return {
    techCorp: customers[0],
    globalManuf: customers[1],
    healthcare: customers[2]
  }
}

async function createLeads(salesId: string) {
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@startupinc.com',
        phone: '+1 (555) 111-2222',
        company: 'Startup Inc',
        jobTitle: 'CTO',
        source: 'WEBSITE',
        status: 'NEW',
        estimatedValue: 75000,
        notes: 'Interested in our enterprise solution',
        createdBy: salesId
      }
    }),
    prisma.lead.create({
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@retailchain.com',
        phone: '+1 (555) 333-4444',
        company: 'Retail Chain Corp',
        jobTitle: 'VP Operations',
        source: 'TRADE_SHOW',
        status: 'CONTACTED',
        estimatedValue: 200000,
        notes: 'Met at Retail Expo 2024, needs inventory management',
        createdBy: salesId
      }
    }),
    prisma.lead.create({
      data: {
        firstName: 'Robert',
        lastName: 'Johnson',
        email: 'robert.j@financecorp.com',
        phone: '+1 (555) 555-6666',
        company: 'Finance Corp',
        jobTitle: 'CFO',
        source: 'REFERRAL',
        status: 'QUALIFIED',
        estimatedValue: 300000,
        notes: 'Referred by TechCorp, looking for complete ERP solution',
        createdBy: salesId
      }
    })
  ])

  return leads
}

async function createInventorySystem(adminId: string, accounts: any) {
  // Units of Measure
  const [pieces, dozen, hours, kg] = await Promise.all([
    prisma.unitOfMeasure.create({
      data: {
        code: 'PCS',
        name: 'Pieces',
        symbol: 'pcs',
        isBaseUnit: true,
        createdBy: adminId
      }
    }),
    prisma.unitOfMeasure.create({
      data: {
        code: 'DOZ',
        name: 'Dozen',
        symbol: 'dz',
        isBaseUnit: true,
        createdBy: adminId
      }
    }),
    prisma.unitOfMeasure.create({
      data: {
        code: 'HR',
        name: 'Hours',
        symbol: 'hr',
        isBaseUnit: true,
        createdBy: adminId
      }
    }),
    prisma.unitOfMeasure.create({
      data: {
        code: 'KG',
        name: 'Kilogram',
        symbol: 'kg',
        isBaseUnit: true,
        createdBy: adminId
      }
    })
  ])

  // Categories
  const [electronics, computers, accessories, software, services] = await Promise.all([
    prisma.category.create({
      data: {
        code: 'ELEC',
        name: 'Electronics',
        description: 'Electronic products',
        createdBy: adminId
      }
    }),
    prisma.category.create({
      data: {
        code: 'COMP',
        name: 'Computers',
        description: 'Computers and laptops',
        createdBy: adminId
      }
    }),
    prisma.category.create({
      data: {
        code: 'ACC',
        name: 'Accessories',
        description: 'Computer accessories',
        createdBy: adminId
      }
    }),
    prisma.category.create({
      data: {
        code: 'SOFT',
        name: 'Software',
        description: 'Software licenses',
        createdBy: adminId
      }
    }),
    prisma.category.create({
      data: {
        code: 'SRV',
        name: 'Services',
        description: 'Professional services',
        createdBy: adminId
      }
    })
  ])

  // Set parent relationships
  await Promise.all([
    prisma.category.update({
      where: { id: computers.id },
      data: { parentId: electronics.id }
    }),
    prisma.category.update({
      where: { id: accessories.id },
      data: { parentId: electronics.id }
    })
  ])

  // Items
  const items = await Promise.all([
    prisma.item.create({
      data: {
        code: 'LAP-PRO-15',
        name: 'Professional Laptop 15"',
        description: 'High-performance laptop with Intel i7, 16GB RAM, 512GB SSD',
        categoryId: computers.id,
        type: 'PRODUCT',
        unitOfMeasureId: pieces.id,
        trackInventory: true,
        minStockLevel: 5,
        maxStockLevel: 50,
        reorderPoint: 10,
        standardCost: 800,
        listPrice: 1299,
        inventoryAccountId: accounts.inventory.id,
        cogsAccountId: accounts.cogs.id,
        salesAccountId: accounts.salesRevenue.id,
        isSaleable: true,
        isPurchaseable: true,
        createdBy: adminId
      }
    }),
    prisma.item.create({
      data: {
        code: 'LAP-BUS-14',
        name: 'Business Laptop 14"',
        description: 'Standard business laptop with Intel i5, 8GB RAM, 256GB SSD',
        categoryId: computers.id,
        type: 'PRODUCT',
        unitOfMeasureId: pieces.id,
        trackInventory: true,
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderPoint: 20,
        standardCost: 500,
        listPrice: 899,
        inventoryAccountId: accounts.inventory.id,
        cogsAccountId: accounts.cogs.id,
        salesAccountId: accounts.salesRevenue.id,
        isSaleable: true,
        isPurchaseable: true,
        createdBy: adminId
      }
    }),
    prisma.item.create({
      data: {
        code: 'MON-27-4K',
        name: '27" 4K Monitor',
        description: '27-inch 4K UHD monitor with USB-C',
        categoryId: accessories.id,
        type: 'PRODUCT',
        unitOfMeasureId: pieces.id,
        trackInventory: true,
        minStockLevel: 10,
        maxStockLevel: 75,
        reorderPoint: 15,
        standardCost: 250,
        listPrice: 449,
        inventoryAccountId: accounts.inventory.id,
        cogsAccountId: accounts.cogs.id,
        salesAccountId: accounts.salesRevenue.id,
        isSaleable: true,
        isPurchaseable: true,
        createdBy: adminId
      }
    }),
    prisma.item.create({
      data: {
        code: 'KBD-MECH-01',
        name: 'Mechanical Keyboard',
        description: 'Professional mechanical keyboard with RGB',
        categoryId: accessories.id,
        type: 'PRODUCT',
        unitOfMeasureId: pieces.id,
        trackInventory: true,
        minStockLevel: 20,
        maxStockLevel: 200,
        reorderPoint: 40,
        standardCost: 50,
        listPrice: 99,
        inventoryAccountId: accounts.inventory.id,
        cogsAccountId: accounts.cogs.id,
        salesAccountId: accounts.salesRevenue.id,
        isSaleable: true,
        isPurchaseable: true,
        createdBy: adminId
      }
    }),
    prisma.item.create({
      data: {
        code: 'MSE-WIRELESS',
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse',
        categoryId: accessories.id,
        type: 'PRODUCT',
        unitOfMeasureId: pieces.id,
        trackInventory: true,
        minStockLevel: 30,
        maxStockLevel: 300,
        reorderPoint: 60,
        standardCost: 20,
        listPrice: 49,
        inventoryAccountId: accounts.inventory.id,
        cogsAccountId: accounts.cogs.id,
        salesAccountId: accounts.salesRevenue.id,
        isSaleable: true,
        isPurchaseable: true,
        createdBy: adminId
      }
    }),
    prisma.item.create({
      data: {
        code: 'SRV-SETUP',
        name: 'Computer Setup Service',
        description: 'Professional computer setup and configuration',
        categoryId: services.id,
        type: 'SERVICE',
        unitOfMeasureId: pieces.id,
        trackInventory: false,
        standardCost: 50,
        listPrice: 150,
        salesAccountId: accounts.serviceRevenue.id,
        isSaleable: true,
        isPurchaseable: false,
        createdBy: adminId
      }
    }),
    prisma.item.create({
      data: {
        code: 'SRV-SUPPORT',
        name: 'Technical Support',
        description: 'Hourly technical support',
        categoryId: services.id,
        type: 'SERVICE',
        unitOfMeasureId: hours.id,
        trackInventory: false,
        standardCost: 60,
        listPrice: 125,
        salesAccountId: accounts.serviceRevenue.id,
        isSaleable: true,
        isPurchaseable: false,
        createdBy: adminId
      }
    })
  ])

  return {
    units: { pieces, dozen, hours, kg },
    categories: { electronics, computers, accessories, software, services },
    items: {
      laptopPro: items[0],
      laptopBusiness: items[1],
      monitor: items[2],
      keyboard: items[3],
      mouse: items[4],
      setupService: items[5],
      supportService: items[6]
    }
  }
}

async function createOpeningStock(warehouseId: string, items: any) {
  // Create opening stock with FIFO lots
  await Promise.all([
    // Laptop Pro - 2 lots
    prisma.stockMovement.create({
      data: {
        movementNumber: 'OPEN-001',
        itemId: items.laptopPro.id,
        movementType: 'OPENING',
        movementDate: daysAgo(90),
        quantity: 20,
        unitCost: 800,
        totalCost: 16000,
        unitOfMeasureId: items.laptopPro.unitOfMeasureId,
        notes: 'Opening stock - Lot 1',
        createdBy: warehouseId,
        stockLot: {
          create: {
            lotNumber: 'LOT-LAP-PRO-001',
            itemId: items.laptopPro.id,
            receivedDate: daysAgo(90),
            receivedQty: 20,
            availableQty: 20,
            unitCost: 800,
            totalCost: 16000,
            createdBy: warehouseId
          }
        }
      }
    }),
    prisma.stockMovement.create({
      data: {
        movementNumber: 'OPEN-002',
        itemId: items.laptopPro.id,
        movementType: 'STOCK_IN',
        movementDate: daysAgo(60),
        quantity: 15,
        unitCost: 820,
        totalCost: 12300,
        unitOfMeasureId: items.laptopPro.unitOfMeasureId,
        referenceType: 'PURCHASE',
        referenceNumber: 'PO-2024-001',
        supplier: 'Tech Supplies Inc',
        notes: 'Purchase order receipt - Lot 2',
        createdBy: warehouseId,
        stockLot: {
          create: {
            lotNumber: 'LOT-LAP-PRO-002',
            itemId: items.laptopPro.id,
            receivedDate: daysAgo(60),
            receivedQty: 15,
            availableQty: 15,
            unitCost: 820,
            totalCost: 12300,
            supplier: 'Tech Supplies Inc',
            purchaseRef: 'PO-2024-001',
            createdBy: warehouseId
          }
        }
      }
    }),
    
    // Business Laptop - 2 lots
    prisma.stockMovement.create({
      data: {
        movementNumber: 'OPEN-003',
        itemId: items.laptopBusiness.id,
        movementType: 'OPENING',
        movementDate: daysAgo(90),
        quantity: 30,
        unitCost: 500,
        totalCost: 15000,
        unitOfMeasureId: items.laptopBusiness.unitOfMeasureId,
        notes: 'Opening stock - Lot 1',
        createdBy: warehouseId,
        stockLot: {
          create: {
            lotNumber: 'LOT-LAP-BUS-001',
            itemId: items.laptopBusiness.id,
            receivedDate: daysAgo(90),
            receivedQty: 30,
            availableQty: 30,
            unitCost: 500,
            totalCost: 15000,
            createdBy: warehouseId
          }
        }
      }
    }),
    prisma.stockMovement.create({
      data: {
        movementNumber: 'OPEN-004',
        itemId: items.laptopBusiness.id,
        movementType: 'STOCK_IN',
        movementDate: daysAgo(45),
        quantity: 25,
        unitCost: 510,
        totalCost: 12750,
        unitOfMeasureId: items.laptopBusiness.unitOfMeasureId,
        referenceType: 'PURCHASE',
        referenceNumber: 'PO-2024-002',
        supplier: 'Tech Supplies Inc',
        notes: 'Purchase order receipt - Lot 2',
        createdBy: warehouseId,
        stockLot: {
          create: {
            lotNumber: 'LOT-LAP-BUS-002',
            itemId: items.laptopBusiness.id,
            receivedDate: daysAgo(45),
            receivedQty: 25,
            availableQty: 25,
            unitCost: 510,
            totalCost: 12750,
            supplier: 'Tech Supplies Inc',
            purchaseRef: 'PO-2024-002',
            createdBy: warehouseId
          }
        }
      }
    }),

    // Monitors
    prisma.stockMovement.create({
      data: {
        movementNumber: 'OPEN-005',
        itemId: items.monitor.id,
        movementType: 'OPENING',
        movementDate: daysAgo(90),
        quantity: 40,
        unitCost: 250,
        totalCost: 10000,
        unitOfMeasureId: items.monitor.unitOfMeasureId,
        notes: 'Opening stock',
        createdBy: warehouseId,
        stockLot: {
          create: {
            lotNumber: 'LOT-MON-001',
            itemId: items.monitor.id,
            receivedDate: daysAgo(90),
            receivedQty: 40,
            availableQty: 40,
            unitCost: 250,
            totalCost: 10000,
            createdBy: warehouseId
          }
        }
      }
    }),

    // Keyboards
    prisma.stockMovement.create({
      data: {
        movementNumber: 'OPEN-006',
        itemId: items.keyboard.id,
        movementType: 'OPENING',
        movementDate: daysAgo(90),
        quantity: 100,
        unitCost: 50,
        totalCost: 5000,
        unitOfMeasureId: items.keyboard.unitOfMeasureId,
        notes: 'Opening stock',
        createdBy: warehouseId,
        stockLot: {
          create: {
            lotNumber: 'LOT-KBD-001',
            itemId: items.keyboard.id,
            receivedDate: daysAgo(90),
            receivedQty: 100,
            availableQty: 100,
            unitCost: 50,
            totalCost: 5000,
            createdBy: warehouseId
          }
        }
      }
    }),

    // Mice
    prisma.stockMovement.create({
      data: {
        movementNumber: 'OPEN-007',
        itemId: items.mouse.id,
        movementType: 'OPENING',
        movementDate: daysAgo(90),
        quantity: 150,
        unitCost: 20,
        totalCost: 3000,
        unitOfMeasureId: items.mouse.unitOfMeasureId,
        notes: 'Opening stock',
        createdBy: warehouseId,
        stockLot: {
          create: {
            lotNumber: 'LOT-MSE-001',
            itemId: items.mouse.id,
            receivedDate: daysAgo(90),
            receivedQty: 150,
            availableQty: 150,
            unitCost: 20,
            totalCost: 3000,
            createdBy: warehouseId
          }
        }
      }
    })
  ])
}

async function createSalesCases(salesId: string, customers: any, leads: any) {
  const salesCases = await Promise.all([
    // Active case for TechCorp
    prisma.salesCase.create({
      data: {
        caseNumber: 'SC-2024-001',
        title: 'TechCorp Office Refresh 2024',
        description: 'Complete office technology refresh including laptops, monitors, and accessories',
        customerId: customers.techCorp.id,
        estimatedValue: 85000,
        actualValue: 0,
        cost: 0,
        profitMargin: 0,
        probability: 90,
        expectedCloseDate: daysFromNow(30),
        status: 'OPEN',
        assignedTo: salesId,
        createdBy: salesId
      }
    }),

    // Active case for Global Manufacturing
    prisma.salesCase.create({
      data: {
        caseNumber: 'SC-2024-002',
        title: 'Manufacturing Floor IT Upgrade',
        description: 'Ruggedized workstations and monitoring systems for factory floor',
        customerId: customers.globalManuf.id,
        estimatedValue: 125000,
        actualValue: 0,
        cost: 0,
        profitMargin: 0,
        probability: 75,
        expectedCloseDate: daysFromNow(45),
        status: 'OPEN',
        assignedTo: salesId,
        createdBy: salesId
      }
    }),

    // Won case for Healthcare
    prisma.salesCase.create({
      data: {
        caseNumber: 'SC-2024-003',
        title: 'Healthcare Mobile Computing Initiative',
        description: 'Mobile workstations for healthcare providers',
        customerId: customers.healthcare.id,
        estimatedValue: 45000,
        actualValue: 42750,
        cost: 28500,
        profitMargin: 33.33,
        probability: 100,
        expectedCloseDate: daysAgo(15),
        closedAt: daysAgo(15),
        status: 'WON',
        assignedTo: salesId,
        createdBy: salesId
      }
    })
  ])

  // Add some updates to sales cases
  await Promise.all([
    prisma.salesCaseUpdate.create({
      data: {
        salesCaseId: salesCases[0].id,
        updateType: 'NOTE',
        description: 'Initial meeting completed. Customer very interested in our laptop bundles.',
        createdBy: salesId
      }
    }),
    prisma.salesCaseUpdate.create({
      data: {
        salesCaseId: salesCases[0].id,
        updateType: 'ACTIVITY',
        description: 'Demo scheduled for next week.',
        createdBy: salesId
      }
    }),
    prisma.salesCaseUpdate.create({
      data: {
        salesCaseId: salesCases[1].id,
        updateType: 'NOTE',
        description: 'Customer requires ruggedized equipment for factory environment.',
        createdBy: salesId
      }
    })
  ])

  // Add expenses to cases
  await Promise.all([
    prisma.caseExpense.create({
      data: {
        salesCaseId: salesCases[0].id,
        description: 'Travel for customer meeting',
        amount: 450,
        expenseDate: daysAgo(10),
        category: 'TRAVEL',
        accountId: customers.techCorp.accountId!,
        createdBy: salesId
      }
    }),
    prisma.caseExpense.create({
      data: {
        salesCaseId: salesCases[0].id,
        description: 'Demo equipment shipping',
        amount: 125,
        expenseDate: daysAgo(5),
        category: 'OTHER',
        accountId: customers.techCorp.accountId!,
        createdBy: salesId
      }
    })
  ])

  return salesCases
}

async function createQuotations(salesId: string, customers: any, salesCases: any, items: any) {
  // Quotation 1 - TechCorp (Active)
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
      date: daysAgo(10),
      validUntil: daysFromNow(20),
      currency: 'USD',
      exchangeRate: 1,
      paymentTerms: 'Net 30',
      deliveryTerms: 'FOB Destination',
      notes: 'Volume discount applied. Free setup service included.',
      termsAndConditions: 'Standard terms apply. 3-year warranty on all hardware.',
      status: 'SENT',
      isCurrent: true,
      createdBy: salesId,
      items: {
        create: [
          {
            itemId: items.laptopPro.id,
            description: 'Professional Laptop 15" - Executive configuration',
            quantity: 25,
            unitPrice: 1200,
            discountPercent: 7.5,
            taxRate: 8.5,
            sortOrder: 1
          },
          {
            itemId: items.monitor.id,
            description: '27" 4K Monitor - Dual monitor setup',
            quantity: 50,
            unitPrice: 420,
            discountPercent: 6.67,
            taxRate: 8.5,
            sortOrder: 2
          },
          {
            itemId: items.keyboard.id,
            description: 'Mechanical Keyboard - Productivity bundle',
            quantity: 25,
            unitPrice: 90,
            discountPercent: 10,
            taxRate: 8.5,
            sortOrder: 3
          },
          {
            itemId: items.mouse.id,
            description: 'Wireless Mouse - Productivity bundle',
            quantity: 25,
            unitPrice: 45,
            discountPercent: 10,
            taxRate: 8.5,
            sortOrder: 4
          },
          {
            itemId: items.setupService.id,
            description: 'Professional Setup Service - Per workstation',
            quantity: 25,
            unitPrice: 0, // Free with bulk order
            discountPercent: 0,
            taxRate: 0,
            sortOrder: 5
          }
        ]
      }
    }
  })

  // Quotation 2 - Global Manufacturing (Draft)
  const quotation2 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2024-002',
      customerId: customers.globalManuf.id,
      salesCaseId: salesCases[1].id,
      createdBy: salesId
    }
  })

  await prisma.quotationVersion.create({
    data: {
      quotationId: quotation2.id,
      versionNumber: 1,
      date: new Date(),
      validUntil: daysFromNow(30),
      currency: 'USD',
      exchangeRate: 1,
      paymentTerms: 'Net 45',
      deliveryTerms: 'DDP',
      notes: 'Ruggedized equipment for industrial environment',
      termsAndConditions: 'Industrial warranty terms apply',
      status: 'DRAFT',
      isCurrent: true,
      createdBy: salesId,
      items: {
        create: [
          {
            itemId: items.laptopBusiness.id,
            description: 'Business Laptop 14" - Ruggedized with protective case',
            quantity: 40,
            unitPrice: 950,
            discountPercent: 5.26,
            taxRate: 8.5,
            sortOrder: 1
          },
          {
            itemId: items.monitor.id,
            description: '27" 4K Monitor - Industrial mount',
            quantity: 40,
            unitPrice: 480,
            discountPercent: 0,
            taxRate: 8.5,
            sortOrder: 2
          }
        ]
      }
    }
  })

  // Quotation 3 - Healthcare (Accepted)
  const quotation3 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2024-003',
      customerId: customers.healthcare.id,
      salesCaseId: salesCases[2].id,
      createdBy: salesId
    }
  })

  await prisma.quotationVersion.create({
    data: {
      quotationId: quotation3.id,
      versionNumber: 1,
      date: daysAgo(30),
      validUntil: daysAgo(1),
      currency: 'USD',
      exchangeRate: 1,
      paymentTerms: 'Net 30',
      deliveryTerms: 'FOB Origin',
      notes: 'Healthcare compliant configuration',
      termsAndConditions: 'HIPAA compliance included',
      status: 'ACCEPTED',
      isCurrent: true,
      createdBy: salesId,
      items: {
        create: [
          {
            itemId: items.laptopBusiness.id,
            description: 'Business Laptop 14" - Healthcare configuration',
            quantity: 15,
            unitPrice: 850,
            discountPercent: 5.88,
            taxRate: 8.5,
            sortOrder: 1
          },
          {
            itemId: items.setupService.id,
            description: 'Healthcare compliance setup',
            quantity: 15,
            unitPrice: 200,
            discountPercent: 0,
            taxRate: 0,
            sortOrder: 2
          }
        ]
      }
    }
  })

  return [quotation1, quotation2, quotation3]
}

async function createCustomerPOs(salesId: string, customers: any, quotations: any) {
  const customerPOs = await Promise.all([
    // PO for Healthcare (accepted quotation)
    prisma.customerPO.create({
      data: {
        customerPONumber: 'HC-PO-2024-0089',
        quotationId: quotations[2].id,
        customerId: customers.healthcare.id,
        poDate: daysAgo(20),
        requestedDeliveryDate: daysAgo(5),
        amount: 15750,
        currency: 'USD',
        paymentTerms: 'Net 30',
        billingAddress: 'Healthcare Systems Ltd\\nAccounts Payable\\n789 Medical Center Dr\\nBoston, MA 02115',
        shippingAddress: 'Healthcare Systems Ltd\\nIT Department\\n789 Medical Center Dr\\nBoston, MA 02115',
        notes: 'Please deliver to IT department, Building B',
        status: 'ACCEPTED',
        acceptedBy: salesId,
        acceptedAt: daysAgo(20),
        createdBy: salesId
      }
    })
  ])

  return customerPOs
}

async function createSalesOrders(salesId: string, quotations: any, salesCases: any) {
  // Sales Order from Healthcare accepted quotation
  const salesOrder1 = await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-2024-001',
      quotationId: quotations[2].id,
      customerId: quotations[2].customerId,
      salesCaseId: salesCases[2].id,
      orderDate: daysAgo(20),
      requestedDeliveryDate: daysAgo(5),
      currency: 'USD',
      exchangeRate: 1,
      paymentTerms: 'Net 30',
      billingAddress: 'Healthcare Systems Ltd\\nAccounts Payable\\n789 Medical Center Dr\\nBoston, MA 02115',
      shippingAddress: 'Healthcare Systems Ltd\\nIT Department\\n789 Medical Center Dr\\nBoston, MA 02115',
      status: 'DELIVERED',
      notes: 'Rush delivery completed',
      approvedBy: salesId,
      approvedAt: daysAgo(19),
      createdBy: salesId
    }
  })

  // Create order items
  await Promise.all([
    prisma.salesOrderItem.create({
      data: {
        salesOrderId: salesOrder1.id,
        itemId: quotations[2].versions[0].items[0].itemId,
        itemCode: 'LAP-BUS-14',
        description: 'Business Laptop 14" - Healthcare configuration',
        quantity: 15,
        unitPrice: 850,
        discount: 5.88,
        taxRate: 8.5,
        quantityShipped: 15,
        sortOrder: 1
      }
    }),
    prisma.salesOrderItem.create({
      data: {
        salesOrderId: salesOrder1.id,
        itemId: quotations[2].versions[0].items[1].itemId,
        itemCode: 'SRV-SETUP',
        description: 'Healthcare compliance setup',
        quantity: 15,
        unitPrice: 200,
        discount: 0,
        taxRate: 0,
        quantityShipped: 15,
        sortOrder: 2
      }
    })
  ])

  // Update stock for shipped items (FIFO)
  await prisma.stockMovement.create({
    data: {
      movementNumber: 'SOUT-001',
      itemId: quotations[2].versions[0].items[0].itemId,
      movementType: 'STOCK_OUT',
      movementDate: daysAgo(5),
      quantity: -15,
      unitCost: 500, // FIFO - taking from first lot
      totalCost: 7500,
      unitOfMeasureId: quotations[2].versions[0].items[0].item.unitOfMeasureId,
      referenceType: 'SALE',
      referenceNumber: 'SO-2024-001',
      notes: 'Shipped to Healthcare Systems',
      createdBy: salesId
    }
  })

  // Update stock lot
  await prisma.stockLot.update({
    where: { lotNumber: 'LOT-LAP-BUS-001' },
    data: { availableQty: 15 } // 30 - 15
  })

  return [salesOrder1]
}

async function createInvoices(accountantId: string, salesOrders: any, customers: any, items: any) {
  // Invoice for delivered Healthcare order
  const invoice1 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2024-001',
      salesOrderId: salesOrders[0].id,
      customerId: customers.healthcare.id,
      type: 'SALES',
      status: 'SENT',
      invoiceDate: daysAgo(5),
      dueDate: daysFromNow(25), // Net 30
      subtotal: 15750,
      taxAmount: 1083.75,
      discountAmount: 750,
      totalAmount: 16083.75,
      balanceAmount: 6083.75, // Partial payment made
      paidAmount: 10000,
      paymentTerms: 'Net 30',
      billingAddress: 'Healthcare Systems Ltd\\nAccounts Payable\\n789 Medical Center Dr\\nBoston, MA 02115',
      notes: 'Thank you for your business!',
      sentBy: accountantId,
      sentAt: daysAgo(5),
      createdBy: accountantId
    }
  })

  // Create invoice items
  await Promise.all([
    prisma.invoiceItem.create({
      data: {
        invoiceId: invoice1.id,
        itemId: items.laptopBusiness.id,
        itemCode: 'LAP-BUS-14',
        description: 'Business Laptop 14" - Healthcare configuration',
        quantity: 15,
        unitPrice: 850,
        discount: 5.88,
        taxRate: 8.5,
        subtotal: 12750,
        discountAmount: 750,
        taxAmount: 1083.75,
        totalAmount: 13083.75
      }
    }),
    prisma.invoiceItem.create({
      data: {
        invoiceId: invoice1.id,
        itemId: items.setupService.id,
        itemCode: 'SRV-SETUP',
        description: 'Healthcare compliance setup',
        quantity: 15,
        unitPrice: 200,
        discount: 0,
        taxRate: 0,
        subtotal: 3000,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 3000
      }
    })
  ])

  // Create a standalone service invoice for TechCorp
  const invoice2 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2024-002',
      customerId: customers.techCorp.id,
      type: 'SALES',
      status: 'PAID',
      invoiceDate: daysAgo(45),
      dueDate: daysAgo(15),
      subtotal: 1000,
      taxAmount: 85,
      discountAmount: 0,
      totalAmount: 1085,
      balanceAmount: 0,
      paidAmount: 1085,
      paymentTerms: 'Net 30',
      billingAddress: 'TechCorp Solutions\\nFinance Department\\n123 Tech Street\\nSan Francisco, CA 94105',
      notes: 'Support services for January 2024',
      sentBy: accountantId,
      sentAt: daysAgo(45),
      paidAt: daysAgo(20),
      createdBy: accountantId
    }
  })

  await prisma.invoiceItem.create({
    data: {
      invoiceId: invoice2.id,
      itemId: items.supportService.id,
      itemCode: 'SRV-SUPPORT',
      description: 'Technical Support - January 2024',
      quantity: 8,
      unitPrice: 125,
      discount: 0,
      taxRate: 8.5,
      subtotal: 1000,
      discountAmount: 0,
      taxAmount: 85,
      totalAmount: 1085
    }
  })

  return [invoice1, invoice2]
}

async function createPayments(accountantId: string, invoices: any) {
  // Partial payment for Healthcare invoice
  await prisma.payment.create({
    data: {
      paymentNumber: 'PAY-2024-001',
      invoiceId: invoices[0].id,
      customerId: invoices[0].customerId,
      amount: 10000,
      paymentDate: daysAgo(3),
      paymentMethod: 'BANK_TRANSFER',
      reference: 'Wire Ref: HC-89456',
      notes: 'Partial payment - balance to follow',
      createdBy: accountantId
    }
  })

  // Update invoice status to PARTIAL
  await prisma.invoice.update({
    where: { id: invoices[0].id },
    data: { status: 'PARTIAL' }
  })

  // Full payment for TechCorp service invoice
  await prisma.payment.create({
    data: {
      paymentNumber: 'PAY-2024-002',
      invoiceId: invoices[1].id,
      customerId: invoices[1].customerId,
      amount: 1085,
      paymentDate: daysAgo(20),
      paymentMethod: 'CHECK',
      reference: 'Check #12345',
      notes: 'Payment in full',
      createdBy: accountantId
    }
  })
}

async function createJournalEntries(accountantId: string, accounts: any) {
  // Opening balances
  const openingEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2024-001',
      date: daysAgo(90),
      description: 'Opening balances',
      reference: 'OPENING-2024',
      currency: 'USD',
      exchangeRate: 1,
      status: 'POSTED',
      postedAt: daysAgo(90),
      postedBy: accountantId,
      createdBy: accountantId
    }
  })

  await Promise.all([
    prisma.journalLine.create({
      data: {
        journalEntryId: openingEntry.id,
        accountId: accounts.bank.id,
        description: 'Opening bank balance',
        debitAmount: 100000,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1,
        baseDebitAmount: 100000,
        baseCreditAmount: 0
      }
    }),
    prisma.journalLine.create({
      data: {
        journalEntryId: openingEntry.id,
        accountId: accounts.inventory.id,
        description: 'Opening inventory',
        debitAmount: 84050,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1,
        baseDebitAmount: 84050,
        baseCreditAmount: 0
      }
    }),
    prisma.journalLine.create({
      data: {
        journalEntryId: openingEntry.id,
        accountId: accounts.capitalStock.id,
        description: 'Capital contribution',
        debitAmount: 0,
        creditAmount: 184050,
        currency: 'USD',
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: 184050
      }
    })
  ])

  // Monthly expenses
  const expenseEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2024-002',
      date: daysAgo(30),
      description: 'Monthly operating expenses',
      reference: 'EXP-JAN-2024',
      currency: 'USD',
      exchangeRate: 1,
      status: 'POSTED',
      postedAt: daysAgo(30),
      postedBy: accountantId,
      createdBy: accountantId
    }
  })

  await Promise.all([
    prisma.journalLine.create({
      data: {
        journalEntryId: expenseEntry.id,
        accountId: accounts.rentExpense.id,
        description: 'Office rent - January',
        debitAmount: 5000,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1,
        baseDebitAmount: 5000,
        baseCreditAmount: 0
      }
    }),
    prisma.journalLine.create({
      data: {
        journalEntryId: expenseEntry.id,
        accountId: accounts.salariesExpense.id,
        description: 'Salaries - January',
        debitAmount: 25000,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1,
        baseDebitAmount: 25000,
        baseCreditAmount: 0
      }
    }),
    prisma.journalLine.create({
      data: {
        journalEntryId: expenseEntry.id,
        accountId: accounts.utilitiesExpense.id,
        description: 'Utilities - January',
        debitAmount: 1500,
        creditAmount: 0,
        currency: 'USD',
        exchangeRate: 1,
        baseDebitAmount: 1500,
        baseCreditAmount: 0
      }
    }),
    prisma.journalLine.create({
      data: {
        journalEntryId: expenseEntry.id,
        accountId: accounts.bank.id,
        description: 'Cash payment for expenses',
        debitAmount: 0,
        creditAmount: 31500,
        currency: 'USD',
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: 31500
      }
    })
  ])
}

async function createExchangeRates(adminId: string) {
  await Promise.all([
    prisma.exchangeRate.create({
      data: {
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        rate: 1.08,
        effectiveDate: new Date(),
        source: 'MANUAL',
        createdBy: adminId
      }
    }),
    prisma.exchangeRate.create({
      data: {
        fromCurrency: 'GBP',
        toCurrency: 'USD',
        rate: 1.27,
        effectiveDate: new Date(),
        source: 'MANUAL',
        createdBy: adminId
      }
    }),
    prisma.exchangeRate.create({
      data: {
        fromCurrency: 'CAD',
        toCurrency: 'USD',
        rate: 0.74,
        effectiveDate: new Date(),
        source: 'MANUAL',
        createdBy: adminId
      }
    })
  ])
}

async function printSummary() {
  console.log('\n' + '='.repeat(60))
  console.log('📊 SEED DATA SUMMARY')
  console.log('='.repeat(60))

  const [
    users,
    accounts,
    customers,
    leads,
    categories,
    items,
    stockMovements,
    stockLots,
    salesCases,
    quotations,
    customerPOs,
    salesOrders,
    invoices,
    payments,
    journalEntries,
    exchangeRates
  ] = await Promise.all([
    prisma.user.count(),
    prisma.account.count(),
    prisma.customer.count(),
    prisma.lead.count(),
    prisma.category.count(),
    prisma.item.count(),
    prisma.stockMovement.count(),
    prisma.stockLot.count(),
    prisma.salesCase.count(),
    prisma.quotation.count(),
    prisma.customerPO.count(),
    prisma.salesOrder.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.journalEntry.count(),
    prisma.exchangeRate.count()
  ])

  console.log('\n📈 DATA CREATED:')
  console.log(`   👥 Users: ${users}`)
  console.log(`   💰 GL Accounts: ${accounts}`)
  console.log(`   🏢 Customers: ${customers} (with AR accounts)`)
  console.log(`   📞 Leads: ${leads}`)
  console.log(`   📂 Categories: ${categories}`)
  console.log(`   📦 Items: ${items}`)
  console.log(`   📊 Stock Movements: ${stockMovements}`)
  console.log(`   🏷️ Stock Lots (FIFO): ${stockLots}`)
  console.log(`   💼 Sales Cases: ${salesCases}`)
  console.log(`   📋 Quotations: ${quotations}`)
  console.log(`   📄 Customer POs: ${customerPOs}`)
  console.log(`   📝 Sales Orders: ${salesOrders}`)
  console.log(`   🧾 Invoices: ${invoices}`)
  console.log(`   💳 Payments: ${payments}`)
  console.log(`   📚 Journal Entries: ${journalEntries}`)
  console.log(`   💱 Exchange Rates: ${exchangeRates}`)

  console.log('\n🔑 LOGIN CREDENTIALS:')
  console.log('   Admin: admin / demo123')
  console.log('   Sales: sarah / demo123')
  console.log('   Accountant: michael / demo123')
  console.log('   Warehouse: david / demo123')

  console.log('\n📋 TEST SCENARIOS READY:')
  console.log('   ✅ Complete sales workflow (Lead → Customer → Sales Case → Quote → Order → Invoice → Payment)')
  console.log('   ✅ Inventory with FIFO costing (multiple lots with different costs)')
  console.log('   ✅ Partial payments and invoice status transitions')
  console.log('   ✅ Customer credit management with AR accounts')
  console.log('   ✅ Journal entries and GL integration')
  console.log('   ✅ Multi-currency support with exchange rates')

  console.log('\n🎯 BUSINESS SCENARIOS:')
  console.log('   1. TechCorp: Active quotation ready to convert to order')
  console.log('   2. Global Manufacturing: Draft quotation to be finalized')
  console.log('   3. Healthcare Systems: Completed order with partial payment')
  console.log('   4. Service invoicing and full payment example')
  console.log('   5. Multiple FIFO lots for inventory costing')

  console.log('\n✅ ERP SYSTEM FULLY SEEDED AND READY FOR TESTING!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })