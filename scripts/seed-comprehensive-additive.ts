#!/usr/bin/env npx tsx

/**
 * Comprehensive Additive Seed Script
 * 
 * This script adds seed data without removing existing data.
 * It uses upsert operations and checks for existing records.
 * 
 * Features:
 * 1. Preserves existing data
 * 2. Adds missing seed data
 * 3. Uses unique identifiers to avoid duplicates
 * 4. Properly handles relationships
 * 
 * Usage: npx tsx scripts/seed-comprehensive-additive.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient({
  log: ['error', 'warn'],
})

// Configuration
const CONFIG = {
  DEFAULT_CURRENCY: 'AED',
  BASE_CURRENCY: 'AED',
  SEED_PREFIX: 'SEED', // Prefix to identify seeded data
}

// Helper functions
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)
const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)
const randomAmount = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 100) / 100
const generateItemCode = (prefix: string) => `${CONFIG.SEED_PREFIX}-${prefix}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
const generateCustomerNumber = () => `${CONFIG.SEED_PREFIX}-CUST-${Date.now().toString().slice(-6)}`
const generateQuotationNumber = () => `${CONFIG.SEED_PREFIX}-QT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
const generateOrderNumber = () => `${CONFIG.SEED_PREFIX}-SO-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
const generateInvoiceNumber = () => `${CONFIG.SEED_PREFIX}-INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
const generateMovementNumber = () => `${CONFIG.SEED_PREFIX}-MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`

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
  console.log('🌱 Starting Comprehensive Additive Seed...')
  console.log('✨ This script will ADD new data without removing existing data\n')

  try {
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

    // 1. Create or get users
    console.log('\n👥 Creating/updating users...')
    result.users = await seedUsersAndPermissions()
    console.log('✅ Users ready')

    // 2. Create or get company settings
    console.log('\n🏢 Creating/updating company settings...')
    result.companySettings = await seedCompanySettings()
    console.log('✅ Company settings ready')

    // 3. Create or get chart of accounts
    console.log('\n💼 Creating/updating chart of accounts...')
    result.accounts = await seedChartOfAccounts(result.users.admin.id)
    console.log('✅ Chart of accounts ready')

    // 4. Create or get tax configuration
    console.log('\n🧾 Creating/updating tax configuration...')
    result.taxConfig = await seedTaxConfiguration(result.users.admin.id, result.accounts)
    console.log('✅ Tax configuration ready')

    // 5. Create exchange rates
    console.log('\n💱 Creating/updating exchange rates...')
    await seedExchangeRates(result.users.admin.id)
    console.log('✅ Exchange rates ready')

    // 6. Create units of measure
    console.log('\n📏 Creating/updating units of measure...')
    const units = await seedUnitsOfMeasure(result.users.admin.id)
    console.log('✅ Units of measure ready')

    // 7. Create inventory categories
    console.log('\n📁 Creating/updating inventory categories...')
    const categories = await seedInventoryCategories(result.users.admin.id)
    console.log('✅ Inventory categories ready')

    // 8. Create inventory items
    console.log('\n📦 Creating/updating inventory items...')
    result.items = await seedInventoryItems(result.users.admin.id, categories, units, result.accounts)
    console.log('✅ Inventory items ready')

    // 9. Create customers
    console.log('\n👤 Creating/updating customers...')
    result.customers = await seedCustomers(result.users)
    console.log('✅ Customers ready')

    // 10. Create suppliers
    console.log('\n🏭 Creating/updating suppliers...')
    result.suppliers = await seedSuppliers(result.users.admin.id)
    console.log('✅ Suppliers ready')

    // 11. Create leads
    console.log('\n🎯 Creating/updating leads...')
    const leads = await seedLeads(result.users.sales.id)
    console.log('✅ Leads ready')

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

    // Print summary
    await printSummary(result)

    console.log('\n🎉 Additive seeding completed successfully!')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

async function seedUsersAndPermissions(): Promise<Record<string, any>> {
  const hashedPassword = await bcrypt.hash('demo123', 10)
  
  // Create or update users
  const users = {
    admin: await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        email: 'admin@enxi-erp.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      }
    }),
    sales: await prisma.user.upsert({
      where: { username: 'sarah' },
      update: {},
      create: {
        username: 'sarah',
        email: 'sarah@enxi-erp.com',
        password: hashedPassword,
        role: 'USER',
        isActive: true,
      }
    }),
    accountant: await prisma.user.upsert({
      where: { username: 'john' },
      update: {},
      create: {
        username: 'john',
        email: 'john@enxi-erp.com',
        password: hashedPassword,
        role: 'USER',
        isActive: true,
      }
    }),
    warehouse: await prisma.user.upsert({
      where: { username: 'mike' },
      update: {},
      create: {
        username: 'mike',
        email: 'mike@enxi-erp.com',
        password: hashedPassword,
        role: 'USER',
        isActive: true,
      }
    }),
  }

  // Create user profiles
  for (const [key, user] of Object.entries(users)) {
    const profileData = {
      admin: { firstName: 'System', lastName: 'Administrator', department: 'Management', jobTitle: 'System Administrator' },
      sales: { firstName: 'Sarah', lastName: 'Johnson', department: 'Sales', jobTitle: 'Sales Manager' },
      accountant: { firstName: 'John', lastName: 'Smith', department: 'Finance', jobTitle: 'Senior Accountant' },
      warehouse: { firstName: 'Mike', lastName: 'Davis', department: 'Warehouse', jobTitle: 'Warehouse Manager' },
    }[key]

    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: {
        userId: user.id,
        ...profileData!,
      }
    })
  }

  // Create permissions if they don't exist
  const permissionModules = [
    'users', 'sales_team', 'sales_cases', 'leads', 'customers',
    'quotations', 'sales_orders', 'inventory', 'shipments',
    'accounting', 'invoices', 'payments', 'reports', 'settings'
  ]

  const actions = ['create', 'read', 'update', 'delete', 'approve', 'view_all']

  const permissions = []
  for (const module of permissionModules) {
    for (const action of actions) {
      const code = `${module}.${action}`
      const permission = await prisma.permission.upsert({
        where: { code },
        update: {},
        create: {
          code,
          name: `${action.charAt(0).toUpperCase() + action.slice(1).replace('_', ' ')} ${module}`,
          module,
          action,
          description: `Permission to ${action} ${module}`,
        }
      })
      permissions.push(permission)
    }
  }

  // Assign permissions to admin (only if not already assigned)
  for (const permission of permissions) {
    const existing = await prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId: users.admin.id,
          permissionId: permission.id,
        }
      }
    })

    if (!existing) {
      await prisma.userPermission.create({
        data: {
          userId: users.admin.id,
          permissionId: permission.id,
          granted: true,
        }
      })
    }
  }

  // Assign specific permissions to sales user
  const salesPermissions = permissions.filter(p => 
    ['leads', 'customers', 'quotations', 'sales_orders', 'sales_cases'].includes(p.module)
  )
  
  for (const permission of salesPermissions) {
    const existing = await prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId: users.sales.id,
          permissionId: permission.id,
        }
      }
    })

    if (!existing) {
      await prisma.userPermission.create({
        data: {
          userId: users.sales.id,
          permissionId: permission.id,
          granted: true,
        }
      })
    }
  }

  return users
}

async function seedCompanySettings(): Promise<any> {
  const existing = await prisma.companySettings.findFirst()
  
  if (existing) {
    console.log('  ℹ️  Company settings already exist')
    return existing
  }

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
      quotationTermsAndConditions: 'Payment due within 30 days. Prices are subject to change without notice.',
      quotationFooterNotes: 'Thank you for your business!',
      quotationValidityDays: 30,
      quotationPrefix: 'QT',
      quotationNumberFormat: 'PREFIX-YYYY-NNNN',
      orderPrefix: 'SO',
      orderNumberFormat: 'PREFIX-YYYY-NNNN',
      defaultOrderPaymentTerms: 'Net 30 days',
      defaultOrderShippingTerms: 'FOB Destination',
      showCompanyLogoOnQuotations: true,
      showCompanyLogoOnOrders: true,
      showTaxBreakdown: true,
      autoReserveInventory: true,
      requireCustomerPO: false,
      defaultTrackInventory: true,
      isActive: true,
    }
  })
}

async function seedChartOfAccounts(adminId: string): Promise<Record<string, any>> {
  const accounts: Record<string, any> = {}

  // Define accounts with their properties
  const accountDefinitions = [
    // Assets (1000-1999)
    { key: 'cash', code: '1000', name: 'Cash', type: 'ASSET', description: 'Cash on hand' },
    { key: 'accountsReceivable', code: '1200', name: 'Accounts Receivable', type: 'ASSET', description: 'Amounts owed by customers' },
    { key: 'inventory', code: '1400', name: 'Inventory', type: 'ASSET', description: 'Inventory on hand' },
    // Liabilities (2000-2999)
    { key: 'accountsPayable', code: '2000', name: 'Accounts Payable', type: 'LIABILITY', description: 'Amounts owed to suppliers' },
    { key: 'salesTaxPayable', code: '2200', name: 'Sales Tax Payable', type: 'LIABILITY', description: 'Sales tax collected from customers' },
    // Equity (3000-3999)
    { key: 'retainedEarnings', code: '3000', name: 'Retained Earnings', type: 'EQUITY', description: 'Accumulated profits' },
    // Revenue (4000-4999)
    { key: 'salesRevenue', code: '4000', name: 'Sales Revenue', type: 'REVENUE', description: 'Revenue from sales' },
    { key: 'serviceRevenue', code: '4100', name: 'Service Revenue', type: 'REVENUE', description: 'Revenue from services' },
    // Expenses (5000-5999)
    { key: 'costOfGoodsSold', code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', description: 'Direct cost of goods sold' },
    { key: 'salariesExpense', code: '5100', name: 'Salaries Expense', type: 'EXPENSE', description: 'Employee salaries' },
    { key: 'rentExpense', code: '5200', name: 'Rent Expense', type: 'EXPENSE', description: 'Office rent' },
    { key: 'utilitiesExpense', code: '5300', name: 'Utilities Expense', type: 'EXPENSE', description: 'Utilities expenses' },
  ]

  for (const def of accountDefinitions) {
    accounts[def.key] = await prisma.account.upsert({
      where: { code: def.code },
      update: {},
      create: {
        code: def.code,
        name: def.name,
        type: def.type,
        currency: CONFIG.BASE_CURRENCY,
        description: def.description,
        status: 'ACTIVE',
        isSystemAccount: true,
        createdBy: adminId,
      }
    })
  }

  return accounts
}

async function seedTaxConfiguration(adminId: string, accounts: Record<string, any>): Promise<any> {
  // Create tax categories
  const standardCategory = await prisma.taxCategory.upsert({
    where: { code: 'STANDARD' },
    update: {},
    create: {
      code: 'STANDARD',
      name: 'Standard Rate',
      description: 'Standard VAT rate',
      isActive: true,
      createdBy: adminId,
    }
  })

  const zeroRatedCategory = await prisma.taxCategory.upsert({
    where: { code: 'ZERO' },
    update: {},
    create: {
      code: 'ZERO',
      name: 'Zero Rated',
      description: 'Zero-rated items',
      isActive: true,
      createdBy: adminId,
    }
  })

  const exemptCategory = await prisma.taxCategory.upsert({
    where: { code: 'EXEMPT' },
    update: {},
    create: {
      code: 'EXEMPT',
      name: 'Exempt',
      description: 'Tax exempt items',
      isActive: true,
      createdBy: adminId,
    }
  })

  // Create tax rates
  const standardRate = await prisma.taxRate.upsert({
    where: { code: 'VAT5' },
    update: {},
    create: {
      code: 'VAT5',
      name: 'VAT 5%',
      rate: 5,
      categoryId: standardCategory.id,
      collectedAccountId: accounts.salesTaxPayable.id,
      taxType: 'SALES',
      appliesTo: 'ALL',
      isDefault: true,
      isActive: true,
      effectiveFrom: daysAgo(365),
      createdBy: adminId,
    }
  })

  const zeroRate = await prisma.taxRate.upsert({
    where: { code: 'VAT0' },
    update: {},
    create: {
      code: 'VAT0',
      name: 'VAT 0%',
      rate: 0,
      categoryId: zeroRatedCategory.id,
      collectedAccountId: accounts.salesTaxPayable.id,
      taxType: 'SALES',
      appliesTo: 'ALL',
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
    // Check if exchange rate exists for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const existing = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: currency.code,
        toCurrency: CONFIG.BASE_CURRENCY,
        rateDate: {
          gte: today,
        }
      }
    })

    if (!existing) {
      await prisma.exchangeRate.create({
        data: {
          fromCurrency: currency.code,
          toCurrency: CONFIG.BASE_CURRENCY,
          rate: currency.rate,
          rateDate: today,
          source: 'manual',
          createdBy: adminId,
        }
      })
    }
  }
}

async function seedUnitsOfMeasure(adminId: string): Promise<Record<string, any>> {
  const units: Record<string, any> = {}

  // Base units
  units.piece = await prisma.unitOfMeasure.upsert({
    where: { code: 'PCS' },
    update: {},
    create: {
      code: 'PCS',
      name: 'Pieces',
      symbol: 'pcs',
      isBaseUnit: true,
      createdBy: adminId,
    }
  })

  units.kilogram = await prisma.unitOfMeasure.upsert({
    where: { code: 'KG' },
    update: {},
    create: {
      code: 'KG',
      name: 'Kilogram',
      symbol: 'kg',
      isBaseUnit: true,
      createdBy: adminId,
    }
  })

  units.liter = await prisma.unitOfMeasure.upsert({
    where: { code: 'L' },
    update: {},
    create: {
      code: 'L',
      name: 'Liter',
      symbol: 'L',
      isBaseUnit: true,
      createdBy: adminId,
    }
  })

  units.meter = await prisma.unitOfMeasure.upsert({
    where: { code: 'M' },
    update: {},
    create: {
      code: 'M',
      name: 'Meter',
      symbol: 'm',
      isBaseUnit: true,
      createdBy: adminId,
    }
  })

  // Derived units
  units.box = await prisma.unitOfMeasure.upsert({
    where: { code: 'BOX' },
    update: {},
    create: {
      code: 'BOX',
      name: 'Box',
      symbol: 'box',
      baseUnitId: units.piece.id,
      conversionFactor: 12,
      createdBy: adminId,
    }
  })

  units.carton = await prisma.unitOfMeasure.upsert({
    where: { code: 'CTN' },
    update: {},
    create: {
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
  const mainCategories = [
    { code: 'ELEC', name: 'Electronics', description: 'Electronic products and components' },
    { code: 'MARINE', name: 'Marine Equipment', description: 'Marine and boating equipment' },
    { code: 'SAFETY', name: 'Safety Equipment', description: 'Safety and protective equipment' },
    { code: 'TOOLS', name: 'Tools & Hardware', description: 'Hand tools and hardware' },
    { code: 'SERVICES', name: 'Services', description: 'Professional services and maintenance' },
  ]

  for (const cat of mainCategories) {
    const category = await prisma.category.upsert({
      where: { code: cat.code },
      update: {},
      create: {
        ...cat,
        createdBy: adminId,
      }
    })
    categories.push(category)
  }

  // Subcategories
  const subCategories = [
    { code: 'COMP', name: 'Computers', description: 'Desktop and laptop computers', parentCode: 'ELEC' },
    { code: 'NAV', name: 'Navigation', description: 'Marine navigation equipment', parentCode: 'MARINE' },
  ]

  for (const subCat of subCategories) {
    const parent = categories.find(c => c.code === subCat.parentCode)
    if (parent) {
      const category = await prisma.category.upsert({
        where: { code: subCat.code },
        update: {},
        create: {
          code: subCat.code,
          name: subCat.name,
          description: subCat.description,
          parentId: parent.id,
          createdBy: adminId,
        }
      })
      categories.push(category)
    }
  }

  return categories
}

async function seedInventoryItems(
  adminId: string,
  categories: any[],
  units: Record<string, any>,
  accounts: Record<string, any>
): Promise<any[]> {
  const items = []

  // Define items with unique codes
  const itemDefinitions = [
    {
      code: `${CONFIG.SEED_PREFIX}-LAPTOP-001`,
      name: 'Business Laptop Pro',
      description: 'High-performance business laptop with 16GB RAM, 512GB SSD',
      type: 'PRODUCT',
      categoryCode: 'COMP',
      unitCode: 'PCS',
      standardCost: 3500,
      listPrice: 4500,
      reorderPoint: 10,
      minStockLevel: 5,
      maxStockLevel: 50,
      trackInventory: true,
    },
    {
      code: `${CONFIG.SEED_PREFIX}-GPS-001`,
      name: 'Marine GPS Navigator',
      description: 'Professional marine GPS with chart plotter',
      type: 'PRODUCT',
      categoryCode: 'NAV',
      unitCode: 'PCS',
      standardCost: 2200,
      listPrice: 3200,
      reorderPoint: 5,
      minStockLevel: 2,
      maxStockLevel: 20,
      trackInventory: true,
    },
    {
      code: `${CONFIG.SEED_PREFIX}-LJ-001`,
      name: 'Marine Life Jacket',
      description: 'USCG approved life jacket, adult size',
      type: 'PRODUCT',
      categoryCode: 'SAFETY',
      unitCode: 'PCS',
      standardCost: 120,
      listPrice: 180,
      reorderPoint: 50,
      minStockLevel: 25,
      maxStockLevel: 200,
      trackInventory: true,
    },
    {
      code: `${CONFIG.SEED_PREFIX}-INST-001`,
      name: 'Equipment Installation Service',
      description: 'Professional installation of marine equipment',
      type: 'SERVICE',
      categoryCode: 'SERVICES',
      unitCode: 'PCS',
      listPrice: 500,
      trackInventory: false,
    },
    {
      code: `${CONFIG.SEED_PREFIX}-MAINT-001`,
      name: 'Annual Maintenance Service',
      description: 'Comprehensive annual maintenance package',
      type: 'SERVICE',
      categoryCode: 'SERVICES',
      unitCode: 'PCS',
      listPrice: 1500,
      trackInventory: false,
    },
    {
      code: `${CONFIG.SEED_PREFIX}-CABLE-001`,
      name: 'Marine Grade Cable',
      description: 'Heavy duty marine electrical cable',
      type: 'CONSUMABLE',
      categoryCode: 'MARINE',
      unitCode: 'M',
      standardCost: 12,
      listPrice: 18,
      reorderPoint: 100,
      minStockLevel: 50,
      maxStockLevel: 1000,
      trackInventory: true,
    },
  ]

  for (const itemDef of itemDefinitions) {
    // Check if item already exists
    const existingItem = await prisma.item.findUnique({
      where: { code: itemDef.code }
    })

    if (!existingItem) {
      const category = categories.find(c => c.code === itemDef.categoryCode)
      const unit = units[itemDef.unitCode.toLowerCase()] || units.piece

      const item = await prisma.item.create({
        data: {
          code: itemDef.code,
          name: itemDef.name,
          description: itemDef.description,
          type: itemDef.type,
          categoryId: category?.id,
          unitOfMeasureId: unit.id,
          standardCost: itemDef.standardCost || 0,
          listPrice: itemDef.listPrice || 0,
          reorderPoint: itemDef.reorderPoint || 0,
          minStockLevel: itemDef.minStockLevel || 0,
          maxStockLevel: itemDef.maxStockLevel || 0,
          trackInventory: itemDef.trackInventory,
          isActive: true,
          isSaleable: true,
          isPurchaseable: itemDef.type !== 'SERVICE',
          inventoryAccountId: itemDef.trackInventory ? accounts.inventory.id : undefined,
          cogsAccountId: itemDef.type === 'PRODUCT' ? accounts.costOfGoodsSold.id : undefined,
          salesAccountId: itemDef.type === 'SERVICE' ? accounts.serviceRevenue.id : accounts.salesRevenue.id,
          createdBy: adminId,
        }
      })

      // Create initial stock for trackable items
      if (item.trackInventory) {
        const stockLot = await prisma.stockLot.create({
          data: {
            itemId: item.id,
            lotNumber: `${CONFIG.SEED_PREFIX}-LOT-${Date.now()}-${item.code}`,
            receivedQty: (item.reorderPoint || 0) * 2,
            availableQty: (item.reorderPoint || 0) * 2,
            unitCost: item.standardCost || 0,
            totalCost: ((item.standardCost || 0) * (item.reorderPoint || 0) * 2),
            receivedDate: new Date(),
            expiryDate: item.type === 'CONSUMABLE' ? daysFromNow(365) : undefined,
            createdBy: adminId,
          }
        })

        // Create initial stock movement
        await prisma.stockMovement.create({
          data: {
            movementNumber: generateMovementNumber(),
            movementType: 'IN',
            movementDate: new Date(),
            itemId: item.id,
            stockLotId: stockLot.id,
            quantity: stockLot.receivedQty,
            unitCost: item.standardCost || 0,
            totalCost: stockLot.totalCost,
            unitOfMeasureId: unit.id,
            referenceType: 'INITIAL',
            referenceNumber: 'Initial Stock',
            notes: 'Initial stock for seeded item',
            createdBy: adminId,
          }
        })
      }

      items.push(item)
    } else {
      items.push(existingItem)
    }
  }

  return items
}

async function seedCustomers(users: Record<string, any>): Promise<any[]> {
  const customers = []

  // Define customers
  const customerDefinitions = [
    {
      customerNumber: `${CONFIG.SEED_PREFIX}-CUST-001`,
      name: 'ABC Trading LLC',
      email: 'info@abctrading-seed.ae',
      phone: '+971 4 234 5678',
      industry: 'Trading',
      creditLimit: 100000,
      paymentTerms: 30,
    },
    {
      customerNumber: `${CONFIG.SEED_PREFIX}-CUST-002`,
      name: 'Marine Solutions FZE',
      email: 'contact@marinesolutions-seed.ae',
      phone: '+971 4 345 6789',
      industry: 'Marine',
      creditLimit: 250000,
      paymentTerms: 45,
    },
    {
      customerNumber: `${CONFIG.SEED_PREFIX}-CUST-003`,
      name: 'Tech Innovations DMCC',
      email: 'sales@techinnovations-seed.ae',
      phone: '+971 4 456 7890',
      industry: 'Technology',
      creditLimit: 150000,
      paymentTerms: 30,
    },
    {
      customerNumber: `${CONFIG.SEED_PREFIX}-CUST-004`,
      name: 'Global Shipping Co',
      email: 'procurement@globalshipping-seed.ae',
      phone: '+971 4 567 8901',
      industry: 'Logistics',
      creditLimit: 500000,
      paymentTerms: 60,
    },
  ]

  for (const custDef of customerDefinitions) {
    const existing = await prisma.customer.findUnique({
      where: { customerNumber: custDef.customerNumber }
    })

    if (!existing) {
      const customer = await prisma.customer.create({
        data: {
          ...custDef,
          currency: CONFIG.DEFAULT_CURRENCY,
          taxId: `TRN${Math.floor(Math.random() * 1000000000000000)}`,
          address: faker.location.streetAddress(),
          website: `www.${custDef.name.toLowerCase().replace(/\s+/g, '')}.com`,
          assignedToId: users.sales.id,
          assignedAt: new Date(),
          assignedBy: users.admin.id,
          createdBy: users.admin.id,
        }
      })
      customers.push(customer)
    } else {
      customers.push(existing)
    }
  }

  return customers
}

async function seedSuppliers(adminId: string): Promise<any[]> {
  const suppliers = []

  const supplierDefinitions = [
    {
      supplierNumber: `${CONFIG.SEED_PREFIX}-SUP-001`,
      name: 'Electronics Wholesale LLC',
      email: 'sales@elecwholesale-seed.ae',
      phone: '+971 4 111 2222',
      paymentTerms: 45,
    },
    {
      supplierNumber: `${CONFIG.SEED_PREFIX}-SUP-002`,
      name: 'Marine Equipment Suppliers',
      email: 'info@marineequip-seed.ae',
      phone: '+971 4 222 3333',
      paymentTerms: 30,
    },
    {
      supplierNumber: `${CONFIG.SEED_PREFIX}-SUP-003`,
      name: 'Safety Gear Direct',
      email: 'orders@safetygear-seed.ae',
      phone: '+971 4 333 4444',
      paymentTerms: 30,
    },
  ]

  for (const supDef of supplierDefinitions) {
    const existing = await prisma.supplier.findUnique({
      where: { supplierNumber: supDef.supplierNumber }
    })

    if (!existing) {
      const supplier = await prisma.supplier.create({
        data: {
          ...supDef,
          currency: CONFIG.DEFAULT_CURRENCY,
          taxId: `TRN${Math.floor(Math.random() * 1000000000000000)}`,
          address: faker.location.streetAddress(),
          isActive: true,
          createdBy: adminId,
        }
      })
      suppliers.push(supplier)
    } else {
      suppliers.push(existing)
    }
  }

  return suppliers
}

async function seedLeads(salesUserId: string): Promise<any[]> {
  const leads = []

  const leadDefinitions = [
    {
      firstName: 'Ahmed',
      lastName: 'Hassan',
      email: 'ahmed.hassan-seed@example.ae',
      company: 'Hassan Trading',
      source: 'WEBSITE',
      status: 'NEW',
    },
    {
      firstName: 'Fatima',
      lastName: 'Al Rashid',
      email: 'fatima-seed@alrashid.ae',
      company: 'Al Rashid Marine',
      source: 'REFERRAL',
      status: 'CONTACTED',
    },
    {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john-seed@smithco.com',
      company: 'Smith International',
      source: 'TRADE_SHOW',
      status: 'QUALIFIED',
    },
    {
      firstName: 'Maria',
      lastName: 'Garcia',
      email: 'maria-seed@garciaent.com',
      company: 'Garcia Enterprises',
      source: 'COLD_CALL',
      status: 'PROPOSAL',
    },
  ]

  for (const leadDef of leadDefinitions) {
    const existing = await prisma.lead.findFirst({
      where: { email: leadDef.email }
    })

    if (!existing) {
      const lead = await prisma.lead.create({
        data: {
          ...leadDef,
          phone: faker.phone.number('+971 5# ### ####'),
          jobTitle: faker.person.jobTitle(),
          notes: `Seeded lead - ${faker.lorem.sentence()}`,
          createdBy: salesUserId,
        }
      })
      leads.push(lead)
    } else {
      leads.push(existing)
    }
  }

  return leads
}

async function seedSalesCases(users: Record<string, any>, customers: any[]): Promise<any[]> {
  const salesCases = []

  // Only create sales cases for seeded customers
  const seededCustomers = customers.filter(c => c.customerNumber.startsWith(CONFIG.SEED_PREFIX))

  for (let i = 0; i < Math.min(seededCustomers.length, 4); i++) {
    const customer = seededCustomers[i]
    const statuses = ['OPEN', 'OPEN', 'WON', 'IN_PROGRESS']
    const status = statuses[i % statuses.length]

    const caseNumber = `${CONFIG.SEED_PREFIX}-SC-${new Date().getFullYear()}-${(i + 1).toString().padStart(4, '0')}`
    
    // Check if sales case already exists
    const existing = await prisma.salesCase.findUnique({
      where: { caseNumber }
    })

    if (!existing) {
      const salesCase = await prisma.salesCase.create({
        data: {
          caseNumber,
          title: `${customer.name} - ${faker.commerce.productName()} Project`,
          customerId: customer.id,
          status,
          estimatedValue: randomAmount(10000, 500000),
          actualValue: status === 'WON' ? randomAmount(10000, 500000) : 0,
          cost: status === 'WON' ? randomAmount(5000, 250000) : 0,
          profitMargin: status === 'WON' ? randomAmount(10, 50) : 0,
          description: `Seeded sales case - ${faker.lorem.paragraph()}`,
          assignedTo: users.sales.id,
          createdBy: users.sales.id,
          closedAt: status === 'WON' || status === 'LOST' ? daysAgo(25) : undefined,
        }
      })
      salesCases.push(salesCase)
    }
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
    // Create 1-2 quotations per sales case
    const quotationCount = Math.floor(Math.random() * 2) + 1
    
    for (let i = 0; i < quotationCount; i++) {
      const quotationNumber = generateQuotationNumber()
      const status = i === 0 ? 'SENT' : 'DRAFT'
      
      const quotation = await prisma.quotation.create({
        data: {
          quotationNumber,
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
      const itemCount = Math.floor(Math.random() * 3) + 2
      const selectedItems = items.filter(i => i.code.startsWith(CONFIG.SEED_PREFIX)).slice(0, itemCount)
      
      let subtotal = 0
      let taxAmount = 0
      let lineNumber = 1

      for (const item of selectedItems) {
        const quantity = Math.floor(Math.random() * 10) + 1
        const unitPrice = item.listPrice || 0
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
            cost: item.standardCost || 0,
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

  // Create sales orders from sent quotations
  const sentQuotations = quotations.filter(q => q.status === 'SENT')
  
  for (const quotation of sentQuotations.slice(0, 2)) {
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
        customerPO: `${CONFIG.SEED_PREFIX}-PO-${Math.floor(Math.random() * 100000)}`,
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

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        customerId: customer.id,
        salesOrderId: salesOrder.id,
        type: 'SALES',
        status: 'POSTED',
        invoiceDate: new Date(),
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
          itemCode: orderItem.itemCode,
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
        balanceAmount: totalAmount,
      }
    })

    // Create journal entries for posted invoices
    const journalEntry = await prisma.journalEntry.create({
      data: {
        entryNumber: `${CONFIG.SEED_PREFIX}-JE-${Date.now()}`,
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

  // Create payments for some invoices
  for (const invoice of invoices.slice(0, 1)) {
    const customer = customers.find(c => c.id === invoice.customerId)
    if (!customer) continue

    const paymentAmount = invoice.totalAmount * 0.5 // 50% payment

    const payment = await prisma.payment.create({
      data: {
        paymentNumber: `${CONFIG.SEED_PREFIX}-PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        customerId: customer.id,
        invoiceId: invoice.id,
        amount: paymentAmount,
        paymentDate: new Date(),
        paymentMethod: 'BANK_TRANSFER',
        reference: `${CONFIG.SEED_PREFIX}-REF-${Math.floor(Math.random() * 100000)}`,
        notes: 'Partial payment received',
        createdBy: users.accountant.id,
      }
    })

    // Update invoice balance
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: paymentAmount,
        balanceAmount: invoice.totalAmount - paymentAmount,
      }
    })

    // Create journal entry for payment
    const journalEntry = await prisma.journalEntry.create({
      data: {
        entryNumber: `${CONFIG.SEED_PREFIX}-JE-${Date.now()}`,
        date: new Date(),
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
        currency: CONFIG.BASE_CURRENCY,
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
        currency: CONFIG.BASE_CURRENCY,
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: paymentAmount,
      }
    })

    payments.push(payment)
  }

  return payments
}

async function seedStockMovements(
  users: Record<string, any>,
  items: any[],
  accounts: Record<string, any>
): Promise<void> {
  const trackableItems = items.filter(i => i.trackInventory && i.code.startsWith(CONFIG.SEED_PREFIX))

  for (const item of trackableItems.slice(0, 2)) {
    // Create a sample outbound movement
    const stockLot = await prisma.stockLot.findFirst({
      where: { 
        itemId: item.id,
        availableQty: { gt: 0 }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (stockLot && stockLot.availableQty > 10) {
      const quantity = Math.min(10, stockLot.availableQty)
      
      await prisma.stockMovement.create({
        data: {
          movementNumber: generateMovementNumber(),
          movementType: 'OUT',
          movementDate: new Date(),
          itemId: item.id,
          stockLotId: stockLot.id,
          quantity,
          unitCost: item.standardCost || 0,
          totalCost: quantity * (item.standardCost || 0),
          unitOfMeasureId: item.unitOfMeasureId,
          referenceType: 'SALE',
          referenceNumber: generateOrderNumber(),
          notes: 'Sample outbound movement',
          createdBy: users.warehouse.id,
        }
      })

      // Update stock lot quantity
      await prisma.stockLot.update({
        where: { id: stockLot.id },
        data: {
          availableQty: stockLot.availableQty - quantity,
        }
      })
    }
  }
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
  
  console.log('\n💡 Notes:')
  console.log('- All seeded data is prefixed with "SEED-"')
  console.log('- Existing data has been preserved')
  console.log('- You can run this script multiple times safely')
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