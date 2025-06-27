import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker'
import { 
  AccountType,
  AccountStatus,
  Role,
  LeadStatus,
  LeadSource,
  SalesCaseStatus,
  MovementType,
  JournalStatus,
  ExpenseStatus,
  TaxType
} from '@/lib/types/shared-enums'

// Configuration
const CONFIG = {
  BATCH_SIZE: 100,
  DATE_RANGE_MONTHS: 24,
  PROGRESS_UPDATE_INTERVAL: 10,
  TRANSACTION_TIMEOUT: 300000, // 5 minutes
  MEMORY_CLEANUP_INTERVAL: 500,
}

// Progress tracking
class ProgressTracker {
  private processed = 0
  private total: number
  private startTime: number
  private lastUpdate = 0

  constructor(total: number, private name: string) {
    this.total = total
    this.startTime = Date.now()
    console.log(`\n📊 Starting ${name}: ${total} items`)
  }

  update(count: number = 1) {
    this.processed += count
    
    if (this.processed - this.lastUpdate >= CONFIG.PROGRESS_UPDATE_INTERVAL || this.processed === this.total) {
      const percentage = Math.round((this.processed / this.total) * 100)
      const elapsed = (Date.now() - this.startTime) / 1000
      const rate = Math.round(this.processed / elapsed)
      
      console.log(`   ⏳ ${this.name}: ${percentage}% (${this.processed}/${this.total}) - ${rate} items/sec`)
      this.lastUpdate = this.processed
    }
  }

  complete() {
    const elapsed = (Date.now() - this.startTime) / 1000
    console.log(`   ✅ ${this.name} completed in ${elapsed.toFixed(1)}s`)
  }
}

// Batch processing utility
async function processBatch<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  batchSize: number = CONFIG.BATCH_SIZE,
  name: string = 'Processing'
): Promise<R[]> {
  const results: R[] = []
  const tracker = new ProgressTracker(items.length, name)
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await processor(batch)
    results.push(...batchResults)
    
    tracker.update(batch.length)
    
    // Memory cleanup every N records
    if (i % CONFIG.MEMORY_CLEANUP_INTERVAL === 0 && i > 0) {
      if (global.gc) {
        global.gc()
      }
    }
  }
  
  tracker.complete()
  return results
}

// Date utilities
function getRandomDate(startDate: Date, endDate: Date): Date {
  const startTime = startDate.getTime()
  const endTime = endDate.getTime()
  const randomTime = startTime + Math.random() * (endTime - startTime)
  return new Date(randomTime)
}

function getDateMonthsAgo(months: number): Date {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return date
}

// Retry utility
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (retries > 0) {
      console.warn(`   ⚠️  Retrying after error: ${(error as Error).message}`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return withRetry(fn, retries - 1, delay * 2)
    }
    throw error
  }
}

// Transaction wrapper
async function withTransaction<T>(
  fn: (tx: any) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn, {
    timeout: CONFIG.TRANSACTION_TIMEOUT
  })
}

// UAE Marine Company Data
const UAE_MARINE_CUSTOMERS = [
  { name: 'Abu Dhabi Ports Company', trn: '100000000000001', location: 'Abu Dhabi' },
  { name: 'DP World - Jebel Ali', trn: '100000000000002', location: 'Dubai' },
  { name: 'Sharjah Port Authority', trn: '100000000000003', location: 'Sharjah' },
  { name: 'Emirates Shipping Line', trn: '100000000000004', location: 'Dubai' },
  { name: 'Gulf Navigation Holding', trn: '100000000000005', location: 'Dubai' },
  { name: 'Al Marwan Shipping', trn: '100000000000006', location: 'Abu Dhabi' },
  { name: 'Dubai Maritime City Authority', trn: '100000000000007', location: 'Dubai' },
  { name: 'RAK Ports', trn: '100000000000008', location: 'Ras Al Khaimah' },
  { name: 'Fujairah Port Authority', trn: '100000000000009', location: 'Fujairah' },
  { name: 'Abu Dhabi Marine Services', trn: '100000000000010', location: 'Abu Dhabi' },
  { name: 'Al Seer Marine Supplies', trn: '100000000000011', location: 'Dubai' },
  { name: 'Gulf Craft Shipyard', trn: '100000000000012', location: 'Umm Al Quwain' },
  { name: 'Dubai Drydocks World', trn: '100000000000013', location: 'Dubai' },
  { name: 'Emirates Transport', trn: '100000000000014', location: 'Abu Dhabi' },
  { name: 'Halul Offshore Services', trn: '100000000000015', location: 'Dubai' }
]

const MARINE_ENGINE_SUPPLIERS = [
  { name: 'Caterpillar Marine - Middle East', brand: 'CAT', country: 'UAE' },
  { name: 'Cummins Arabia FZE', brand: 'Cummins', country: 'UAE' },
  { name: 'MAN Energy Solutions Gulf', brand: 'MAN', country: 'UAE' },
  { name: 'Wärtsilä Gulf FZE', brand: 'Wärtsilä', country: 'UAE' },
  { name: 'Volvo Penta Middle East', brand: 'Volvo Penta', country: 'UAE' },
  { name: 'MTU Middle East FZE', brand: 'MTU', country: 'UAE' },
  { name: 'Yanmar Gulf FZE', brand: 'Yanmar', country: 'UAE' },
  { name: 'Deutz Middle East', brand: 'Deutz', country: 'UAE' },
  { name: 'Perkins Arabia', brand: 'Perkins', country: 'UAE' },
  { name: 'John Deere Marine Gulf', brand: 'John Deere', country: 'UAE' }
]

const MARINE_SPARE_PARTS_CATEGORIES = [
  { name: 'Engine Core Components', code: 'ENG-CORE' },
  { name: 'Fuel System Parts', code: 'FUEL-SYS' },
  { name: 'Cooling System Parts', code: 'COOL-SYS' },
  { name: 'Turbocharger Components', code: 'TURBO' },
  { name: 'Lubrication System', code: 'LUB-SYS' },
  { name: 'Electrical Components', code: 'ELEC' },
  { name: 'Exhaust System', code: 'EXHAUST' },
  { name: 'Marine Transmission', code: 'TRANS' }
]

const SPARE_PARTS_TEMPLATE = [
  // Engine Core
  { name: 'Piston Assembly', category: 'ENG-CORE', minPrice: 2500, maxPrice: 8500 },
  { name: 'Cylinder Head', category: 'ENG-CORE', minPrice: 4500, maxPrice: 15000 },
  { name: 'Crankshaft', category: 'ENG-CORE', minPrice: 8000, maxPrice: 35000 },
  { name: 'Connecting Rod', category: 'ENG-CORE', minPrice: 1200, maxPrice: 4500 },
  // Fuel System
  { name: 'Fuel Injection Pump', category: 'FUEL-SYS', minPrice: 3500, maxPrice: 12000 },
  { name: 'Fuel Injector', category: 'FUEL-SYS', minPrice: 800, maxPrice: 2500 },
  { name: 'High Pressure Fuel Rail', category: 'FUEL-SYS', minPrice: 1500, maxPrice: 5000 },
  // Cooling System
  { name: 'Water Pump Assembly', category: 'COOL-SYS', minPrice: 1200, maxPrice: 3500 },
  { name: 'Heat Exchanger', category: 'COOL-SYS', minPrice: 2500, maxPrice: 8000 },
  { name: 'Thermostat Housing', category: 'COOL-SYS', minPrice: 450, maxPrice: 1200 },
  // Turbocharger
  { name: 'Turbocharger Cartridge', category: 'TURBO', minPrice: 4500, maxPrice: 18000 },
  { name: 'Wastegate Actuator', category: 'TURBO', minPrice: 850, maxPrice: 2500 },
  { name: 'Turbo Repair Kit', category: 'TURBO', minPrice: 1200, maxPrice: 3500 },
  // Lubrication
  { name: 'Oil Pump Assembly', category: 'LUB-SYS', minPrice: 1500, maxPrice: 4500 },
  { name: 'Oil Cooler', category: 'LUB-SYS', minPrice: 850, maxPrice: 2500 },
  { name: 'Oil Filter Housing', category: 'LUB-SYS', minPrice: 350, maxPrice: 950 },
  // Electrical
  { name: 'Alternator 24V', category: 'ELEC', minPrice: 1200, maxPrice: 3500 },
  { name: 'Starter Motor', category: 'ELEC', minPrice: 950, maxPrice: 2800 },
  { name: 'ECU Module', category: 'ELEC', minPrice: 3500, maxPrice: 12000 },
  // Exhaust
  { name: 'Exhaust Manifold', category: 'EXHAUST', minPrice: 1800, maxPrice: 5500 },
  { name: 'Exhaust Elbow', category: 'EXHAUST', minPrice: 650, maxPrice: 1800 },
  { name: 'Muffler Assembly', category: 'EXHAUST', minPrice: 950, maxPrice: 2800 },
  // Transmission
  { name: 'Clutch Plate Set', category: 'TRANS', minPrice: 1500, maxPrice: 4500 },
  { name: 'Gearbox Oil Cooler', category: 'TRANS', minPrice: 850, maxPrice: 2500 },
  { name: 'Propeller Shaft Coupling', category: 'TRANS', minPrice: 1200, maxPrice: 3500 },
  { name: 'Reduction Gear Set', category: 'TRANS', minPrice: 3500, maxPrice: 12000 },
  { name: 'Marine Transmission Filter', category: 'TRANS', minPrice: 250, maxPrice: 650 }
]

// Main seed function
async function main(): Promise<void> {
  console.log('🌱 Starting UAE Marine Engine Maintenance Company comprehensive seed...')
  console.log(`📅 Generating ${CONFIG.DATE_RANGE_MONTHS} months of historical data`)
  
  const shouldClearData = process.env.CLEAR_DATA === 'true'
  
  if (shouldClearData) {
    console.log('🧹 Clearing existing data...')
    await clearDatabase()
  }
  
  try {
    // Phase 1: Base Data
    console.log('\n🏗️  Phase 1: Creating base data...')
    const { users, accounts } = await createBaseData()
    
    // Phase 2: Master Data
    console.log('\n🏢 Phase 2: Creating master data...')
    const { customers, suppliers, categories, items, locations, unitsOfMeasure } = await createMasterData(users.admin.id, accounts)
    
    // Phase 3: Transactional Data
    console.log('\n💼 Phase 3: Creating transactional data...')
    const { leads, salesCases, quotations, salesOrders, purchaseOrders } = await createTransactionalData(
      users,
      customers,
      suppliers,
      items
    )
    
    // Phase 4: Financial Data
    console.log('\n💰 Phase 4: Creating financial data...')
    const { invoices, payments, supplierInvoices, supplierPayments } = await createFinancialData(
      users,
      salesOrders,
      purchaseOrders,
      customers,
      suppliers,
      accounts
    )
    
    // Phase 5: Operational Data
    console.log('\n🚚 Phase 5: Creating operational data...')
    await createOperationalData(
      users,
      salesOrders,
      purchaseOrders,
      items,
      locations,
      unitsOfMeasure
    )
    
    // Summary
    console.log('\n📊 Seed Summary:')
    console.log(`   👥 Users: ${Object.keys(users).length}`)
    console.log(`   🏢 Customers: ${customers.length}`)
    console.log(`   🏭 Suppliers: ${suppliers.length}`)
    console.log(`   📦 Inventory Items: ${items.length}`)
    console.log(`   🎯 Leads: ${leads.length}`)
    console.log(`   💼 Sales Cases: ${salesCases.length}`)
    console.log(`   📄 Quotations: ${quotations.length}`)
    console.log(`   🛒 Sales Orders: ${salesOrders.length}`)
    console.log(`   📋 Purchase Orders: ${purchaseOrders.length}`)
    console.log(`   💳 Invoices: ${invoices.length}`)
    console.log(`   💸 Payments: ${payments.length}`)
    
    console.log('\n🎉 UAE Marine Engine Maintenance seed completed successfully!')
    
  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Clear database
async function clearDatabase(): Promise<void> {
  const tablesToClear = [
    'auditLog',
    'stockReservation',
    'inventoryBalance',
    'stockMovement',
    'stockTransferLine',
    'stockTransfer',
    'stockLot',
    'shipmentItem',
    'shipment',
    'journalLine',
    'journalEntry',
    'payment',
    'invoice',
    'supplierPayment',
    'supplierInvoice',
    'goodsReceiptLine',
    'goodsReceipt',
    'purchaseOrderLine',
    'purchaseOrder',
    'caseExpense',
    'salesOrderLine',
    'salesOrder',
    'quotationLine',
    'quotation',
    'salesCase',
    'customer',
    'lead',
    'supplier',
    'item',
    'category',
    'location',
    'unitOfMeasure',
    'taxRate',
    'taxCategory',
    'account',
    'companySettings',
    'userPermission',
    'userProfile',
    'userSession',
    'salesTeamMember',
    'user'
  ]

  console.log('   🗑️  Clearing tables...')
  for (const table of tablesToClear) {
    try {
      await (prisma as any)[table].deleteMany({})
      console.log(`   ✓ Cleared ${table}`)
    } catch (error) {
      console.warn(`   ⚠️  Could not clear ${table}: ${(error as Error).message}`)
    }
  }
}

// Phase 1: Base Data
async function createBaseData() {
  console.log('   👥 Creating users...')
  
  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10)
  
  const [admin, salesManager, salesRep1, salesRep2, accountant, warehouseManager] = await Promise.all([
    prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@uaemarine.ae',
        password: hashedPassword,
        role: Role.ADMIN,
        isActive: true,
        profile: {
          create: {
            firstName: 'Ahmed',
            lastName: 'Al Rashid',
            phone: '+971501234567',
            department: 'Management',
            jobTitle: 'General Manager'
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        username: 'sales.manager',
        email: 'sales.manager@uaemarine.ae',
        password: hashedPassword,
        role: Role.MANAGER,
        isActive: true,
        profile: {
          create: {
            firstName: 'Mohammed',
            lastName: 'Al Maktoum',
            phone: '+971502345678',
            department: 'Sales',
            jobTitle: 'Sales Manager'
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        username: 'sales.rep1',
        email: 'sales.rep1@uaemarine.ae',
        password: hashedPassword,
        role: Role.SALES_REP,
        isActive: true,
        profile: {
          create: {
            firstName: 'Khalid',
            lastName: 'Al Qassimi',
            phone: '+971503456789',
            department: 'Sales',
            jobTitle: 'Senior Sales Executive'
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        username: 'sales.rep2',
        email: 'sales.rep2@uaemarine.ae',
        password: hashedPassword,
        role: Role.SALES_REP,
        isActive: true,
        profile: {
          create: {
            firstName: 'Fatima',
            lastName: 'Al Nahyan',
            phone: '+971504567890',
            department: 'Sales',
            jobTitle: 'Sales Executive'
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        username: 'accountant',
        email: 'accountant@uaemarine.ae',
        password: hashedPassword,
        role: Role.ACCOUNTANT,
        isActive: true,
        profile: {
          create: {
            firstName: 'Rashid',
            lastName: 'Al Muhairi',
            phone: '+971505678901',
            department: 'Finance',
            jobTitle: 'Chief Accountant'
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        username: 'warehouse',
        email: 'warehouse@uaemarine.ae',
        password: hashedPassword,
        role: Role.WAREHOUSE,
        isActive: true,
        profile: {
          create: {
            firstName: 'Omar',
            lastName: 'Al Dhaheri',
            phone: '+971506789012',
            department: 'Operations',
            jobTitle: 'Warehouse Manager'
          }
        }
      }
    })
  ])
  
  // Create sales team relationships
  await prisma.salesTeamMember.createMany({
    data: [
      {
        userId: salesManager.id,
        teamName: 'UAE Marine Sales',
        role: 'MANAGER',
        isActive: true
      },
      {
        userId: salesRep1.id,
        teamName: 'UAE Marine Sales',
        role: 'MEMBER',
        managerId: salesManager.id,
        isActive: true
      },
      {
        userId: salesRep2.id,
        teamName: 'UAE Marine Sales',
        role: 'MEMBER',
        managerId: salesManager.id,
        isActive: true
      }
    ]
  })
  
  console.log('   📊 Creating chart of accounts...')
  
  // Create Chart of Accounts
  const accounts: Record<string, any> = {}
  
  // Asset Accounts
  const assetAccounts = [
    { code: '1000', name: 'Cash - AED', currency: 'AED' },
    { code: '1100', name: 'Accounts Receivable', currency: 'AED' },
    { code: '1200', name: 'Inventory - Marine Parts', currency: 'AED' },
    { code: '1300', name: 'Prepaid Expenses', currency: 'AED' },
    { code: '1500', name: 'Property, Plant & Equipment', currency: 'AED' }
  ]
  
  for (const acc of assetAccounts) {
    accounts[acc.code] = await prisma.account.create({
      data: {
        ...acc,
        type: AccountType.ASSET,
        status: AccountStatus.ACTIVE,
        createdBy: admin.id
      }
    })
  }
  
  // Liability Accounts
  const liabilityAccounts = [
    { code: '2000', name: 'Accounts Payable', currency: 'AED' },
    { code: '2100', name: 'VAT Payable', currency: 'AED' },
    { code: '2200', name: 'Salaries Payable', currency: 'AED' },
    { code: '2300', name: 'Short-term Loans', currency: 'AED' }
  ]
  
  for (const acc of liabilityAccounts) {
    accounts[acc.code] = await prisma.account.create({
      data: {
        ...acc,
        type: AccountType.LIABILITY,
        status: AccountStatus.ACTIVE,
        createdBy: admin.id
      }
    })
  }
  
  // Equity Accounts
  const equityAccounts = [
    { code: '3000', name: 'Share Capital', currency: 'AED' },
    { code: '3100', name: 'Retained Earnings', currency: 'AED' }
  ]
  
  for (const acc of equityAccounts) {
    accounts[acc.code] = await prisma.account.create({
      data: {
        ...acc,
        type: AccountType.EQUITY,
        status: AccountStatus.ACTIVE,
        createdBy: admin.id
      }
    })
  }
  
  // Income Accounts
  const incomeAccounts = [
    { code: '4000', name: 'Sales - Marine Spare Parts', currency: 'AED' },
    { code: '4100', name: 'Service Revenue - Maintenance', currency: 'AED' },
    { code: '4200', name: 'Other Income', currency: 'AED' }
  ]
  
  for (const acc of incomeAccounts) {
    accounts[acc.code] = await prisma.account.create({
      data: {
        ...acc,
        type: AccountType.INCOME,
        status: AccountStatus.ACTIVE,
        createdBy: admin.id
      }
    })
  }
  
  // Expense Accounts
  const expenseAccounts = [
    { code: '5000', name: 'Cost of Goods Sold', currency: 'AED' },
    { code: '5100', name: 'Salaries & Benefits', currency: 'AED' },
    { code: '5200', name: 'Rent Expense', currency: 'AED' },
    { code: '5300', name: 'Utilities', currency: 'AED' },
    { code: '5400', name: 'Marketing & Advertising', currency: 'AED' },
    { code: '5500', name: 'Office Supplies', currency: 'AED' },
    { code: '5600', name: 'Transportation', currency: 'AED' },
    { code: '5700', name: 'Professional Fees', currency: 'AED' },
    { code: '5800', name: 'Insurance', currency: 'AED' },
    { code: '5900', name: 'Other Expenses', currency: 'AED' }
  ]
  
  for (const acc of expenseAccounts) {
    accounts[acc.code] = await prisma.account.create({
      data: {
        ...acc,
        type: AccountType.EXPENSE,
        status: AccountStatus.ACTIVE,
        createdBy: admin.id
      }
    })
  }
  
  // Create Company Settings
  await prisma.companySettings.create({
    data: {
      companyName: 'UAE Marine Engine Maintenance LLC',
      taxId: '100234567890123',
      currency: 'AED',
      fiscalYearStart: new Date('2024-01-01'),
      address: 'Jebel Ali Free Zone, Dubai, UAE',
      phone: '+971 4 123 4567',
      email: 'info@uaemarine.ae',
      website: 'www.uaemarine.ae',
      defaultPaymentTerms: 30,
      defaultTaxRate: 5,
      createdBy: admin.id,
      defaultInventoryAccountId: accounts['1200'].id,
      defaultCogsAccountId: accounts['5000'].id,
      defaultSalesAccountId: accounts['4000'].id
    }
  })
  
  console.log('   ✅ Base data created')
  
  return {
    users: { admin, salesManager, salesRep1, salesRep2, accountant, warehouseManager },
    accounts
  }
}

// Phase 2: Master Data
async function createMasterData(adminId: string, accounts: Record<string, any>) {
  console.log('   🏭 Creating suppliers...')
  
  // Create Suppliers
  const suppliers = await processBatch(
    MARINE_ENGINE_SUPPLIERS,
    async (batch) => {
      return Promise.all(
        batch.map((supplier, index) =>
          prisma.supplier.create({
            data: {
              supplierNumber: `SUP-${String(index + 1).padStart(4, '0')}`,
              name: supplier.name,
              email: `contact@${supplier.brand.toLowerCase().replace(/\s+/g, '')}.ae`,
              phone: `+971 4 ${faker.number.int({ min: 200, max: 899 })} ${faker.number.int({ min: 1000, max: 9999 })}`,
              address: `${faker.location.streetAddress()}, Dubai, UAE`,
              taxId: `10${faker.number.int({ min: 1000000000000, max: 9999999999999 })}`,
              currency: 'AED',
              paymentTerms: faker.helpers.arrayElement([30, 45, 60]),
              createdBy: adminId,
              createdAt: getRandomDate(getDateMonthsAgo(CONFIG.DATE_RANGE_MONTHS), new Date()),
              account: {
                create: {
                  code: `2010-${String(index + 1).padStart(3, '0')}`,
                  name: `AP - ${supplier.name}`,
                  type: AccountType.LIABILITY,
                  currency: 'AED',
                  status: AccountStatus.ACTIVE,
                  createdBy: adminId
                }
              }
            },
            include: { account: true }
          })
        )
      )
    },
    50,
    'Creating suppliers'
  )
  
  console.log('   🏷️ Creating categories...')
  
  // Create Categories
  const categories = await Promise.all(
    MARINE_SPARE_PARTS_CATEGORIES.map((cat, index) =>
      prisma.category.create({
        data: {
          code: cat.code,
          name: cat.name,
          description: `Marine engine ${cat.name.toLowerCase()}`,
          isActive: true,
          createdBy: adminId
        }
      })
    )
  )
  
  console.log('   📐 Creating units of measure...')
  
  // Create Units of Measure
  const unitsOfMeasure = await Promise.all([
    { code: 'PC', name: 'Piece', baseUnit: true },
    { code: 'SET', name: 'Set', baseUnit: false, conversionFactor: 1 },
    { code: 'BOX', name: 'Box', baseUnit: false, conversionFactor: 10 },
    { code: 'KG', name: 'Kilogram', baseUnit: true },
    { code: 'L', name: 'Liter', baseUnit: true }
  ].map(uom =>
    prisma.unitOfMeasure.create({
      data: {
        ...uom,
        createdBy: adminId
      }
    })
  ))
  
  console.log('   📦 Creating inventory items...')
  
  // Create Items
  const itemsData: any[] = []
  let itemIndex = 0
  
  for (const supplier of suppliers) {
    for (const template of SPARE_PARTS_TEMPLATE) {
      const category = categories.find(c => c.code === template.category)
      if (!category) continue
      
      const basePrice = faker.number.int({ min: template.minPrice, max: template.maxPrice })
      const itemCode = `${supplier.name.split(' ')[0].toUpperCase()}-${template.category}-${String(++itemIndex).padStart(4, '0')}`
      
      itemsData.push({
        code: itemCode,
        name: `${template.name} - ${supplier.name.split(' ')[0]}`,
        description: `${template.name} for marine engines by ${supplier.name}`,
        type: 'INVENTORY',
        categoryId: category.id,
        unitOfMeasureId: unitsOfMeasure[0].id, // PC
        costPrice: basePrice * 0.6,
        sellingPrice: basePrice,
        reorderPoint: faker.number.int({ min: 5, max: 20 }),
        reorderQuantity: faker.number.int({ min: 10, max: 50 }),
        isActive: true,
        createdBy: adminId,
        supplierId: supplier.id,
        inventoryAccountId: accounts['1200'].id,
        cogsAccountId: accounts['5000'].id,
        salesAccountId: accounts['4000'].id
      })
    }
  }
  
  const items = await processBatch(
    itemsData,
    async (batch) => {
      return Promise.all(
        batch.map(item => prisma.item.create({ data: item }))
      )
    },
    100,
    'Creating inventory items'
  )
  
  console.log('   🏢 Creating locations...')
  
  // Create Locations
  const locations = await Promise.all([
    {
      code: 'MAIN-WH',
      name: 'Main Warehouse - Jebel Ali',
      type: 'WAREHOUSE',
      address: 'Jebel Ali Free Zone, Dubai, UAE',
      isActive: true
    },
    {
      code: 'SPARE-01',
      name: 'Spare Parts Storage A',
      type: 'STORAGE',
      parentId: null,
      isActive: true
    },
    {
      code: 'SPARE-02',
      name: 'Spare Parts Storage B',
      type: 'STORAGE',
      parentId: null,
      isActive: true
    }
  ].map(async (loc, index) => {
    const parentLocation = index === 0 ? null : locations[0]
    return prisma.location.create({
      data: {
        ...loc,
        parentId: parentLocation?.id,
        createdBy: adminId,
        inventoryAccountId: accounts['1200'].id
      }
    })
  }))
  
  console.log('   🎯 Creating leads...')
  
  // Create Leads
  const leadsData = UAE_MARINE_CUSTOMERS.map((customer, index) => ({
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: `contact${index + 1}@${customer.name.toLowerCase().replace(/\s+/g, '')}.ae`,
    phone: `+971 ${faker.helpers.arrayElement(['50', '52', '55', '56'])} ${faker.number.int({ min: 1000000, max: 9999999 })}`,
    company: customer.name,
    jobTitle: faker.helpers.arrayElement(['Procurement Manager', 'Operations Director', 'Fleet Manager', 'Technical Manager']),
    source: faker.helpers.arrayElement(Object.values(LeadSource)),
    status: LeadStatus.NEW,
    notes: `Interested in marine engine spare parts and maintenance services`,
    createdBy: adminId,
    createdAt: getRandomDate(getDateMonthsAgo(CONFIG.DATE_RANGE_MONTHS), getDateMonthsAgo(CONFIG.DATE_RANGE_MONTHS - 2))
  }))
  
  const leads = await processBatch(
    leadsData,
    async (batch) => {
      return Promise.all(
        batch.map(lead => prisma.lead.create({ data: lead }))
      )
    },
    50,
    'Creating leads'
  )
  
  console.log('   🏢 Creating customers...')
  
  // Convert some leads to customers
  const customersData = leads.slice(0, 10).map((lead, index) => {
    const uaeCustomer = UAE_MARINE_CUSTOMERS[index]
    return {
      customerNumber: `CUST-${String(index + 1).padStart(5, '0')}`,
      name: lead.company!,
      email: lead.email,
      phone: lead.phone,
      industry: 'Marine & Shipping',
      website: `www.${lead.company!.toLowerCase().replace(/\s+/g, '')}.ae`,
      address: `${faker.location.streetAddress()}, ${uaeCustomer.location}, UAE`,
      taxId: uaeCustomer.trn,
      currency: 'AED',
      creditLimit: faker.number.int({ min: 50000, max: 500000 }),
      paymentTerms: faker.helpers.arrayElement([30, 45, 60]),
      leadId: lead.id,
      assignedToId: faker.helpers.arrayElement([adminId]),
      assignedAt: new Date(),
      createdBy: adminId,
      createdAt: getRandomDate(lead.createdAt, getDateMonthsAgo(CONFIG.DATE_RANGE_MONTHS - 3))
    }
  })
  
  const customers = await processBatch(
    customersData,
    async (batch) => {
      return Promise.all(
        batch.map(async (customer) => {
          // Update lead status
          await prisma.lead.update({
            where: { id: customer.leadId! },
            data: { status: LeadStatus.CONVERTED }
          })
          
          // Create customer with account
          return prisma.customer.create({
            data: {
              ...customer,
              account: {
                create: {
                  code: `1110-${customer.customerNumber}`,
                  name: `AR - ${customer.name}`,
                  type: AccountType.ASSET,
                  currency: customer.currency,
                  status: AccountStatus.ACTIVE,
                  createdBy: customer.createdBy
                }
              }
            },
            include: { account: true }
          })
        })
      )
    },
    20,
    'Creating customers'
  )
  
  // Create tax configuration
  console.log('   💰 Creating tax configuration...')
  
  const taxCategory = await prisma.taxCategory.create({
    data: {
      code: 'VAT-UAE',
      name: 'UAE VAT',
      description: 'Value Added Tax - UAE',
      isActive: true,
      createdBy: adminId
    }
  })
  
  await prisma.taxRate.create({
    data: {
      code: 'VAT-5',
      name: 'UAE VAT 5%',
      rate: 5,
      type: TaxType.BOTH,
      categoryId: taxCategory.id,
      isDefault: true,
      isActive: true,
      createdBy: adminId,
      collectedAccountId: accounts['2100'].id,
      paidAccountId: accounts['2100'].id
    }
  })
  
  console.log('   ✅ Master data created')
  
  return { customers, suppliers, categories, items, locations, unitsOfMeasure }
}

// Phase 3: Transactional Data
async function createTransactionalData(
  users: any,
  customers: any[],
  suppliers: any[],
  items: any[]
) {
  console.log('   💼 Creating sales cases...')
  
  const salesCasesData: any[] = []
  
  for (const customer of customers) {
    const numCases = faker.number.int({ min: 2, max: 5 })
    for (let i = 0; i < numCases; i++) {
      const createdAt = getRandomDate(customer.createdAt, new Date())
      const estimatedValue = faker.number.int({ min: 25000, max: 500000 })
      
      salesCasesData.push({
        caseNumber: `CASE-${new Date().getFullYear()}-${String(salesCasesData.length + 1).padStart(5, '0')}`,
        customerId: customer.id,
        title: faker.helpers.arrayElement([
          'Annual Maintenance Contract',
          'Engine Overhaul Project',
          'Spare Parts Supply Agreement',
          'Emergency Repair Services',
          'Preventive Maintenance Package'
        ]),
        description: `Marine engine maintenance and spare parts supply for ${customer.name}`,
        status: faker.helpers.weighted(
          [SalesCaseStatus.OPEN, SalesCaseStatus.WON, SalesCaseStatus.LOST],
          [0.5, 0.4, 0.1]
        ),
        estimatedValue,
        actualValue: 0,
        cost: 0,
        profitMargin: 0,
        createdBy: faker.helpers.arrayElement([users.salesRep1.id, users.salesRep2.id]),
        assignedTo: faker.helpers.arrayElement([users.salesRep1.id, users.salesRep2.id]),
        createdAt
      })
    }
  }
  
  const salesCases = await processBatch(
    salesCasesData,
    async (batch) => {
      return Promise.all(
        batch.map(sc => prisma.salesCase.create({ data: sc }))
      )
    },
    50,
    'Creating sales cases'
  )
  
  console.log('   📄 Creating quotations...')
  
  // Create Quotations
  const quotationsData: any[] = []
  let quotationNumber = 1
  
  for (const salesCase of salesCases.filter(sc => sc.status !== SalesCaseStatus.LOST)) {
    const numQuotations = faker.number.int({ min: 1, max: 3 })
    
    for (let i = 0; i < numQuotations; i++) {
      const createdAt = getRandomDate(salesCase.createdAt, new Date())
      const expiryDate = new Date(createdAt)
      expiryDate.setDate(expiryDate.getDate() + 30)
      
      // Select random items for quotation
      const quotationItems = faker.helpers.arrayElements(items, faker.number.int({ min: 3, max: 15 }))
      const lines: any[] = quotationItems.map((item, lineIndex) => {
        const quantity = faker.number.int({ min: 1, max: 20 })
        const unitPrice = item.sellingPrice * faker.number.float({ min: 0.9, max: 1.1 })
        const discountPercent = faker.helpers.weighted([0, 5, 10], [0.5, 0.3, 0.2])
        const discountAmount = (unitPrice * quantity * discountPercent) / 100
        const lineTotal = (unitPrice * quantity) - discountAmount
        const taxAmount = lineTotal * 0.05 // 5% VAT
        
        return {
          lineNumber: lineIndex + 1,
          itemId: item.id,
          description: item.description,
          quantity,
          unitPrice,
          discountPercent,
          discountAmount,
          taxPercent: 5,
          taxAmount,
          lineTotal: lineTotal + taxAmount
        }
      })
      
      const subtotal = lines.reduce((sum, line) => sum + (line.unitPrice * line.quantity), 0)
      const totalDiscount = lines.reduce((sum, line) => sum + line.discountAmount, 0)
      const totalTax = lines.reduce((sum, line) => sum + line.taxAmount, 0)
      const total = subtotal - totalDiscount + totalTax
      
      quotationsData.push({
        quotationNumber: `QUOT-${new Date().getFullYear()}-${String(quotationNumber++).padStart(4, '0')}`,
        salesCaseId: salesCase.id,
        version: i + 1,
        date: createdAt,
        expiryDate,
        currency: 'AED',
        exchangeRate: 1,
        paymentTerms: '30 days net',
        deliveryTerms: 'Ex-Works Dubai',
        validity: '30 days',
        notes: 'Prices are subject to availability. Delivery time: 2-4 weeks.',
        termsAndConditions: 'Standard terms and conditions apply.',
        subtotal,
        discountPercent: 0,
        discountAmount: 0,
        taxAmount: totalTax,
        total,
        status: faker.helpers.weighted(
          ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
          [0.1, 0.3, 0.4, 0.1, 0.1]
        ),
        createdBy: salesCase.createdBy,
        createdAt,
        lines
      })
    }
  }
  
  const quotations = await processBatch(
    quotationsData,
    async (batch) => {
      return Promise.all(
        batch.map(quot => 
          prisma.quotation.create({
            data: {
              ...quot,
              lines: {
                create: quot.lines
              }
            },
            include: { lines: true }
          })
        )
      )
    },
    20,
    'Creating quotations'
  )
  
  console.log('   🛒 Creating sales orders...')
  
  // Create Sales Orders from accepted quotations
  const acceptedQuotations = quotations.filter(q => q.status === 'ACCEPTED')
  const salesOrdersData = acceptedQuotations.map((quotation, index) => {
    const orderDate = getRandomDate(quotation.createdAt, new Date())
    
    return {
      orderNumber: `SO-${new Date().getFullYear()}-${String(index + 1).padStart(5, '0')}`,
      quotationId: quotation.id,
      salesCaseId: quotation.salesCaseId,
      orderDate,
      requiredDate: new Date(orderDate.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days later
      currency: quotation.currency,
      exchangeRate: quotation.exchangeRate,
      paymentTerms: quotation.paymentTerms,
      deliveryTerms: quotation.deliveryTerms,
      customerPONumber: `PO-${faker.string.alphanumeric(8).toUpperCase()}`,
      subtotal: quotation.subtotal,
      discountAmount: quotation.discountAmount,
      taxAmount: quotation.taxAmount,
      total: quotation.total,
      status: faker.helpers.weighted(
        ['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
        [0.05, 0.2, 0.3, 0.4, 0.05]
      ),
      createdBy: quotation.createdBy,
      createdAt: orderDate
    }
  })
  
  const salesOrders = await processBatch(
    salesOrdersData,
    async (batch) => {
      return Promise.all(
        batch.map(async (so) => {
          const quotation = acceptedQuotations.find(q => q.id === so.quotationId)
          if (!quotation) return null
          
          const order = await prisma.salesOrder.create({
            data: {
              ...so,
              lines: {
                create: quotation.lines.map(line => ({
                  lineNumber: line.lineNumber,
                  itemId: line.itemId,
                  description: line.description,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  discountPercent: line.discountPercent,
                  discountAmount: line.discountAmount,
                  taxPercent: line.taxPercent,
                  taxAmount: line.taxAmount,
                  lineTotal: line.lineTotal
                }))
              }
            },
            include: { lines: true }
          })
          
          // Update sales case actual value
          await prisma.salesCase.update({
            where: { id: so.salesCaseId },
            data: {
              actualValue: { increment: so.total }
            }
          })
          
          return order
        })
      )
    },
    20,
    'Creating sales orders'
  )
  
  console.log('   📋 Creating purchase orders...')
  
  // Create Purchase Orders for inventory replenishment
  const purchaseOrdersData: any[] = []
  let poNumber = 1
  
  // Group items by supplier
  const itemsBySupplier = items.reduce((acc, item) => {
    if (!acc[item.supplierId]) acc[item.supplierId] = []
    acc[item.supplierId].push(item)
    return acc
  }, {} as Record<string, any[]>)
  
  for (const [supplierId, supplierItems] of Object.entries(itemsBySupplier)) {
    const supplier = suppliers.find(s => s.id === supplierId)
    if (!supplier) continue
    
    // Create 3-5 POs per supplier over the date range
    const numPOs = faker.number.int({ min: 3, max: 5 })
    
    for (let i = 0; i < numPOs; i++) {
      const orderDate = getRandomDate(getDateMonthsAgo(CONFIG.DATE_RANGE_MONTHS), new Date())
      const poItems = faker.helpers.arrayElements(supplierItems, faker.number.int({ min: 5, max: 15 }))
      
      const lines = poItems.map((item, lineIndex) => {
        const quantity = faker.number.int({ min: 10, max: 100 })
        const unitPrice = item.costPrice
        const lineTotal = unitPrice * quantity
        const taxAmount = lineTotal * 0.05
        
        return {
          lineNumber: lineIndex + 1,
          itemId: item.id,
          description: item.description,
          quantity,
          unitPrice,
          taxPercent: 5,
          taxAmount,
          lineTotal: lineTotal + taxAmount
        }
      })
      
      const subtotal = lines.reduce((sum, line) => sum + (line.unitPrice * line.quantity), 0)
      const totalTax = lines.reduce((sum, line) => sum + line.taxAmount, 0)
      const total = subtotal + totalTax
      
      purchaseOrdersData.push({
        poNumber: `PO-${new Date().getFullYear()}-${String(poNumber++).padStart(5, '0')}`,
        supplierId,
        orderDate,
        requiredDate: new Date(orderDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days later
        currency: supplier.currency,
        exchangeRate: 1,
        paymentTerms: `${supplier.paymentTerms} days`,
        shippingTerms: 'FOB Origin',
        subtotal,
        taxAmount: totalTax,
        total,
        status: faker.helpers.weighted(
          ['DRAFT', 'SENT', 'CONFIRMED', 'PARTIAL', 'RECEIVED', 'CANCELLED'],
          [0.05, 0.1, 0.2, 0.2, 0.4, 0.05]
        ),
        createdBy: users.admin.id,
        createdAt: orderDate,
        lines
      })
    }
  }
  
  const purchaseOrders = await processBatch(
    purchaseOrdersData,
    async (batch) => {
      return Promise.all(
        batch.map(po =>
          prisma.purchaseOrder.create({
            data: {
              ...po,
              lines: {
                create: po.lines
              }
            },
            include: { lines: true }
          })
        )
      )
    },
    20,
    'Creating purchase orders'
  )
  
  console.log('   ✅ Transactional data created')
  
  return { leads, salesCases, quotations, salesOrders, purchaseOrders }
}

// Phase 4: Financial Data
async function createFinancialData(
  users: any,
  salesOrders: any[],
  purchaseOrders: any[],
  customers: any[],
  suppliers: any[],
  accounts: Record<string, any>
) {
  console.log('   💳 Creating invoices...')
  
  // Create Invoices for completed sales orders
  const completedOrders = salesOrders.filter(so => 
    so && ['COMPLETED', 'IN_PROGRESS'].includes(so.status)
  )
  
  const invoicesData = completedOrders.map((order, index) => {
    const salesCase = order.salesCaseId
    const customer = customers.find(c => c.salesCases?.some((sc: any) => sc.id === salesCase))
    if (!customer) return null
    
    const invoiceDate = getRandomDate(order.orderDate, new Date())
    const dueDate = new Date(invoiceDate)
    dueDate.setDate(dueDate.getDate() + customer.paymentTerms)
    
    return {
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(index + 1).padStart(5, '0')}`,
      customerId: customer.id,
      salesOrderId: order.id,
      invoiceDate,
      dueDate,
      currency: order.currency,
      exchangeRate: order.exchangeRate,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      taxAmount: order.taxAmount,
      total: order.total,
      amountDue: order.total,
      status: faker.helpers.weighted(
        ['DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE'],
        [0.05, 0.1, 0.2, 0.5, 0.15]
      ),
      createdBy: order.createdBy,
      createdAt: invoiceDate
    }
  }).filter(Boolean)
  
  const invoices = await processBatch(
    invoicesData as any[],
    async (batch) => {
      return Promise.all(
        batch.map(async (inv) => {
          const order = completedOrders.find(o => o.id === inv.salesOrderId)
          if (!order) return null
          
          const invoice = await prisma.invoice.create({
            data: {
              ...inv,
              lines: {
                create: order.lines.map((line: any) => ({
                  lineNumber: line.lineNumber,
                  itemId: line.itemId,
                  description: line.description,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  discountPercent: line.discountPercent,
                  discountAmount: line.discountAmount,
                  taxPercent: line.taxPercent,
                  taxAmount: line.taxAmount,
                  lineTotal: line.lineTotal
                }))
              }
            },
            include: { lines: true, customer: true }
          })
          
          // Create journal entry for invoice
          await createInvoiceJournalEntry(invoice, accounts, users.accountant.id)
          
          return invoice
        })
      )
    },
    20,
    'Creating invoices'
  )
  
  console.log('   💸 Creating payments...')
  
  // Create Payments for invoices
  const paidInvoices = invoices.filter(inv => 
    inv && ['PAID', 'PARTIAL'].includes(inv.status)
  )
  
  const payments: any[] = []
  
  for (const invoice of paidInvoices) {
    if (!invoice) continue
    
    const numPayments = invoice.status === 'PARTIAL' ? 2 : 1
    let remainingAmount = invoice.total
    
    for (let i = 0; i < numPayments; i++) {
      const paymentDate = getRandomDate(invoice.invoiceDate, new Date())
      const amount = i === numPayments - 1 
        ? remainingAmount 
        : faker.number.float({ min: remainingAmount * 0.3, max: remainingAmount * 0.7 })
      
      const payment = await prisma.payment.create({
        data: {
          paymentNumber: `PMT-${new Date().getFullYear()}-${String(payments.length + 1).padStart(5, '0')}`,
          customerId: invoice.customerId,
          paymentDate,
          amount,
          currency: invoice.currency,
          exchangeRate: invoice.exchangeRate,
          paymentMethod: faker.helpers.arrayElement(['BANK_TRANSFER', 'CHEQUE', 'CASH']),
          reference: `${faker.string.alphanumeric(8).toUpperCase()}`,
          notes: `Payment for ${invoice.invoiceNumber}`,
          status: 'COMPLETED',
          createdBy: users.accountant.id,
          createdAt: paymentDate,
          allocations: {
            create: {
              invoiceId: invoice.id,
              amount,
              createdBy: users.accountant.id
            }
          }
        },
        include: { allocations: true }
      })
      
      // Update invoice amount due
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { amountDue: { decrement: amount } }
      })
      
      // Create journal entry for payment
      await createPaymentJournalEntry(payment, invoice.customer, accounts, users.accountant.id)
      
      remainingAmount -= amount
      payments.push(payment)
    }
  }
  
  console.log('   📑 Creating supplier invoices...')
  
  // Create Supplier Invoices for received POs
  const receivedPOs = purchaseOrders.filter(po => 
    ['RECEIVED', 'PARTIAL'].includes(po.status)
  )
  
  const supplierInvoicesData = receivedPOs.map((po, index) => {
    const invoiceDate = getRandomDate(po.orderDate, new Date())
    const dueDate = new Date(invoiceDate)
    dueDate.setDate(dueDate.getDate() + 30)
    
    return {
      invoiceNumber: `SINV-${faker.string.alphanumeric(8).toUpperCase()}`,
      supplierId: po.supplierId,
      purchaseOrderId: po.id,
      invoiceDate,
      dueDate,
      currency: po.currency,
      exchangeRate: po.exchangeRate,
      subtotal: po.subtotal,
      taxAmount: po.taxAmount,
      total: po.total,
      amountDue: po.total,
      status: faker.helpers.weighted(
        ['DRAFT', 'RECEIVED', 'APPROVED', 'PARTIAL', 'PAID'],
        [0.05, 0.1, 0.2, 0.2, 0.45]
      ),
      createdBy: users.accountant.id,
      createdAt: invoiceDate
    }
  })
  
  const supplierInvoices = await processBatch(
    supplierInvoicesData,
    async (batch) => {
      return Promise.all(
        batch.map(async (si) => {
          const po = receivedPOs.find(p => p.id === si.purchaseOrderId)
          if (!po) return null
          
          const invoice = await prisma.supplierInvoice.create({
            data: {
              ...si,
              lines: {
                create: po.lines.map((line: any) => ({
                  lineNumber: line.lineNumber,
                  itemId: line.itemId,
                  description: line.description,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  taxPercent: line.taxPercent,
                  taxAmount: line.taxAmount,
                  lineTotal: line.lineTotal
                }))
              }
            },
            include: { lines: true, supplier: true }
          })
          
          // Create journal entry
          await createSupplierInvoiceJournalEntry(invoice, accounts, users.accountant.id)
          
          return invoice
        })
      )
    },
    20,
    'Creating supplier invoices'
  )
  
  console.log('   💰 Creating supplier payments...')
  
  // Create Supplier Payments
  const paidSupplierInvoices = supplierInvoices.filter(si => 
    si && ['PAID', 'PARTIAL'].includes(si.status)
  )
  
  const supplierPayments: any[] = []
  
  for (const invoice of paidSupplierInvoices) {
    if (!invoice) continue
    
    const paymentDate = getRandomDate(invoice.invoiceDate, new Date())
    
    const payment = await prisma.supplierPayment.create({
      data: {
        paymentNumber: `SPMT-${new Date().getFullYear()}-${String(supplierPayments.length + 1).padStart(5, '0')}`,
        supplierId: invoice.supplierId,
        paymentDate,
        amount: invoice.total,
        currency: invoice.currency,
        exchangeRate: invoice.exchangeRate,
        paymentMethod: 'BANK_TRANSFER',
        reference: `TT-${faker.string.alphanumeric(8).toUpperCase()}`,
        status: 'COMPLETED',
        createdBy: users.accountant.id,
        createdAt: paymentDate,
        allocations: {
          create: {
            supplierInvoiceId: invoice.id,
            amount: invoice.total,
            createdBy: users.accountant.id
          }
        }
      },
      include: { allocations: true }
    })
    
    // Update supplier invoice
    await prisma.supplierInvoice.update({
      where: { id: invoice.id },
      data: { 
        amountDue: 0,
        status: 'PAID'
      }
    })
    
    // Create journal entry
    await createSupplierPaymentJournalEntry(payment, invoice.supplier, accounts, users.accountant.id)
    
    supplierPayments.push(payment)
  }
  
  console.log('   ✅ Financial data created')
  
  return { invoices: invoices.filter(Boolean), payments, supplierInvoices: supplierInvoices.filter(Boolean), supplierPayments }
}

// Phase 5: Operational Data
async function createOperationalData(
  users: any,
  salesOrders: any[],
  purchaseOrders: any[],
  items: any[],
  locations: any[],
  unitsOfMeasure: any[]
) {
  console.log('   📦 Creating goods receipts...')
  
  // Create Goods Receipts for received POs
  const receivedPOs = purchaseOrders.filter(po => 
    ['RECEIVED', 'PARTIAL'].includes(po.status)
  )
  
  const goodsReceipts: any[] = []
  
  for (const po of receivedPOs) {
    const receiptDate = getRandomDate(po.orderDate, new Date())
    
    const receipt = await prisma.goodsReceipt.create({
      data: {
        receiptNumber: `GRN-${new Date().getFullYear()}-${String(goodsReceipts.length + 1).padStart(5, '0')}`,
        purchaseOrderId: po.id,
        receiptDate,
        status: po.status === 'RECEIVED' ? 'COMPLETED' : 'PARTIAL',
        notes: `Received from ${po.supplierId}`,
        createdBy: users.warehouseManager.id,
        createdAt: receiptDate,
        lines: {
          create: po.lines.map((line: any) => ({
            lineNumber: line.lineNumber,
            purchaseOrderLineId: line.id,
            itemId: line.itemId,
            orderedQuantity: line.quantity,
            receivedQuantity: po.status === 'RECEIVED' 
              ? line.quantity 
              : Math.floor(line.quantity * faker.number.float({ min: 0.5, max: 0.8 })),
            unitPrice: line.unitPrice,
            locationId: locations[0].id,
            createdBy: users.warehouseManager.id
          }))
        }
      },
      include: { lines: true }
    })
    
    // Create stock movements
    for (const line of receipt.lines) {
      await createStockMovement({
        itemId: line.itemId,
        locationId: line.locationId,
        quantity: line.receivedQuantity,
        type: MovementType.STOCK_IN,
        referenceType: 'GOODS_RECEIPT',
        referenceId: receipt.id,
        cost: line.unitPrice * line.receivedQuantity,
        userId: users.warehouseManager.id
      })
    }
    
    goodsReceipts.push(receipt)
  }
  
  console.log('   🚚 Creating shipments...')
  
  // Create Shipments for completed sales orders
  const shippableOrders = salesOrders.filter(so => 
    so && ['COMPLETED', 'IN_PROGRESS'].includes(so.status)
  )
  
  const shipments: any[] = []
  
  for (const order of shippableOrders) {
    const shipmentDate = getRandomDate(order.orderDate, new Date())
    
    const shipment = await prisma.shipment.create({
      data: {
        shipmentNumber: `SHP-${new Date().getFullYear()}-${String(shipments.length + 1).padStart(5, '0')}`,
        salesOrderId: order.id,
        shipmentDate,
        carrier: faker.helpers.arrayElement(['DHL', 'FedEx', 'Aramex', 'Emirates Post']),
        trackingNumber: faker.string.alphanumeric(12).toUpperCase(),
        status: faker.helpers.weighted(
          ['PENDING', 'PICKED', 'IN_TRANSIT', 'DELIVERED'],
          [0.1, 0.1, 0.2, 0.6]
        ),
        notes: `Shipment for ${order.orderNumber}`,
        createdBy: users.warehouseManager.id,
        createdAt: shipmentDate,
        items: {
          create: order.lines.map((line: any) => ({
            salesOrderLineId: line.id,
            itemId: line.itemId,
            quantity: line.quantity,
            locationId: locations[0].id,
            createdBy: users.warehouseManager.id
          }))
        }
      },
      include: { items: true }
    })
    
    // Create stock movements for shipped items
    if (['IN_TRANSIT', 'DELIVERED'].includes(shipment.status)) {
      for (const item of shipment.items) {
        await createStockMovement({
          itemId: item.itemId,
          locationId: item.locationId,
          quantity: -item.quantity,
          type: MovementType.STOCK_OUT,
          referenceType: 'SHIPMENT',
          referenceId: shipment.id,
          cost: 0,
          userId: users.warehouseManager.id
        })
      }
    }
    
    shipments.push(shipment)
  }
  
  console.log('   📊 Creating inventory balances...')
  
  // Calculate and create inventory balances
  const balanceMap = new Map<string, number>()
  
  // Get all stock movements
  const movements = await prisma.stockMovement.findMany({
    include: { item: true }
  })
  
  // Calculate balances
  for (const movement of movements) {
    const key = `${movement.itemId}-${movement.locationId}`
    const currentBalance = balanceMap.get(key) || 0
    balanceMap.set(key, currentBalance + movement.quantity)
  }
  
  // Create inventory balance records
  for (const [key, quantity] of balanceMap.entries()) {
    const [itemId, locationId] = key.split('-')
    
    if (quantity > 0) {
      const item = items.find(i => i.id === itemId)
      if (!item) continue
      
      await prisma.inventoryBalance.upsert({
        where: {
          itemId_locationId: { itemId, locationId }
        },
        update: {
          quantity,
          lastUpdated: new Date()
        },
        create: {
          itemId,
          locationId,
          quantity,
          reservedQuantity: 0,
          availableQuantity: quantity,
          lastUpdated: new Date()
        }
      })
    }
  }
  
  console.log('   ✅ Operational data created')
  
  return { goodsReceipts, shipments }
}

// Helper functions for journal entries
async function createInvoiceJournalEntry(
  invoice: any,
  accounts: Record<string, any>,
  userId: string
) {
  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber: `JE-${Date.now()}`,
      date: invoice.invoiceDate,
      description: `Invoice ${invoice.invoiceNumber}`,
      reference: invoice.invoiceNumber,
      currency: invoice.currency,
      exchangeRate: invoice.exchangeRate,
      status: JournalStatus.POSTED,
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      lines: {
        create: [
          {
            accountId: invoice.customer.accountId,
            description: `AR - ${invoice.invoiceNumber}`,
            debit: invoice.total,
            credit: 0,
            currency: invoice.currency,
            exchangeRate: invoice.exchangeRate
          },
          {
            accountId: accounts['4000'].id,
            description: `Sales - ${invoice.invoiceNumber}`,
            debit: 0,
            credit: invoice.subtotal - invoice.discountAmount,
            currency: invoice.currency,
            exchangeRate: invoice.exchangeRate
          },
          {
            accountId: accounts['2100'].id,
            description: `VAT - ${invoice.invoiceNumber}`,
            debit: 0,
            credit: invoice.taxAmount,
            currency: invoice.currency,
            exchangeRate: invoice.exchangeRate
          }
        ]
      }
    }
  })
  
  return entry
}

async function createPaymentJournalEntry(
  payment: any,
  customer: any,
  accounts: Record<string, any>,
  userId: string
) {
  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber: `JE-${Date.now()}`,
      date: payment.paymentDate,
      description: `Payment ${payment.paymentNumber}`,
      reference: payment.paymentNumber,
      currency: payment.currency,
      exchangeRate: payment.exchangeRate,
      status: JournalStatus.POSTED,
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      lines: {
        create: [
          {
            accountId: accounts['1000'].id,
            description: `Cash receipt - ${payment.paymentNumber}`,
            debit: payment.amount,
            credit: 0,
            currency: payment.currency,
            exchangeRate: payment.exchangeRate
          },
          {
            accountId: customer.accountId,
            description: `AR payment - ${payment.paymentNumber}`,
            debit: 0,
            credit: payment.amount,
            currency: payment.currency,
            exchangeRate: payment.exchangeRate
          }
        ]
      }
    }
  })
  
  return entry
}

async function createSupplierInvoiceJournalEntry(
  invoice: any,
  accounts: Record<string, any>,
  userId: string
) {
  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber: `JE-${Date.now()}`,
      date: invoice.invoiceDate,
      description: `Supplier Invoice ${invoice.invoiceNumber}`,
      reference: invoice.invoiceNumber,
      currency: invoice.currency,
      exchangeRate: invoice.exchangeRate,
      status: JournalStatus.POSTED,
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      lines: {
        create: [
          {
            accountId: accounts['1200'].id,
            description: `Inventory - ${invoice.invoiceNumber}`,
            debit: invoice.subtotal,
            credit: 0,
            currency: invoice.currency,
            exchangeRate: invoice.exchangeRate
          },
          {
            accountId: accounts['2100'].id,
            description: `Input VAT - ${invoice.invoiceNumber}`,
            debit: invoice.taxAmount,
            credit: 0,
            currency: invoice.currency,
            exchangeRate: invoice.exchangeRate
          },
          {
            accountId: invoice.supplier.accountId,
            description: `AP - ${invoice.invoiceNumber}`,
            debit: 0,
            credit: invoice.total,
            currency: invoice.currency,
            exchangeRate: invoice.exchangeRate
          }
        ]
      }
    }
  })
  
  return entry
}

async function createSupplierPaymentJournalEntry(
  payment: any,
  supplier: any,
  accounts: Record<string, any>,
  userId: string
) {
  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber: `JE-${Date.now()}`,
      date: payment.paymentDate,
      description: `Supplier Payment ${payment.paymentNumber}`,
      reference: payment.paymentNumber,
      currency: payment.currency,
      exchangeRate: payment.exchangeRate,
      status: JournalStatus.POSTED,
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      lines: {
        create: [
          {
            accountId: supplier.accountId,
            description: `AP payment - ${payment.paymentNumber}`,
            debit: payment.amount,
            credit: 0,
            currency: payment.currency,
            exchangeRate: payment.exchangeRate
          },
          {
            accountId: accounts['1000'].id,
            description: `Cash payment - ${payment.paymentNumber}`,
            debit: 0,
            credit: payment.amount,
            currency: payment.currency,
            exchangeRate: payment.exchangeRate
          }
        ]
      }
    }
  })
  
  return entry
}

async function createStockMovement(data: {
  itemId: string
  locationId: string
  quantity: number
  type: MovementType
  referenceType: string
  referenceId: string
  cost: number
  userId: string
}) {
  // Get current balance
  const balance = await prisma.inventoryBalance.findUnique({
    where: {
      itemId_locationId: {
        itemId: data.itemId,
        locationId: data.locationId
      }
    }
  })
  
  const currentQuantity = balance?.quantity || 0
  const newQuantity = currentQuantity + data.quantity
  
  // Create movement
  await prisma.stockMovement.create({
    data: {
      ...data,
      balanceBefore: currentQuantity,
      balanceAfter: newQuantity,
      createdBy: data.userId
    }
  })
  
  // Update or create balance
  await prisma.inventoryBalance.upsert({
    where: {
      itemId_locationId: {
        itemId: data.itemId,
        locationId: data.locationId
      }
    },
    update: {
      quantity: newQuantity,
      availableQuantity: newQuantity,
      lastUpdated: new Date()
    },
    create: {
      itemId: data.itemId,
      locationId: data.locationId,
      quantity: newQuantity,
      reservedQuantity: 0,
      availableQuantity: newQuantity,
      lastUpdated: new Date()
    }
  })
}

// Execute seed
main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })