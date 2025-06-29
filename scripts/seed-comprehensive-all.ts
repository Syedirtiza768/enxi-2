#!/usr/bin/env npx tsx

/**
 * Comprehensive All-in-One Seed Script
 * 
 * This script combines all specialized seed scripts into one comprehensive seeding solution:
 * 1. Admin user creation
 * 2. User permissions and roles
 * 3. Complete accounting data with GL postings
 * 4. Inventory items and categories
 * 5. Customer and sales case scenarios
 * 6. Tax configuration
 * 7. Edge case testing data
 * 8. Comprehensive payment scenarios
 * 
 * Usage: npx tsx scripts/seed-comprehensive-all.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient({
  log: ['error', 'warn'],
})

// Configuration
const CONFIG = {
  BATCH_SIZE: 50,
  TRANSACTION_TIMEOUT: 600000, // 10 minutes
  DEFAULT_CURRENCY: 'AED',
  BASE_CURRENCY: 'AED',
}

// Helper functions
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)
const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)
const randomAmount = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 100) / 100
const generateItemCode = (prefix: string) => `${prefix}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
const generateCustomerNumber = () => `CUST-${Date.now().toString().slice(-6)}`
const generateQuotationNumber = () => `QT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
const generateOrderNumber = () => `SO-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
const generateInvoiceNumber = () => `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
const generateMovementNumber = () => `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`

interface SeedResult {
  users: Record<string, any>
  companySettings: any
  accounts: Record<string, any>
  taxConfig: any
  customers: any[]
  suppliers: any[]
  items: any[]
  salesCases: any[]
  quotations: any[]
  salesOrders: any[]
  invoices: any[]
  payments: any[]
}

async function main(): Promise<void> {
  console.log('🌱 Starting Comprehensive All-in-One Seed...\n')

  try {
    // Clean existing data
    await cleanDatabase()

    // Start seeding process
    const result: SeedResult = {
      users: {},
      companySettings: null,
      accounts: {},
      taxConfig: null,
      customers: [],
      suppliers: [],
      items: [],
      salesCases: [],
      quotations: [],
      salesOrders: [],
      invoices: [],
      payments: [],
    }

    // 1. Create users and permissions
    console.log('\n👥 Creating users and permissions...')
    result.users = await seedUsersAndPermissions()
    console.log('✅ Users and permissions created')

    // 2. Create company settings
    console.log('\n🏢 Creating company settings...')
    result.companySettings = await seedCompanySettings()
    console.log('✅ Company settings created')

    // 3. Create chart of accounts
    console.log('\n💼 Creating chart of accounts...')
    result.accounts = await seedChartOfAccounts(result.users.admin.id)
    console.log('✅ Chart of accounts created')

    // 4. Create tax configuration
    console.log('\n🧾 Creating tax configuration...')
    result.taxConfig = await seedTaxConfiguration(result.users.admin.id, result.accounts)
    console.log('✅ Tax configuration created')

    // 5. Create exchange rates
    console.log('\n💱 Creating exchange rates...')
    await seedExchangeRates(result.users.admin.id)
    console.log('✅ Exchange rates created')

    // 6. Create units of measure
    console.log('\n📏 Creating units of measure...')
    const units = await seedUnitsOfMeasure(result.users.admin.id)
    console.log('✅ Units of measure created')

    // 7. Create inventory categories
    console.log('\n📁 Creating inventory categories...')
    const categories = await seedInventoryCategories(result.users.admin.id)
    console.log('✅ Inventory categories created')

    // 8. Create inventory items
    console.log('\n📦 Creating inventory items...')
    result.items = await seedInventoryItems(result.users.admin.id, categories, units, result.accounts)
    console.log('✅ Inventory items created')

    // 9. Create customers (including edge cases)
    console.log('\n👤 Creating customers...')
    result.customers = await seedCustomers(result.users)
    console.log('✅ Customers created')

    // 10. Create suppliers
    console.log('\n🏭 Creating suppliers...')
    result.suppliers = await seedSuppliers(result.users.admin.id)
    console.log('✅ Suppliers created')

    // 11. Create leads
    console.log('\n🎯 Creating leads...')
    const leads = await seedLeads(result.users.sales.id)
    console.log('✅ Leads created')

    // 12. Create sales cases
    console.log('\n💼 Creating sales cases...')
    result.salesCases = await seedSalesCases(result.users, result.customers)
    console.log('✅ Sales cases created')

    // 13. Create quotations
    console.log('\n📄 Creating quotations...')
    result.quotations = await seedQuotations(result.users, result.salesCases, result.items, result.taxConfig)
    console.log('✅ Quotations created')

    // 14. Create sales orders
    console.log('\n📋 Creating sales orders...')
    result.salesOrders = await seedSalesOrders(result.users, result.salesCases, result.quotations, result.items)
    console.log('✅ Sales orders created')

    // 15. Create invoices
    console.log('\n🧾 Creating invoices...')
    result.invoices = await seedInvoices(result.users, result.customers, result.salesCases, result.salesOrders, result.items, result.taxConfig, result.accounts)
    console.log('✅ Invoices created')

    // 16. Create payments
    console.log('\n💰 Creating payments...')
    result.payments = await seedPayments(result.users, result.customers, result.invoices, result.accounts)
    console.log('✅ Payments created')

    // 17. Create stock movements
    console.log('\n📊 Creating stock movements...')
    await seedStockMovements(result.users, result.items, result.accounts)
    console.log('✅ Stock movements created')

    // 18. Create edge case scenarios
    console.log('\n🔧 Creating edge case scenarios...')
    await seedEdgeCases(result)
    console.log('✅ Edge cases created')

    // Print summary
    await printSummary(result)

    console.log('\n🎉 Comprehensive seeding completed successfully!')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

async function cleanDatabase(): Promise<void> {
  console.log('🧹 Cleaning database...')
  
  // Clean in reverse dependency order
  const cleanupOperations = [
    // Clean dependent tables first
    { table: 'auditLog', fn: () => prisma.auditLog.deleteMany() },
    { table: 'userPermission', fn: () => prisma.userPermission.deleteMany() },
    { table: 'rolePermission', fn: () => prisma.rolePermission.deleteMany() },
    { table: 'userSession', fn: () => prisma.userSession.deleteMany() },
    { table: 'userProfile', fn: () => prisma.userProfile.deleteMany() },
    { table: 'salesTeamMember', fn: () => prisma.salesTeamMember.deleteMany() },
    { table: 'payment', fn: () => prisma.payment.deleteMany() },
    { table: 'invoiceItem', fn: () => prisma.invoiceItem.deleteMany() },
    { table: 'invoice', fn: () => prisma.invoice.deleteMany() },
    { table: 'shipmentItem', fn: () => prisma.shipmentItem.deleteMany() },
    { table: 'shipment', fn: () => prisma.shipment.deleteMany() },
    { table: 'salesOrderItem', fn: () => prisma.salesOrderItem.deleteMany() },
    { table: 'salesOrder', fn: () => prisma.salesOrder.deleteMany() },
    { table: 'customerPO', fn: () => prisma.customerPO.deleteMany() },
    { table: 'quotationItem', fn: () => prisma.quotationItem.deleteMany() },
    { table: 'quotation', fn: () => prisma.quotation.deleteMany() },
    { table: 'caseExpense', fn: () => prisma.caseExpense.deleteMany() },
    { table: 'salesCase', fn: () => prisma.salesCase.deleteMany() },
    { table: 'lead', fn: () => prisma.lead.deleteMany() },
    { table: 'customer', fn: () => prisma.customer.deleteMany() },
    { table: 'supplierPayment', fn: () => prisma.supplierPayment.deleteMany() },
    { table: 'supplierInvoiceItem', fn: () => prisma.supplierInvoiceItem.deleteMany() },
    { table: 'supplierInvoice', fn: () => prisma.supplierInvoice.deleteMany() },
    { table: 'goodsReceiptItem', fn: () => prisma.goodsReceiptItem.deleteMany() },
    { table: 'goodsReceipt', fn: () => prisma.goodsReceipt.deleteMany() },
    { table: 'purchaseOrderItem', fn: () => prisma.purchaseOrderItem.deleteMany() },
    { table: 'purchaseOrder', fn: () => prisma.purchaseOrder.deleteMany() },
    { table: 'supplier', fn: () => prisma.supplier.deleteMany() },
    { table: 'stockReservation', fn: () => prisma.stockReservation.deleteMany() },
    { table: 'stockMovement', fn: () => prisma.stockMovement.deleteMany() },
    { table: 'stockLot', fn: () => prisma.stockLot.deleteMany() },
    { table: 'item', fn: () => prisma.item.deleteMany() },
    { table: 'category', fn: () => prisma.category.deleteMany() },
    { table: 'unitOfMeasure', fn: () => prisma.unitOfMeasure.deleteMany() },
    { table: 'journalLine', fn: () => prisma.journalLine.deleteMany() },
    { table: 'journalEntry', fn: () => prisma.journalEntry.deleteMany() },
    { table: 'taxRate', fn: () => prisma.taxRate.deleteMany() },
    { table: 'taxCategory', fn: () => prisma.taxCategory.deleteMany() },
    { table: 'exchangeRate', fn: () => prisma.exchangeRate.deleteMany() },
    { table: 'account', fn: () => prisma.account.deleteMany() },
    { table: 'companySettings', fn: () => prisma.companySettings.deleteMany() },
    { table: 'user', fn: () => prisma.user.deleteMany() },
    // Clean permission after userPermission
    { table: 'permission', fn: () => prisma.permission.deleteMany() },
  ]

  for (const operation of cleanupOperations) {
    try {
      await operation.fn()
      console.log(`  ✓ Cleaned ${operation.table}`)
    } catch (error) {
      // Table might not exist or have dependencies
      console.log(`  ⚠ Skipped ${operation.table} (dependencies exist)`)
    }
  }
}

async function seedUsersAndPermissions(): Promise<Record<string, any>> {
  const hashedPassword = await bcrypt.hash('demo123', 10)
  
  // Create users
  const users = {
    admin: await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@enxi-erp.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        profile: {
          create: {
            firstName: 'System',
            lastName: 'Administrator',
            department: 'Management',
            jobTitle: 'System Administrator',
          }
        }
      }
    }),
    sales: await prisma.user.create({
      data: {
        username: 'sarah',
        email: 'sarah@enxi-erp.com',
        password: hashedPassword,
        role: 'USER',
        isActive: true,
        profile: {
          create: {
            firstName: 'Sarah',
            lastName: 'Johnson',
            department: 'Sales',
            jobTitle: 'Sales Manager',
          }
        }
      }
    }),
    accountant: await prisma.user.create({
      data: {
        username: 'john',
        email: 'john@enxi-erp.com',
        password: hashedPassword,
        role: 'USER',
        isActive: true,
        profile: {
          create: {
            firstName: 'John',
            lastName: 'Smith',
            department: 'Finance',
            jobTitle: 'Senior Accountant',
          }
        }
      }
    }),
    warehouse: await prisma.user.create({
      data: {
        username: 'mike',
        email: 'mike@enxi-erp.com',
        password: hashedPassword,
        role: 'USER',
        isActive: true,
        profile: {
          create: {
            firstName: 'Mike',
            lastName: 'Davis',
            department: 'Warehouse',
            jobTitle: 'Warehouse Manager',
          }
        }
      }
    }),
  }

  // Create permissions
  const permissionModules = [
    'users', 'sales_team', 'sales_cases', 'leads', 'customers',
    'quotations', 'sales_orders', 'inventory', 'shipments',
    'accounting', 'invoices', 'payments', 'reports', 'settings'
  ]

  const actions = ['create', 'read', 'update', 'delete', 'approve', 'view_all']

  const permissions = []
  for (const module of permissionModules) {
    for (const action of actions) {
      const permission = await prisma.permission.create({
        data: {
          code: `${module}.${action}`,
          name: `${action.charAt(0).toUpperCase() + action.slice(1).replace('_', ' ')} ${module}`,
          module,
          action,
          description: `Permission to ${action} ${module}`,
        }
      })
      permissions.push(permission)
    }
  }

  // Assign all permissions to admin
  for (const permission of permissions) {
    await prisma.userPermission.create({
      data: {
        userId: users.admin.id,
        permissionId: permission.id,
        granted: true,
      }
    })
  }

  // Assign specific permissions to other users
  const salesPermissions = permissions.filter(p => 
    ['leads', 'customers', 'quotations', 'sales_orders', 'sales_cases'].includes(p.module)
  )
  
  for (const permission of salesPermissions) {
    await prisma.userPermission.create({
      data: {
        userId: users.sales.id,
        permissionId: permission.id,
        granted: true,
      }
    })
  }

  return users
}

async function seedCompanySettings(): Promise<any> {
  return await prisma.companySettings.create({
    data: {
      companyName: 'Enxi Trading LLC',
      email: 'info@enxi-trading.ae',
      phone: '+971 4 123 4567',
      website: 'https://enxi-trading.ae',
      address: 'Office 1201, Business Bay Tower, Dubai, UAE',
      logoUrl: '/logo.png',
      defaultCurrency: CONFIG.DEFAULT_CURRENCY,
      taxRegistrationNumber: 'TRN100234567890003',
      
      // Quotation settings
      quotationPrefix: 'QT',
      quotationNumberFormat: 'PREFIX-YYYY-NNNN',
      quotationTermsAndConditions: 'Payment due within 30 days. Prices are subject to change without notice.',
      quotationFooterNotes: 'Thank you for your business!',
      quotationValidityDays: 30,
      
      // Sales order settings
      orderPrefix: 'SO',
      orderNumberFormat: 'PREFIX-YYYY-NNNN',
      defaultOrderPaymentTerms: 'Net 30 days',
      defaultOrderShippingTerms: 'FOB Destination',
      
      // Invoice settings
      invoicePrefix: 'INV',
      invoiceNumberFormat: 'PREFIX-YYYY-NNNN',
      defaultPaymentTerms: 30,
      
      // Other settings
      showCompanyLogoOnQuotations: true,
      showCompanyLogoOnOrders: true,
      showCompanyLogoOnInvoices: true,
      showTaxBreakdown: true,
      autoReserveInventory: true,
      requireCustomerPO: false,
      isActive: true,
    }
  })
}

async function seedChartOfAccounts(adminId: string): Promise<Record<string, any>> {
  const accounts: Record<string, any> = {}

  // Assets (1000-1999)
  accounts.cash = await prisma.account.create({
    data: {
      code: '1000',
      name: 'Cash',
      type: 'ASSET',
      currency: CONFIG.BASE_CURRENCY,
      description: 'Cash on hand',
      isActive: true,
      isSystemAccount: true,
      createdBy: adminId,
    }
  })

  accounts.accountsReceivable = await prisma.account.create({
    data: {
      code: '1200',
      name: 'Accounts Receivable',
      type: 'ASSET',
      currency: CONFIG.BASE_CURRENCY,
      description: 'Amounts owed by customers',
      isActive: true,
      isSystemAccount: true,
      createdBy: adminId,
    }
  })

  accounts.inventory = await prisma.account.create({
    data: {
      code: '1400',
      name: 'Inventory',
      type: 'ASSET',
      currency: CONFIG.BASE_CURRENCY,
      description: 'Inventory on hand',
      isActive: true,
      isSystemAccount: true,
      createdBy: adminId,
    }
  })

  // Liabilities (2000-2999)
  accounts.accountsPayable = await prisma.account.create({
    data: {
      code: '2000',
      name: 'Accounts Payable',
      type: 'LIABILITY',
      currency: CONFIG.BASE_CURRENCY,
      description: 'Amounts owed to suppliers',
      isActive: true,
      isSystemAccount: true,
      createdBy: adminId,
    }
  })

  accounts.salesTaxPayable = await prisma.account.create({
    data: {
      code: '2200',
      name: 'Sales Tax Payable',
      type: 'LIABILITY',
      currency: CONFIG.BASE_CURRENCY,
      description: 'Sales tax collected from customers',
      isActive: true,
      isSystemAccount: true,
      createdBy: adminId,
    }
  })

  // Equity (3000-3999)
  accounts.retainedEarnings = await prisma.account.create({
    data: {
      code: '3000',
      name: 'Retained Earnings',
      type: 'EQUITY',
      currency: CONFIG.BASE_CURRENCY,
      description: 'Accumulated profits',
      isActive: true,
      isSystemAccount: true,
      createdBy: adminId,
    }
  })

  // Revenue (4000-4999)
  accounts.salesRevenue = await prisma.account.create({
    data: {
      code: '4000',
      name: 'Sales Revenue',
      type: 'REVENUE',
      currency: CONFIG.BASE_CURRENCY,
      description: 'Revenue from sales',
      isActive: true,
      isSystemAccount: true,
      createdBy: adminId,
    }
  })

  accounts.serviceRevenue = await prisma.account.create({
    data: {
      code: '4100',
      name: 'Service Revenue',
      type: 'REVENUE',
      currency: CONFIG.BASE_CURRENCY,
      description: 'Revenue from services',
      isActive: true,
      isSystemAccount: true,
      createdBy: adminId,
    }
  })

  // Expenses (5000-5999)
  accounts.costOfGoodsSold = await prisma.account.create({
    data: {
      code: '5000',
      name: 'Cost of Goods Sold',
      type: 'EXPENSE',
      currency: CONFIG.BASE_CURRENCY,
      description: 'Direct cost of goods sold',
      isActive: true,
      isSystemAccount: true,
      createdBy: adminId,
    }
  })

  accounts.salariesExpense = await prisma.account.create({
    data: {
      code: '5100',
      name: 'Salaries Expense',
      type: 'EXPENSE',
      currency: CONFIG.BASE_CURRENCY,
      description: 'Employee salaries',
      isActive: true,
      isSystemAccount: true,
      createdBy: adminId,
    }
  })

  accounts.rentExpense = await prisma.account.create({
    data: {
      code: '5200',
      name: 'Rent Expense',
      type: 'EXPENSE',
      currency: CONFIG.BASE_CURRENCY,
      description: 'Office rent',
      isActive: true,
      isSystemAccount: true,
      createdBy: adminId,
    }
  })

  accounts.utilitiesExpense = await prisma.account.create({
    data: {
      code: '5300',
      name: 'Utilities Expense',
      type: 'EXPENSE',
      currency: CONFIG.BASE_CURRENCY,
      description: 'Utilities expenses',
      isActive: true,
      isSystemAccount: true,
      createdBy: adminId,
    }
  })

  return accounts
}

async function seedTaxConfiguration(adminId: string, accounts: Record<string, any>): Promise<any> {
  // Create tax categories
  const standardCategory = await prisma.taxCategory.create({
    data: {
      code: 'STANDARD',
      name: 'Standard Rate',
      description: 'Standard VAT rate',
      isActive: true,
      createdBy: adminId,
    }
  })

  const zeroRatedCategory = await prisma.taxCategory.create({
    data: {
      code: 'ZERO',
      name: 'Zero Rated',
      description: 'Zero-rated items',
      isActive: true,
      createdBy: adminId,
    }
  })

  const exemptCategory = await prisma.taxCategory.create({
    data: {
      code: 'EXEMPT',
      name: 'Exempt',
      description: 'Tax exempt items',
      isActive: true,
      createdBy: adminId,
    }
  })

  // Create tax rates
  const standardRate = await prisma.taxRate.create({
    data: {
      code: 'VAT5',
      name: 'VAT 5%',
      rate: 5,
      type: 'SALES',
      categoryId: standardCategory.id,
      salesAccountId: accounts.salesTaxPayable.id,
      isDefault: true,
      isActive: true,
      effectiveFrom: daysAgo(365),
      createdBy: adminId,
    }
  })

  const zeroRate = await prisma.taxRate.create({
    data: {
      code: 'VAT0',
      name: 'VAT 0%',
      rate: 0,
      type: 'SALES',
      categoryId: zeroRatedCategory.id,
      salesAccountId: accounts.salesTaxPayable.id,
      isActive: true,
      effectiveFrom: daysAgo(365),
      createdBy: adminId,
    }
  })

  return { standardCategory, zeroRatedCategory, exemptCategory, standardRate, zeroRate }
}

async function seedExchangeRates(adminId: string): Promise<void> {
  const currencies = [
    { code: 'USD', rate: 3.67 },
    { code: 'EUR', rate: 4.02 },
    { code: 'GBP', rate: 4.65 },
    { code: 'SAR', rate: 0.98 },
    { code: 'INR', rate: 0.044 },
  ]

  for (const currency of currencies) {
    await prisma.exchangeRate.create({
      data: {
        fromCurrency: currency.code,
        toCurrency: CONFIG.BASE_CURRENCY,
        rate: currency.rate,
        effectiveDate: daysAgo(30),
        source: 'MANUAL',
        createdBy: adminId,
      }
    })
  }
}

async function seedUnitsOfMeasure(adminId: string): Promise<Record<string, any>> {
  const units: Record<string, any> = {}

  units.piece = await prisma.unitOfMeasure.create({
    data: {
      code: 'PCS',
      name: 'Pieces',
      symbol: 'pcs',
      isBaseUnit: true,
      createdBy: adminId,
    }
  })

  units.kilogram = await prisma.unitOfMeasure.create({
    data: {
      code: 'KG',
      name: 'Kilogram',
      symbol: 'kg',
      isBaseUnit: true,
      createdBy: adminId,
    }
  })

  units.liter = await prisma.unitOfMeasure.create({
    data: {
      code: 'L',
      name: 'Liter',
      symbol: 'L',
      isBaseUnit: true,
      createdBy: adminId,
    }
  })

  units.meter = await prisma.unitOfMeasure.create({
    data: {
      code: 'M',
      name: 'Meter',
      symbol: 'm',
      isBaseUnit: true,
      createdBy: adminId,
    }
  })

  units.box = await prisma.unitOfMeasure.create({
    data: {
      code: 'BOX',
      name: 'Box',
      symbol: 'box',
      baseUnitId: units.piece.id,
      conversionFactor: 12,
      createdBy: adminId,
    }
  })

  units.carton = await prisma.unitOfMeasure.create({
    data: {
      code: 'CTN',
      name: 'Carton',
      symbol: 'ctn',
      baseUnitId: units.piece.id,
      conversionFactor: 24,
      createdBy: adminId,
    }
  })

  return units
}

async function seedInventoryCategories(adminId: string): Promise<any[]> {
  const categories = []

  // Main categories
  const electronics = await prisma.category.create({
    data: {
      code: 'ELEC',
      name: 'Electronics',
      description: 'Electronic products and components',
      createdBy: adminId,
    }
  })
  categories.push(electronics)

  const marine = await prisma.category.create({
    data: {
      code: 'MARINE',
      name: 'Marine Equipment',
      description: 'Marine and boating equipment',
      createdBy: adminId,
    }
  })
  categories.push(marine)

  const safety = await prisma.category.create({
    data: {
      code: 'SAFETY',
      name: 'Safety Equipment',
      description: 'Safety and protective equipment',
      createdBy: adminId,
    }
  })
  categories.push(safety)

  const tools = await prisma.category.create({
    data: {
      code: 'TOOLS',
      name: 'Tools & Hardware',
      description: 'Hand tools and hardware',
      createdBy: adminId,
    }
  })
  categories.push(tools)

  // Subcategories
  const computers = await prisma.category.create({
    data: {
      code: 'COMP',
      name: 'Computers',
      description: 'Desktop and laptop computers',
      parentId: electronics.id,
      createdBy: adminId,
    }
  })
  categories.push(computers)

  const navigation = await prisma.category.create({
    data: {
      code: 'NAV',
      name: 'Navigation',
      description: 'Marine navigation equipment',
      parentId: marine.id,
      createdBy: adminId,
    }
  })
  categories.push(navigation)

  return categories
}

async function seedInventoryItems(
  adminId: string,
  categories: any[],
  units: Record<string, any>,
  accounts: Record<string, any>
): Promise<any[]> {
  const items = []

  // Electronics items
  const laptop = await prisma.item.create({
    data: {
      code: generateItemCode('LAPTOP'),
      name: 'Business Laptop Pro',
      description: 'High-performance business laptop with 16GB RAM, 512GB SSD',
      type: 'PRODUCT',
      categoryId: categories.find(c => c.code === 'COMP')?.id,
      unitOfMeasureId: units.piece.id,
      costPrice: 3500,
      sellingPrice: 4500,
      reorderLevel: 10,
      reorderQuantity: 20,
      trackInventory: true,
      isActive: true,
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.costOfGoodsSold.id,
      revenueAccountId: accounts.salesRevenue.id,
      createdBy: adminId,
    }
  })
  items.push(laptop)

  // Marine equipment
  const gps = await prisma.item.create({
    data: {
      code: generateItemCode('GPS'),
      name: 'Marine GPS Navigator',
      description: 'Professional marine GPS with chart plotter',
      type: 'PRODUCT',
      categoryId: categories.find(c => c.code === 'NAV')?.id,
      unitOfMeasureId: units.piece.id,
      costPrice: 2200,
      sellingPrice: 3200,
      reorderLevel: 5,
      reorderQuantity: 10,
      trackInventory: true,
      isActive: true,
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.costOfGoodsSold.id,
      revenueAccountId: accounts.salesRevenue.id,
      createdBy: adminId,
    }
  })
  items.push(gps)

  // Safety equipment
  const lifejacket = await prisma.item.create({
    data: {
      code: generateItemCode('LJ'),
      name: 'Marine Life Jacket',
      description: 'USCG approved life jacket, adult size',
      type: 'PRODUCT',
      categoryId: categories.find(c => c.code === 'SAFETY')?.id,
      unitOfMeasureId: units.piece.id,
      costPrice: 120,
      sellingPrice: 180,
      reorderLevel: 50,
      reorderQuantity: 100,
      trackInventory: true,
      isActive: true,
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.costOfGoodsSold.id,
      revenueAccountId: accounts.salesRevenue.id,
      createdBy: adminId,
    }
  })
  items.push(lifejacket)

  // Service items
  const installation = await prisma.item.create({
    data: {
      code: generateItemCode('INST'),
      name: 'Equipment Installation Service',
      description: 'Professional installation of marine equipment',
      type: 'SERVICE',
      unitOfMeasureId: units.piece.id,
      sellingPrice: 500,
      trackInventory: false,
      isActive: true,
      revenueAccountId: accounts.serviceRevenue.id,
      createdBy: adminId,
    }
  })
  items.push(installation)

  const maintenance = await prisma.item.create({
    data: {
      code: generateItemCode('MAINT'),
      name: 'Annual Maintenance Service',
      description: 'Comprehensive annual maintenance package',
      type: 'SERVICE',
      unitOfMeasureId: units.piece.id,
      sellingPrice: 1500,
      trackInventory: false,
      isActive: true,
      revenueAccountId: accounts.serviceRevenue.id,
      createdBy: adminId,
    }
  })
  items.push(maintenance)

  // Consumable items
  const cable = await prisma.item.create({
    data: {
      code: generateItemCode('CABLE'),
      name: 'Marine Grade Cable',
      description: 'Heavy duty marine electrical cable',
      type: 'CONSUMABLE',
      categoryId: categories.find(c => c.code === 'MARINE')?.id,
      unitOfMeasureId: units.meter.id,
      costPrice: 12,
      sellingPrice: 18,
      reorderLevel: 100,
      reorderQuantity: 500,
      trackInventory: true,
      isActive: true,
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.costOfGoodsSold.id,
      revenueAccountId: accounts.salesRevenue.id,
      createdBy: adminId,
    }
  })
  items.push(cable)

  // Create initial stock for trackable items
  for (const item of items.filter(i => i.trackInventory)) {
    const stockLot = await prisma.stockLot.create({
      data: {
        itemId: item.id,
        lotNumber: `LOT-${Date.now()}-${item.code}`,
        quantity: item.reorderLevel * 2,
        availableQuantity: item.reorderLevel * 2,
        costPrice: item.costPrice || 0,
        expiryDate: item.type === 'CONSUMABLE' ? daysFromNow(365) : null,
        createdBy: adminId,
      }
    })

    // Create initial stock movement
    await prisma.stockMovement.create({
      data: {
        movementNumber: generateMovementNumber(),
        type: 'IN',
        itemId: item.id,
        quantity: stockLot.quantity,
        unitCost: item.costPrice || 0,
        totalCost: (item.costPrice || 0) * stockLot.quantity,
        reason: 'PURCHASE',
        reference: 'Initial Stock',
        stockLotId: stockLot.id,
        performedBy: adminId,
      }
    })
  }

  return items
}

async function seedCustomers(users: Record<string, any>): Promise<any[]> {
  const customers = []

  // Regular customers
  const regularCustomers = [
    {
      name: 'ABC Trading LLC',
      email: 'info@abctrading.ae',
      phone: '+971 4 234 5678',
      industry: 'Trading',
      creditLimit: 100000,
      paymentTerms: 30,
    },
    {
      name: 'Marine Solutions FZE',
      email: 'contact@marinesolutions.ae',
      phone: '+971 4 345 6789',
      industry: 'Marine',
      creditLimit: 250000,
      paymentTerms: 45,
    },
    {
      name: 'Tech Innovations DMCC',
      email: 'sales@techinnovations.ae',
      phone: '+971 4 456 7890',
      industry: 'Technology',
      creditLimit: 150000,
      paymentTerms: 30,
    },
    {
      name: 'Global Shipping Co',
      email: 'procurement@globalshipping.ae',
      phone: '+971 4 567 8901',
      industry: 'Logistics',
      creditLimit: 500000,
      paymentTerms: 60,
    },
  ]

  for (const customerData of regularCustomers) {
    const customer = await prisma.customer.create({
      data: {
        customerNumber: generateCustomerNumber(),
        ...customerData,
        currency: CONFIG.DEFAULT_CURRENCY,
        taxId: `TRN${Math.floor(Math.random() * 1000000000000000)}`,
        address: faker.location.streetAddress(),
        website: `www.${customerData.name.toLowerCase().replace(/\s+/g, '')}.com`,
        assignedToId: users.sales.id,
        assignedAt: new Date(),
        assignedBy: users.admin.id,
        createdBy: users.admin.id,
      }
    })
    customers.push(customer)
  }

  // Edge case customers
  const edgeCaseCustomers = [
    {
      name: 'Zero Balance Customer',
      email: 'zero@balance.ae',
      creditLimit: 25000,
      description: 'Customer with perfect payment history',
    },
    {
      name: 'Over Credit Limit Co',
      email: 'overlimit@customer.ae',
      creditLimit: 25000,
      description: 'Customer over their credit limit',
    },
    {
      name: 'Mega Corporation',
      email: 'mega@corporation.ae',
      creditLimit: 5000000,
      description: 'Very large enterprise customer',
    },
    {
      name: 'Micro Transactions Ltd',
      email: 'micro@transactions.ae',
      creditLimit: 1000,
      description: 'Many small transactions',
    },
  ]

  for (const customerData of edgeCaseCustomers) {
    const customer = await prisma.customer.create({
      data: {
        customerNumber: generateCustomerNumber(),
        name: customerData.name,
        email: customerData.email,
        phone: faker.phone.number('+971 4 ### ####'),
        industry: 'Various',
        creditLimit: customerData.creditLimit,
        paymentTerms: 30,
        currency: CONFIG.DEFAULT_CURRENCY,
        assignedToId: users.sales.id,
        assignedAt: new Date(),
        assignedBy: users.admin.id,
        assignmentNotes: customerData.description,
        createdBy: users.admin.id,
      }
    })
    customers.push(customer)
  }

  return customers
}

async function seedSuppliers(adminId: string): Promise<any[]> {
  const suppliers = []

  const supplierData = [
    {
      name: 'Electronics Wholesale LLC',
      email: 'sales@elecwholesale.ae',
      phone: '+971 4 111 2222',
      paymentTerms: 45,
      currency: CONFIG.DEFAULT_CURRENCY,
    },
    {
      name: 'Marine Equipment Suppliers',
      email: 'info@marineequip.ae',
      phone: '+971 4 222 3333',
      paymentTerms: 30,
      currency: CONFIG.DEFAULT_CURRENCY,
    },
    {
      name: 'Safety Gear Direct',
      email: 'orders@safetygear.ae',
      phone: '+971 4 333 4444',
      paymentTerms: 30,
      currency: CONFIG.DEFAULT_CURRENCY,
    },
  ]

  for (const data of supplierData) {
    const supplier = await prisma.supplier.create({
      data: {
        supplierNumber: `SUP-${Date.now().toString().slice(-6)}`,
        ...data,
        taxId: `TRN${Math.floor(Math.random() * 1000000000000000)}`,
        address: faker.location.streetAddress(),
        isActive: true,
        createdBy: adminId,
      }
    })
    suppliers.push(supplier)
  }

  return suppliers
}

async function seedLeads(salesUserId: string): Promise<any[]> {
  const leads = []

  const leadData = [
    {
      firstName: 'Ahmed',
      lastName: 'Hassan',
      email: 'ahmed.hassan@example.ae',
      company: 'Hassan Trading',
      source: 'WEBSITE',
      status: 'NEW',
    },
    {
      firstName: 'Fatima',
      lastName: 'Al Rashid',
      email: 'fatima@alrashid.ae',
      company: 'Al Rashid Marine',
      source: 'REFERRAL',
      status: 'CONTACTED',
    },
    {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@smithco.com',
      company: 'Smith International',
      source: 'TRADE_SHOW',
      status: 'QUALIFIED',
    },
    {
      firstName: 'Maria',
      lastName: 'Garcia',
      email: 'maria@garciaent.com',
      company: 'Garcia Enterprises',
      source: 'COLD_CALL',
      status: 'PROPOSAL',
    },
  ]

  for (const data of leadData) {
    const lead = await prisma.lead.create({
      data: {
        ...data,
        phone: faker.phone.number('+971 5# ### ####'),
        jobTitle: faker.person.jobTitle(),
        notes: faker.lorem.sentence(),
        createdBy: salesUserId,
      }
    })
    leads.push(lead)
  }

  return leads
}

async function seedSalesCases(users: Record<string, any>, customers: any[]): Promise<any[]> {
  const salesCases = []

  for (const customer of customers.slice(0, 6)) {
    const statuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'WON', 'LOST', 'PENDING']
    const status = statuses[salesCases.length % statuses.length]

    const salesCase = await prisma.salesCase.create({
      data: {
        caseNumber: `SC-${new Date().getFullYear()}-${(salesCases.length + 1).toString().padStart(4, '0')}`,
        title: `${customer.name} - ${faker.commerce.productName()} Project`,
        customerId: customer.id,
        status,
        probability: status === 'WON' ? 100 : status === 'LOST' ? 0 : randomAmount(20, 80),
        expectedAmount: randomAmount(10000, 500000),
        expectedCloseDate: status === 'WON' || status === 'LOST' ? daysAgo(30) : daysFromNow(60),
        actualCloseDate: status === 'WON' || status === 'LOST' ? daysAgo(25) : null,
        closedAmount: status === 'WON' ? randomAmount(10000, 500000) : null,
        currency: CONFIG.DEFAULT_CURRENCY,
        source: ['REFERRAL', 'WEBSITE', 'DIRECT', 'PARTNER'][Math.floor(Math.random() * 4)],
        description: faker.lorem.paragraph(),
        assignedToId: users.sales.id,
        createdBy: users.sales.id,
      }
    })
    salesCases.push(salesCase)
  }

  return salesCases
}

async function seedQuotations(
  users: Record<string, any>,
  salesCases: any[],
  items: any[],
  taxConfig: any
): Promise<any[]> {
  const quotations = []

  for (const salesCase of salesCases) {
    // Create 1-3 quotations per sales case
    const quotationCount = Math.floor(Math.random() * 3) + 1
    
    for (let i = 0; i < quotationCount; i++) {
      const status = i === 0 ? 'SENT' : ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'][Math.floor(Math.random() * 4)]
      
      const quotation = await prisma.quotation.create({
        data: {
          quotationNumber: generateQuotationNumber(),
          salesCaseId: salesCase.id,
          version: i + 1,
          status,
          validUntil: daysFromNow(30),
          paymentTerms: 'Net 30 days',
          deliveryTerms: 'FOB Dubai',
          notes: 'Prices are valid for 30 days. Delivery time: 2-3 weeks.',
          createdBy: users.sales.id,
        }
      })

      // Add items to quotation
      const itemCount = Math.floor(Math.random() * 4) + 2
      const selectedItems = items.sort(() => 0.5 - Math.random()).slice(0, itemCount)
      
      let subtotal = 0
      let taxAmount = 0
      let lineNumber = 1

      for (const item of selectedItems) {
        const quantity = Math.floor(Math.random() * 10) + 1
        const unitPrice = item.sellingPrice || 0
        const discount = Math.random() > 0.7 ? randomAmount(5, 15) : 0
        const lineSubtotal = quantity * unitPrice
        const discountAmount = (lineSubtotal * discount) / 100
        const taxableAmount = lineSubtotal - discountAmount
        const lineTaxAmount = (taxableAmount * taxConfig.standardRate.rate) / 100

        await prisma.quotationItem.create({
          data: {
            quotationId: quotation.id,
            lineNumber: lineNumber++,
            itemType: item.type,
            itemId: item.id,
            itemCode: item.code,
            description: item.description,
            quantity,
            unitPrice,
            cost: item.costPrice || 0,
            discount,
            taxRate: taxConfig.standardRate.rate,
            taxRateId: taxConfig.standardRate.id,
            unitOfMeasureId: item.unitOfMeasureId,
            subtotal: lineSubtotal,
            discountAmount,
            taxAmount: lineTaxAmount,
            totalAmount: taxableAmount + lineTaxAmount,
          }
        })

        subtotal += lineSubtotal
        taxAmount += lineTaxAmount
      }

      // Update quotation totals
      await prisma.quotation.update({
        where: { id: quotation.id },
        data: {
          subtotal,
          taxAmount,
          totalAmount: subtotal + taxAmount,
        }
      })

      quotations.push(quotation)
    }
  }

  return quotations
}

async function seedSalesOrders(
  users: Record<string, any>,
  salesCases: any[],
  quotations: any[],
  items: any[]
): Promise<any[]> {
  const salesOrders = []

  // Create sales orders from accepted quotations
  const acceptedQuotations = quotations.filter(q => q.status === 'ACCEPTED')
  
  for (const quotation of acceptedQuotations) {
    const salesCase = salesCases.find(sc => sc.id === quotation.salesCaseId)
    if (!salesCase) continue

    const salesOrder = await prisma.salesOrder.create({
      data: {
        orderNumber: generateOrderNumber(),
        quotationId: quotation.id,
        salesCaseId: salesCase.id,
        status: 'CONFIRMED',
        orderDate: new Date(),
        requestedDate: daysFromNow(14),
        promisedDate: daysFromNow(21),
        paymentTerms: quotation.paymentTerms,
        shippingTerms: 'FOB Dubai',
        customerPO: `PO-${Math.floor(Math.random() * 100000)}`,
        notes: 'Order confirmed. Please prepare for shipment.',
        createdBy: users.sales.id,
        approvedBy: users.admin.id,
        approvedAt: new Date(),
      }
    })

    // Copy items from quotation
    const quotationItems = await prisma.quotationItem.findMany({
      where: { quotationId: quotation.id }
    })

    let subtotal = 0
    let taxAmount = 0

    for (const qItem of quotationItems) {
      await prisma.salesOrderItem.create({
        data: {
          salesOrderId: salesOrder.id,
          lineNumber: qItem.lineNumber,
          itemType: qItem.itemType,
          itemId: qItem.itemId,
          itemCode: qItem.itemCode,
          description: qItem.description,
          quantity: qItem.quantity,
          unitPrice: qItem.unitPrice,
          discount: qItem.discount,
          taxRate: qItem.taxRate,
          taxRateId: qItem.taxRateId,
          unitOfMeasureId: qItem.unitOfMeasureId,
          subtotal: qItem.subtotal,
          discountAmount: qItem.discountAmount,
          taxAmount: qItem.taxAmount,
          totalAmount: qItem.totalAmount,
        }
      })

      subtotal += qItem.subtotal
      taxAmount += qItem.taxAmount
    }

    // Update sales order totals
    await prisma.salesOrder.update({
      where: { id: salesOrder.id },
      data: {
        subtotal,
        taxAmount,
        totalAmount: subtotal + taxAmount,
      }
    })

    salesOrders.push(salesOrder)
  }

  return salesOrders
}

async function seedInvoices(
  users: Record<string, any>,
  customers: any[],
  salesCases: any[],
  salesOrders: any[],
  items: any[],
  taxConfig: any,
  accounts: Record<string, any>
): Promise<any[]> {
  const invoices = []

  // Create invoices from sales orders
  for (const salesOrder of salesOrders) {
    const salesCase = salesCases.find(sc => sc.id === salesOrder.salesCaseId)
    const customer = customers.find(c => c.id === salesCase?.customerId)
    if (!customer) continue

    const dueDate = daysFromNow(customer.paymentTerms)
    const status = Math.random() > 0.3 ? 'POSTED' : 'DRAFT'

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        customerId: customer.id,
        salesCaseId: salesCase.id,
        salesOrderId: salesOrder.id,
        type: 'STANDARD',
        status,
        issueDate: new Date(),
        dueDate,
        currency: customer.currency,
        exchangeRate: 1,
        paymentTerms: `Net ${customer.paymentTerms} days`,
        notes: 'Thank you for your business!',
        createdBy: users.accountant.id,
      }
    })

    // Copy items from sales order
    const orderItems = await prisma.salesOrderItem.findMany({
      where: { salesOrderId: salesOrder.id }
    })

    let subtotal = 0
    let taxAmount = 0
    let totalAmount = 0

    for (const orderItem of orderItems) {
      await prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          lineNumber: orderItem.lineNumber,
          itemType: orderItem.itemType,
          itemId: orderItem.itemId,
          description: orderItem.description,
          quantity: orderItem.quantity,
          unitPrice: orderItem.unitPrice,
          discount: orderItem.discount,
          taxRate: orderItem.taxRate,
          taxRateId: orderItem.taxRateId,
          unitOfMeasureId: orderItem.unitOfMeasureId,
          accountId: orderItem.itemType === 'SERVICE' ? accounts.serviceRevenue.id : accounts.salesRevenue.id,
          subtotal: orderItem.subtotal,
          discountAmount: orderItem.discountAmount,
          taxAmount: orderItem.taxAmount,
          totalAmount: orderItem.totalAmount,
        }
      })

      subtotal += orderItem.subtotal
      taxAmount += orderItem.taxAmount
      totalAmount += orderItem.totalAmount
    }

    // Update invoice totals
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        subtotal,
        taxAmount,
        totalAmount,
        balanceDue: totalAmount,
      }
    })

    // Create journal entries for posted invoices
    if (status === 'POSTED') {
      const journalEntry = await prisma.journalEntry.create({
        data: {
          entryNumber: `JE-${Date.now()}`,
          date: new Date(),
          reference: invoice.invoiceNumber,
          description: `Invoice ${invoice.invoiceNumber} - ${customer.name}`,
          status: 'POSTED',
          postedBy: users.accountant.id,
          postedAt: new Date(),
        }
      })

      // Debit AR, Credit Revenue and Tax
      await prisma.journalLine.create({
        data: {
          journalEntryId: journalEntry.id,
          accountId: accounts.accountsReceivable.id,
          description: `Invoice ${invoice.invoiceNumber}`,
          debitAmount: totalAmount,
          creditAmount: 0,
          currency: invoice.currency,
          exchangeRate: 1,
          baseDebitAmount: totalAmount,
          baseCreditAmount: 0,
        }
      })

      await prisma.journalLine.create({
        data: {
          journalEntryId: journalEntry.id,
          accountId: accounts.salesRevenue.id,
          description: 'Sales revenue',
          debitAmount: 0,
          creditAmount: subtotal,
          currency: invoice.currency,
          exchangeRate: 1,
          baseDebitAmount: 0,
          baseCreditAmount: subtotal,
        }
      })

      if (taxAmount > 0) {
        await prisma.journalLine.create({
          data: {
            journalEntryId: journalEntry.id,
            accountId: accounts.salesTaxPayable.id,
            description: 'Sales tax',
            debitAmount: 0,
            creditAmount: taxAmount,
            currency: invoice.currency,
            exchangeRate: 1,
            baseDebitAmount: 0,
            baseCreditAmount: taxAmount,
          }
        })
      }
    }

    invoices.push(invoice)
  }

  // Create some standalone invoices
  for (let i = 0; i < 5; i++) {
    const customer = customers[i % customers.length]
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        customerId: customer.id,
        type: 'STANDARD',
        status: 'POSTED',
        issueDate: daysAgo(60 - i * 10),
        dueDate: daysAgo(30 - i * 10),
        currency: customer.currency,
        exchangeRate: 1,
        paymentTerms: `Net ${customer.paymentTerms} days`,
        createdBy: users.accountant.id,
        subtotal: randomAmount(5000, 50000),
        taxAmount: randomAmount(250, 2500),
        totalAmount: 0,
        balanceDue: 0,
      }
    })

    invoice.totalAmount = invoice.subtotal + invoice.taxAmount
    invoice.balanceDue = invoice.totalAmount

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        totalAmount: invoice.totalAmount,
        balanceDue: invoice.balanceDue,
      }
    })

    invoices.push(invoice)
  }

  return invoices
}

async function seedPayments(
  users: Record<string, any>,
  customers: any[],
  invoices: any[],
  accounts: Record<string, any>
): Promise<any[]> {
  const payments = []

  // Create payments for posted invoices
  const postedInvoices = invoices.filter(inv => inv.status === 'POSTED')
  
  for (const invoice of postedInvoices) {
    // 70% chance of having at least one payment
    if (Math.random() > 0.3) {
      const customer = customers.find(c => c.id === invoice.customerId)
      if (!customer) continue

      const paymentCount = Math.random() > 0.7 ? 2 : 1 // Some invoices have partial payments
      let remainingBalance = invoice.totalAmount

      for (let i = 0; i < paymentCount && remainingBalance > 0; i++) {
        const isFullPayment = i === paymentCount - 1 || Math.random() > 0.5
        const paymentAmount = isFullPayment ? remainingBalance : randomAmount(remainingBalance * 0.3, remainingBalance * 0.7)

        const payment = await prisma.payment.create({
          data: {
            paymentNumber: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            customerId: customer.id,
            invoiceId: invoice.id,
            amount: paymentAmount,
            currency: invoice.currency,
            exchangeRate: 1,
            baseAmount: paymentAmount,
            paymentDate: daysAgo(Math.floor(Math.random() * 30)),
            paymentMethod: ['BANK_TRANSFER', 'CHECK', 'CASH', 'CREDIT_CARD'][Math.floor(Math.random() * 4)],
            reference: `REF-${Math.floor(Math.random() * 100000)}`,
            status: 'COMPLETED',
            accountId: accounts.cash.id,
            notes: faker.lorem.sentence(),
            processedBy: users.accountant.id,
            processedAt: new Date(),
          }
        })

        // Create journal entry for payment
        const journalEntry = await prisma.journalEntry.create({
          data: {
            entryNumber: `JE-${Date.now()}`,
            date: payment.paymentDate,
            reference: payment.paymentNumber,
            description: `Payment ${payment.paymentNumber} - ${customer.name}`,
            status: 'POSTED',
            postedBy: users.accountant.id,
            postedAt: new Date(),
          }
        })

        // Debit Cash, Credit AR
        await prisma.journalLine.create({
          data: {
            journalEntryId: journalEntry.id,
            accountId: accounts.cash.id,
            description: `Payment received`,
            debitAmount: paymentAmount,
            creditAmount: 0,
            currency: payment.currency,
            exchangeRate: 1,
            baseDebitAmount: paymentAmount,
            baseCreditAmount: 0,
          }
        })

        await prisma.journalLine.create({
          data: {
            journalEntryId: journalEntry.id,
            accountId: accounts.accountsReceivable.id,
            description: `Applied to invoice ${invoice.invoiceNumber}`,
            debitAmount: 0,
            creditAmount: paymentAmount,
            currency: payment.currency,
            exchangeRate: 1,
            baseDebitAmount: 0,
            baseCreditAmount: paymentAmount,
          }
        })

        remainingBalance -= paymentAmount
        payments.push(payment)

        // Update invoice balance
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: (invoice.paidAmount || 0) + paymentAmount,
            balanceDue: Math.max(0, remainingBalance),
            status: remainingBalance <= 0 ? 'PAID' : 'POSTED',
          }
        })
      }
    }
  }

  return payments
}

async function seedStockMovements(
  users: Record<string, any>,
  items: any[],
  accounts: Record<string, any>
): Promise<void> {
  const trackableItems = items.filter(i => i.trackInventory)

  for (const item of trackableItems) {
    // Create various stock movements
    const movements = [
      {
        type: 'IN',
        reason: 'PURCHASE',
        quantity: randomAmount(50, 200),
        reference: `PO-${Math.floor(Math.random() * 10000)}`,
      },
      {
        type: 'OUT',
        reason: 'SALE',
        quantity: randomAmount(10, 50),
        reference: `SO-${Math.floor(Math.random() * 10000)}`,
      },
      {
        type: 'ADJUSTMENT',
        reason: 'COUNT',
        quantity: randomAmount(-5, 5),
        reference: 'Physical count adjustment',
      },
    ]

    for (const movement of movements) {
      const stockLot = await prisma.stockLot.findFirst({
        where: { itemId: item.id },
        orderBy: { createdAt: 'desc' }
      })

      if (!stockLot) continue

      await prisma.stockMovement.create({
        data: {
          movementNumber: generateMovementNumber(),
          type: movement.type,
          itemId: item.id,
          quantity: Math.abs(movement.quantity),
          unitCost: item.costPrice || 0,
          totalCost: Math.abs(movement.quantity) * (item.costPrice || 0),
          reason: movement.reason,
          reference: movement.reference,
          stockLotId: stockLot.id,
          performedBy: users.warehouse.id,
        }
      })

      // Update stock lot quantity
      const newQuantity = movement.type === 'IN' 
        ? stockLot.availableQuantity + movement.quantity
        : stockLot.availableQuantity - movement.quantity

      await prisma.stockLot.update({
        where: { id: stockLot.id },
        data: {
          availableQuantity: Math.max(0, newQuantity),
        }
      })
    }
  }
}

async function seedEdgeCases(result: SeedResult): Promise<void> {
  // Create edge case scenarios for comprehensive testing
  
  // 1. Customer with many small transactions
  const microCustomer = result.customers.find(c => c.name.includes('Micro'))
  if (microCustomer) {
    for (let i = 0; i < 20; i++) {
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: generateInvoiceNumber(),
          customerId: microCustomer.id,
          type: 'STANDARD',
          status: 'POSTED',
          issueDate: daysAgo(i * 3),
          dueDate: daysAgo(i * 3 - 30),
          currency: microCustomer.currency,
          exchangeRate: 1,
          subtotal: randomAmount(10, 100),
          taxAmount: randomAmount(0.5, 5),
          totalAmount: 0,
          balanceDue: 0,
          createdBy: result.users.accountant.id,
        }
      })

      invoice.totalAmount = invoice.subtotal + invoice.taxAmount
      invoice.balanceDue = Math.random() > 0.8 ? invoice.totalAmount : 0

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          totalAmount: invoice.totalAmount,
          balanceDue: invoice.balanceDue,
          paidAmount: invoice.totalAmount - invoice.balanceDue,
          status: invoice.balanceDue === 0 ? 'PAID' : 'POSTED',
        }
      })
    }
  }

  // 2. Customer over credit limit
  const overLimitCustomer = result.customers.find(c => c.name.includes('Over Credit'))
  if (overLimitCustomer) {
    const largeInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        customerId: overLimitCustomer.id,
        type: 'STANDARD',
        status: 'POSTED',
        issueDate: daysAgo(90),
        dueDate: daysAgo(60),
        currency: overLimitCustomer.currency,
        exchangeRate: 1,
        subtotal: 55000,
        taxAmount: 2750,
        totalAmount: 57750,
        balanceDue: 57750,
        paidAmount: 0,
        createdBy: result.users.accountant.id,
      }
    })
  }

  // 3. Create disputed invoice
  const disputeCustomer = result.customers[2]
  const disputedInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: generateInvoiceNumber(),
      customerId: disputeCustomer.id,
      type: 'STANDARD',
      status: 'DISPUTED',
      issueDate: daysAgo(120),
      dueDate: daysAgo(90),
      currency: disputeCustomer.currency,
      exchangeRate: 1,
      subtotal: 25000,
      taxAmount: 1250,
      totalAmount: 26250,
      balanceDue: 26250,
      notes: 'Customer disputes service quality',
      createdBy: result.users.accountant.id,
    }
  })

  // 4. Create credit note
  const creditNote = await prisma.invoice.create({
    data: {
      invoiceNumber: `CN-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`,
      customerId: result.customers[0].id,
      type: 'CREDIT_NOTE',
      status: 'POSTED',
      issueDate: new Date(),
      dueDate: new Date(),
      currency: result.customers[0].currency,
      exchangeRate: 1,
      subtotal: -5000,
      taxAmount: -250,
      totalAmount: -5250,
      balanceDue: -5250,
      notes: 'Credit for returned items',
      createdBy: result.users.accountant.id,
    }
  })

  // 5. Create prepayment scenario
  const prepaymentCustomer = result.customers[3]
  const prepayment = await prisma.payment.create({
    data: {
      paymentNumber: `PREPAY-${Date.now()}`,
      customerId: prepaymentCustomer.id,
      amount: 10000,
      currency: prepaymentCustomer.currency,
      exchangeRate: 1,
      baseAmount: 10000,
      paymentDate: new Date(),
      paymentMethod: 'BANK_TRANSFER',
      reference: 'Advance payment',
      status: 'COMPLETED',
      accountId: result.accounts.cash.id,
      notes: 'Prepayment for future orders',
      processedBy: result.users.accountant.id,
      processedAt: new Date(),
    }
  })
}

async function printSummary(result: SeedResult): Promise<void> {
  console.log('\n📊 Seeding Summary:')
  console.log('=====================================')
  console.log(`✅ Users: ${Object.keys(result.users).length}`)
  console.log(`✅ Chart of Accounts: ${Object.keys(result.accounts).length} accounts`)
  console.log(`✅ Customers: ${result.customers.length}`)
  console.log(`✅ Suppliers: ${result.suppliers.length}`)
  console.log(`✅ Inventory Items: ${result.items.length}`)
  console.log(`✅ Sales Cases: ${result.salesCases.length}`)
  console.log(`✅ Quotations: ${result.quotations.length}`)
  console.log(`✅ Sales Orders: ${result.salesOrders.length}`)
  console.log(`✅ Invoices: ${result.invoices.length}`)
  console.log(`✅ Payments: ${result.payments.length}`)
  console.log('=====================================')
  
  console.log('\n📝 Login Credentials:')
  console.log('-------------------------------------')
  console.log('Admin: admin / demo123')
  console.log('Sales: sarah / demo123')
  console.log('Accountant: john / demo123')
  console.log('Warehouse: mike / demo123')
  console.log('-------------------------------------')
}

// Run the seed script
main()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })