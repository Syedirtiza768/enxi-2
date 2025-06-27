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
  DATE_RANGE_MONTHS: parseInt(process.env.GENERATE_MONTHS || '24'),
  PROGRESS_UPDATE_INTERVAL: 10,
  TRANSACTION_TIMEOUT: 300000, // 5 minutes
  MEMORY_CLEANUP_INTERVAL: 500,
  ENABLE_MULTI_LOCATION: process.env.ENABLE_MULTI_LOCATION === 'true',
  ENABLE_STOCK_LOTS: process.env.ENABLE_STOCK_LOTS === 'true',
  ENABLE_CUSTOMER_PO: process.env.ENABLE_CUSTOMER_PO === 'true',
  ENABLE_SERVICE_DELIVERY: process.env.ENABLE_SERVICE_DELIVERY === 'true',
  ENABLE_TERRITORIES: process.env.ENABLE_TERRITORIES === 'true'
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
  { name: 'Abu Dhabi Ports Company', trn: '100000000000001', location: 'Abu Dhabi', industry: 'Ports & Maritime' },
  { name: 'DP World - Jebel Ali', trn: '100000000000002', location: 'Dubai', industry: 'Ports & Maritime' },
  { name: 'Sharjah Port Authority', trn: '100000000000003', location: 'Sharjah', industry: 'Ports & Maritime' },
  { name: 'Emirates Shipping Line', trn: '100000000000004', location: 'Dubai', industry: 'Shipping' },
  { name: 'Gulf Navigation Holding', trn: '100000000000005', location: 'Dubai', industry: 'Shipping' },
  { name: 'Al Marwan Shipping', trn: '100000000000006', location: 'Abu Dhabi', industry: 'Shipping' },
  { name: 'Dubai Maritime City Authority', trn: '100000000000007', location: 'Dubai', industry: 'Maritime Authority' },
  { name: 'RAK Ports', trn: '100000000000008', location: 'Ras Al Khaimah', industry: 'Ports & Maritime' },
  { name: 'Fujairah Port Authority', trn: '100000000000009', location: 'Fujairah', industry: 'Ports & Maritime' },
  { name: 'Abu Dhabi Marine Services', trn: '100000000000010', location: 'Abu Dhabi', industry: 'Marine Services' },
  { name: 'Al Seer Marine Supplies', trn: '100000000000011', location: 'Dubai', industry: 'Marine Supplies' },
  { name: 'Gulf Craft Shipyard', trn: '100000000000012', location: 'Umm Al Quwain', industry: 'Shipbuilding' },
  { name: 'Dubai Drydocks World', trn: '100000000000013', location: 'Dubai', industry: 'Ship Repair' },
  { name: 'Emirates Transport', trn: '100000000000014', location: 'Abu Dhabi', industry: 'Transportation' },
  { name: 'Halul Offshore Services', trn: '100000000000015', location: 'Dubai', industry: 'Offshore Services' }
]

const MARINE_ENGINE_SUPPLIERS = [
  { name: 'Caterpillar Marine - Middle East', brand: 'CAT', country: 'UAE', currency: 'AED', isPreferred: true },
  { name: 'Cummins Arabia FZE', brand: 'Cummins', country: 'UAE', currency: 'AED', isPreferred: true },
  { name: 'MAN Energy Solutions Gulf', brand: 'MAN', country: 'UAE', currency: 'EUR', isPreferred: false },
  { name: 'Wärtsilä Gulf FZE', brand: 'Wärtsilä', country: 'UAE', currency: 'EUR', isPreferred: true },
  { name: 'Volvo Penta Middle East', brand: 'Volvo Penta', country: 'UAE', currency: 'USD', isPreferred: false },
  { name: 'MTU Middle East FZE', brand: 'MTU', country: 'UAE', currency: 'EUR', isPreferred: false },
  { name: 'Yanmar Gulf FZE', brand: 'Yanmar', country: 'UAE', currency: 'AED', isPreferred: false },
  { name: 'Deutz Middle East', brand: 'Deutz', country: 'UAE', currency: 'EUR', isPreferred: false },
  { name: 'Perkins Arabia', brand: 'Perkins', country: 'UAE', currency: 'AED', isPreferred: false },
  { name: 'John Deere Marine Gulf', brand: 'John Deere', country: 'UAE', currency: 'USD', isPreferred: false }
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

const SERVICE_ITEMS = [
  { code: 'SVC-ENGINE-STD', name: 'Standard Engine Service', description: 'Standard marine engine service - hourly rate', price: 450 },
  { code: 'SVC-ENGINE-EMG', name: 'Emergency Engine Service', description: '24/7 emergency service - hourly rate', price: 750 },
  { code: 'SVC-OVERHAUL', name: 'Engine Overhaul Service', description: 'Complete engine overhaul - fixed price', price: 25000 },
  { code: 'SVC-DIAGNOSTICS', name: 'Engine Diagnostics', description: 'Computer diagnostics and analysis', price: 500 },
  { code: 'SVC-PREVENTIVE', name: 'Preventive Maintenance', description: 'Scheduled preventive maintenance', price: 2500 }
]

const SALES_TERRITORIES = [
  { name: 'Dubai & Northern Emirates', includes: ['Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah'] },
  { name: 'Abu Dhabi & Al Ain', includes: ['Abu Dhabi', 'Al Ain'] },
  { name: 'Eastern Region', includes: ['Fujairah', 'East Coast'] }
]

// Main seed function
async function main(): Promise<void> {
  console.log('🌱 Starting UAE Marine Engine Maintenance Company comprehensive enhanced seed...')
  console.log(`📅 Generating ${CONFIG.DATE_RANGE_MONTHS} months of historical data`)
  console.log(`🔧 Features enabled:`)
  console.log(`   - Multi-location: ${CONFIG.ENABLE_MULTI_LOCATION}`)
  console.log(`   - Stock lots: ${CONFIG.ENABLE_STOCK_LOTS}`)
  console.log(`   - Customer PO: ${CONFIG.ENABLE_CUSTOMER_PO}`)
  console.log(`   - Service delivery: ${CONFIG.ENABLE_SERVICE_DELIVERY}`)
  console.log(`   - Territories: ${CONFIG.ENABLE_TERRITORIES}`)
  
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
    const { customers, suppliers, categories, items, locations, unitsOfMeasure, leads } = await createMasterData(users.admin.id, accounts)
    
    // Phase 3: Transactional Data
    console.log('\n💼 Phase 3: Creating transactional data...')
    const { salesCases, quotations, salesOrders, purchaseOrders, customerPOs } = await createTransactionalData(
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
    const { goodsReceipts, shipments, stockLots, stockMovements } = await createOperationalData(
      users,
      salesOrders,
      purchaseOrders,
      items,
      locations,
      unitsOfMeasure,
      suppliers
    )
    
    // Summary
    console.log('\n📊 Seed Summary:')
    console.log(`   👥 Users: ${Object.keys(users).length}`)
    console.log(`   🏢 Customers: ${customers.length}`)
    console.log(`   🏭 Suppliers: ${suppliers.length}`)
    console.log(`   📦 Inventory Items: ${items.length}`)
    console.log(`   🏢 Locations: ${locations.length}`)
    if (CONFIG.ENABLE_STOCK_LOTS) {
      console.log(`   📦 Stock Lots: ${stockLots?.length || 0}`)
    }
    console.log(`   🎯 Leads: ${leads.length}`)
    console.log(`   💼 Sales Cases: ${salesCases.length}`)
    console.log(`   📄 Quotations: ${quotations.length}`)
    if (CONFIG.ENABLE_CUSTOMER_PO) {
      console.log(`   📋 Customer POs: ${customerPOs?.length || 0}`)
    }
    console.log(`   🛒 Sales Orders: ${salesOrders.length}`)
    console.log(`   📋 Purchase Orders: ${purchaseOrders.length}`)
    console.log(`   💳 Invoices: ${invoices.length}`)
    console.log(`   💸 Payments: ${payments.length}`)
    console.log(`   🚚 Shipments: ${shipments.length}`)
    console.log(`   📥 Goods Receipts: ${goodsReceipts.length}`)
    console.log(`   📊 Stock Movements: ${stockMovements?.length || 0}`)
    
    console.log('\n🎉 UAE Marine Engine Maintenance enhanced seed completed successfully!')
    
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
    'locationStockLot',
    'inventoryBalance',
    'stockMovement',
    'stockTransferItem',
    'stockTransfer',
    'stockLot',
    'shipmentItem',
    'shipment',
    'journalLine',
    'journalEntry',
    'payment',
    'invoiceItem',
    'invoice',
    'supplierPayment',
    'supplierInvoice',
    'goodsReceiptItem',
    'goodsReceipt',
    'purchaseOrderItem',
    'purchaseOrder',
    'caseExpense',
    'salesOrderItem',
    'salesOrder',
    'customerPO',
    'quotationItem',
    'quotation',
    'salesCase',
    'customer',
    'lead',
    'supplier',
    'item',
    'category',
    'location',
    'unitOfMeasure',
    'taxExemption',
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
  
  // Create sales team relationships with territories
  const salesTeamData = [
    {
      userId: salesManager.id,
      teamName: 'UAE Marine Sales',
      role: 'MANAGER',
      isActive: true,
      isTeamLead: true,
      territory: CONFIG.ENABLE_TERRITORIES ? 'All Emirates' : undefined,
      salesTarget: 5000000,
      commission: 2.5
    },
    {
      userId: salesRep1.id,
      teamName: 'UAE Marine Sales',
      role: 'MEMBER',
      managerId: salesManager.id,
      isActive: true,
      territory: CONFIG.ENABLE_TERRITORIES ? 'Dubai & Northern Emirates' : undefined,
      specialization: 'Key Accounts',
      salesTarget: 2000000,
      commission: 3
    },
    {
      userId: salesRep2.id,
      teamName: 'UAE Marine Sales',
      role: 'MEMBER',
      managerId: salesManager.id,
      isActive: true,
      territory: CONFIG.ENABLE_TERRITORIES ? 'Abu Dhabi & Al Ain' : undefined,
      specialization: 'New Business Development',
      salesTarget: 1500000,
      commission: 3.5
    }
  ]

  await Promise.all(
    salesTeamData.map(data =>
      prisma.salesTeamMember.create({
        data: {
          userId: data.userId,
          teamName: data.teamName,
          isTeamLead: data.isTeamLead || false,
          territory: data.territory,
          specialization: data.specialization,
          salesTarget: data.salesTarget,
          commission: data.commission
        }
      })
    )
  )
  
  console.log('   📊 Creating chart of accounts...')
  
  // Create Chart of Accounts
  const accounts: Record<string, any> = {}
  
  // Asset Accounts
  const assetAccounts = [
    { code: '1000', name: 'Cash - AED', currency: 'AED' },
    { code: '1001', name: 'Cash - USD', currency: 'USD' },
    { code: '1002', name: 'Cash - EUR', currency: 'EUR' },
    { code: '1100', name: 'Accounts Receivable', currency: 'AED' },
    { code: '1200', name: 'Inventory - Marine Parts', currency: 'AED' },
    { code: '1300', name: 'Prepaid Expenses', currency: 'AED' },
    { code: '1500', name: 'Property, Plant & Equipment', currency: 'AED' },
    { code: '1510', name: 'Workshop Equipment', currency: 'AED' },
    { code: '1520', name: 'Service Vehicles', currency: 'AED' }
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
    { code: '2210', name: 'Gratuity Payable', currency: 'AED' }, // UAE-specific
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
    { code: '4110', name: 'Service Revenue - Emergency', currency: 'AED' }, // Separate emergency service
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
    { code: '5110', name: 'Direct Labor Cost', currency: 'AED' }, // Separate direct labor
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
      taxRegistrationNumber: '100234567890123',
      defaultCurrency: 'AED',
      address: 'Jebel Ali Free Zone, Dubai, UAE',
      phone: '+971 4 123 4567',
      email: 'info@uaemarine.ae',
      website: 'www.uaemarine.ae',
      defaultOrderPaymentTerms: '30 days net',
      requireCustomerPO: CONFIG.ENABLE_CUSTOMER_PO,
      autoReserveInventory: true,
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
  
  // Create Suppliers with banking details
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
              currency: supplier.currency,
              paymentTerms: faker.helpers.arrayElement([30, 45, 60]),
              isPreferred: supplier.isPreferred,
              bankName: faker.helpers.arrayElement(['Emirates NBD', 'Abu Dhabi Commercial Bank', 'Dubai Islamic Bank']),
              bankAccount: `AE${faker.number.int({ min: 100000000000000, max: 999999999999999 })}`,
              createdBy: adminId,
              createdAt: getRandomDate(getDateMonthsAgo(CONFIG.DATE_RANGE_MONTHS), new Date()),
              account: {
                create: {
                  code: `2010-${String(index + 1).padStart(3, '0')}`,
                  name: `AP - ${supplier.name}`,
                  type: AccountType.LIABILITY,
                  currency: supplier.currency,
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
  
  // Add service category
  const serviceCategory = await prisma.category.create({
    data: {
      code: 'SERVICES',
      name: 'Marine Services',
      description: 'Marine engine maintenance and repair services',
      isActive: true,
      createdBy: adminId
    }
  })
  categories.push(serviceCategory)
  
  console.log('   📐 Creating units of measure...')
  
  // Create Units of Measure
  const unitsOfMeasure = await Promise.all([
    { code: 'PC', name: 'Piece', isBaseUnit: true },
    { code: 'SET', name: 'Set', isBaseUnit: false, conversionFactor: 1 },
    { code: 'BOX', name: 'Box', isBaseUnit: false, conversionFactor: 10 },
    { code: 'KG', name: 'Kilogram', isBaseUnit: true },
    { code: 'L', name: 'Liter', isBaseUnit: true },
    { code: 'HR', name: 'Hour', isBaseUnit: true } // For service items
  ].map(uom =>
    prisma.unitOfMeasure.create({
      data: {
        ...uom,
        createdBy: adminId
      }
    })
  ))
  
  console.log('   📦 Creating inventory items...')
  
  // Create Parts Items
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
        unitOfMeasureId: unitsOfMeasure.find(u => u.code === 'PC')!.id,
        standardCost: basePrice * 0.6,
        listPrice: basePrice,
        reorderPoint: faker.number.int({ min: 5, max: 20 }),
        minStockLevel: faker.number.int({ min: 5, max: 20 }),
        maxStockLevel: faker.number.int({ min: 50, max: 200 }),
        trackInventory: true,
        isActive: true,
        createdBy: adminId,
        inventoryAccountId: accounts['1200'].id,
        cogsAccountId: accounts['5000'].id,
        salesAccountId: accounts['4000'].id
      })
    }
  }
  
  // Add service items if enabled
  if (CONFIG.ENABLE_SERVICE_DELIVERY) {
    const hourUom = unitsOfMeasure.find(u => u.code === 'HR')!
    for (const service of SERVICE_ITEMS) {
      itemsData.push({
        code: service.code,
        name: service.name,
        description: service.description,
        type: 'SERVICE',
        categoryId: serviceCategory.id,
        unitOfMeasureId: hourUom.id,
        standardCost: 0,
        listPrice: service.price,
        trackInventory: false,
        isActive: true,
        createdBy: adminId,
        salesAccountId: service.code.includes('EMG') ? accounts['4110'].id : accounts['4100'].id
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
  const locationsData = [
    {
      code: 'MAIN-WH',
      name: 'Main Warehouse - Jebel Ali',
      type: 'WAREHOUSE',
      address: 'Jebel Ali Free Zone, Dubai, UAE',
      isActive: true,
      isDefault: true,
      maxCapacity: 10000
    }
  ]
  
  if (CONFIG.ENABLE_MULTI_LOCATION) {
    locationsData.push(
      {
        code: 'ABU-WH',
        name: 'Abu Dhabi Warehouse',
        type: 'WAREHOUSE',
        address: 'Mussafah Industrial Area, Abu Dhabi, UAE',
        isActive: true,
        isDefault: false,
        maxCapacity: 5000
      },
      {
        code: 'SVC-VAN-01',
        name: 'Mobile Service Van 01',
        type: 'VEHICLE',
        address: 'Mobile Unit',
        isActive: true,
        isDefault: false,
        maxCapacity: 100
      },
      {
        code: 'SVC-VAN-02',
        name: 'Mobile Service Van 02',
        type: 'VEHICLE',
        address: 'Mobile Unit',
        isActive: true,
        isDefault: false,
        maxCapacity: 100
      }
    )
  }
  
  const locations = await Promise.all(
    locationsData.map(loc =>
      prisma.location.create({
        data: {
          locationCode: loc.code,
          name: loc.name,
          type: loc.type,
          address: loc.address,
          isActive: loc.isActive,
          isDefault: loc.isDefault,
          maxCapacity: loc.maxCapacity,
          createdBy: adminId,
          inventoryAccountId: accounts['1200'].id
        }
      })
    )
  )
  
  console.log('   🎯 Creating leads...')
  
  // Create Leads with various sources
  const leadSources = [
    LeadSource.WEBSITE,
    LeadSource.REFERRAL,
    LeadSource.TRADE_SHOW,
    LeadSource.EMAIL_CAMPAIGN,
    LeadSource.PHONE_CALL
  ]
  
  const leadsData = UAE_MARINE_CUSTOMERS.map((customer, index) => ({
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: `contact${index + 1}@${customer.name.toLowerCase().replace(/\s+/g, '')}.ae`,
    phone: `+971 ${faker.helpers.arrayElement(['50', '52', '55', '56'])} ${faker.number.int({ min: 1000000, max: 9999999 })}`,
    company: customer.name,
    jobTitle: faker.helpers.arrayElement(['Procurement Manager', 'Operations Director', 'Fleet Manager', 'Technical Manager', 'Chief Engineer']),
    source: faker.helpers.arrayElement(leadSources),
    status: LeadStatus.NEW,
    notes: `Interested in marine engine spare parts and maintenance services. ${
      faker.helpers.arrayElement(['Met at Dubai Maritime Week', 'Referred by existing customer', 'Downloaded catalog from website'])
    }`,
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
  const customersData = leads.slice(0, 12).map((lead, index) => {
    const uaeCustomer = UAE_MARINE_CUSTOMERS[index]
    return {
      customerNumber: `CUST-${String(index + 1).padStart(5, '0')}`,
      name: lead.company!,
      email: lead.email,
      phone: lead.phone,
      industry: uaeCustomer.industry,
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
          
          // Extract the leadId and assignedToId to use in relations
          const { leadId, assignedToId, ...customerDataWithoutIds } = customer
          
          // Create customer with account
          return prisma.customer.create({
            data: {
              ...customerDataWithoutIds,
              lead: { connect: { id: leadId } },
              assignedTo: assignedToId ? { connect: { id: assignedToId } } : undefined,
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
      taxType: 'BOTH',
      categoryId: taxCategory.id,
      isDefault: true,
      isActive: true,
      createdBy: adminId,
      collectedAccountId: accounts['2100'].id,
      paidAccountId: accounts['2100'].id
    }
  })
  
  console.log('   ✅ Master data created')
  
  return { customers, suppliers, categories, items, locations, unitsOfMeasure, leads }
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
      
      // Assign based on territory if enabled
      let assignedTo = faker.helpers.arrayElement([users.salesRep1.id, users.salesRep2.id])
      if (CONFIG.ENABLE_TERRITORIES) {
        if (['Abu Dhabi', 'Al Ain'].includes(customer.address.split(', ')[1])) {
          assignedTo = users.salesRep2.id // Abu Dhabi territory
        } else {
          assignedTo = users.salesRep1.id // Dubai & Northern territory
        }
      }
      
      salesCasesData.push({
        caseNumber: `CASE-${new Date().getFullYear()}-${String(salesCasesData.length + 1).padStart(5, '0')}`,
        customerId: customer.id,
        title: faker.helpers.arrayElement([
          'Annual Maintenance Contract',
          'Engine Overhaul Project',
          'Spare Parts Supply Agreement',
          'Emergency Repair Services',
          'Preventive Maintenance Package',
          'Fleet Service Agreement'
        ]),
        description: `Marine engine maintenance and spare parts supply for ${customer.name}`,
        status: faker.helpers.weightedArrayElement([
          { value: SalesCaseStatus.OPEN, weight: 5 },
          { value: SalesCaseStatus.WON, weight: 4 },
          { value: SalesCaseStatus.LOST, weight: 1 }
        ]),
        estimatedValue,
        actualValue: 0,
        cost: 0,
        profitMargin: 0,
        createdBy: assignedTo,
        assignedTo,
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
  
  // Create Quotations with line headers
  const quotationsData: any[] = []
  let quotationNumber = 1
  
  for (const salesCase of salesCases.filter(sc => sc.status !== SalesCaseStatus.LOST)) {
    const numQuotations = faker.number.int({ min: 1, max: 3 })
    
    for (let i = 0; i < numQuotations; i++) {
      const createdAt = getRandomDate(salesCase.createdAt, new Date())
      const expiryDate = new Date(createdAt)
      expiryDate.setDate(expiryDate.getDate() + 30)
      
      // Create lines with headers
      const lines: any[] = []
      let lineNumber = 1
      
      // Add main items section
      lines.push({
        lineNumber: lineNumber++,
        isLineHeader: true,
        lineDescription: 'Marine Engine Spare Parts',
        itemCode: 'HEADER',
        description: 'Marine Engine Spare Parts',
        quantity: 0,
        unitPrice: 0,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
        lineTotal: 0
      })
      
      // Select random items for quotation
      const quotationItems = faker.helpers.arrayElements(
        items.filter(i => i.type === 'INVENTORY'),
        faker.number.int({ min: 3, max: 10 })
      )
      
      for (const item of quotationItems) {
        const quantity = faker.number.int({ min: 1, max: 20 })
        const unitPrice = item.listPrice * faker.number.float({ min: 0.9, max: 1.1 })
        const discountPercent = faker.helpers.weightedArrayElement([0, 5, 10].map((v, i) => ({ value: v, weight: [0.5, 0.3, 0.2][i] * 10 })))
        const discountAmount = (unitPrice * quantity * discountPercent) / 100
        const lineTotal = (unitPrice * quantity) - discountAmount
        const taxAmount = lineTotal * 0.05 // 5% VAT
        
        lines.push({
          lineNumber: lineNumber++,
          itemId: item.id,
          itemCode: item.code,
          description: item.description,
          quantity,
          unitPrice,
          discountPercent,
          discountAmount,
          taxPercent: 5,
          taxAmount,
          lineTotal: lineTotal + taxAmount
        })
      }
      
      // Add services if enabled
      if (CONFIG.ENABLE_SERVICE_DELIVERY && faker.datatype.boolean(0.6)) {
        lines.push({
          lineNumber: lineNumber++,
          isLineHeader: true,
          lineDescription: 'Professional Services',
          itemCode: 'HEADER',
          description: 'Professional Services',
          quantity: 0,
          unitPrice: 0,
          discountPercent: 0,
          discountAmount: 0,
          taxPercent: 0,
          taxAmount: 0,
          lineTotal: 0
        })
        
        const serviceItems = items.filter(i => i.type === 'SERVICE')
        const selectedServices = faker.helpers.arrayElements(serviceItems, faker.number.int({ min: 1, max: 3 }))
        
        for (const service of selectedServices) {
          const quantity = service.code.includes('OVERHAUL') ? 1 : faker.number.int({ min: 4, max: 16 })
          const unitPrice = service.listPrice
          const lineTotal = unitPrice * quantity
          const taxAmount = lineTotal * 0.05
          
          lines.push({
            lineNumber: lineNumber++,
            itemId: service.id,
            itemCode: service.code,
            description: service.description,
            quantity,
            unitPrice,
            discountPercent: 0,
            discountAmount: 0,
            taxPercent: 5,
            taxAmount,
            lineTotal: lineTotal + taxAmount
          })
        }
      }
      
      const subtotal = lines.filter(l => !l.isLineHeader).reduce((sum, line) => sum + (line.unitPrice * line.quantity), 0)
      const totalDiscount = lines.filter(l => !l.isLineHeader).reduce((sum, line) => sum + line.discountAmount, 0)
      const totalTax = lines.filter(l => !l.isLineHeader).reduce((sum, line) => sum + line.taxAmount, 0)
      const total = subtotal - totalDiscount + totalTax
      
      quotationsData.push({
        quotationNumber: `QUOT-${new Date().getFullYear()}-${String(quotationNumber++).padStart(4, '0')}`,
        salesCaseId: salesCase.id,
        version: i + 1,
        validUntil: expiryDate,
        paymentTerms: '30 days net',
        deliveryTerms: 'Ex-Works Dubai',
        notes: 'Prices are subject to availability. Delivery time: 2-4 weeks for spare parts.',
        internalNotes: 'Standard terms and conditions apply. All prices exclude VAT.',
        subtotal,
        discountAmount: 0,
        taxAmount: totalTax,
        totalAmount: total,
        status: faker.helpers.weightedArrayElement([
          { value: 'DRAFT', weight: 1 },
          { value: 'SENT', weight: 3 },
          { value: 'ACCEPTED', weight: 4 },
          { value: 'REJECTED', weight: 1 },
          { value: 'EXPIRED', weight: 1 }
        ]),
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
        batch.map(quot => {
          const { lines, ...quotationData } = quot
          return prisma.quotation.create({
            data: {
              ...quotationData,
              items: {
                create: lines.map((line: any) => ({
                  lineNumber: line.lineNumber,
                  lineDescription: line.lineDescription,
                  isLineHeader: line.isLineHeader || false,
                  itemId: line.itemId,
                  itemCode: line.itemCode,
                  description: line.description,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  discount: line.discountPercent,
                  discountAmount: line.discountAmount,
                  taxRate: line.taxPercent,
                  taxAmount: line.taxAmount,
                  subtotal: line.unitPrice * line.quantity,
                  totalAmount: line.lineTotal,
                  sortOrder: line.lineNumber
                }))
              }
            },
            include: { items: true }
          })
        })
      )
    },
    20,
    'Creating quotations'
  )
  
  // Create Customer POs if enabled
  const customerPOs: any[] = []
  if (CONFIG.ENABLE_CUSTOMER_PO) {
    console.log('   📋 Creating customer POs...')
    
    const acceptedQuotations = quotations.filter(q => q.status === 'ACCEPTED')
    const customerPOData = acceptedQuotations.map((quotation, index) => {
      const poDate = getRandomDate(quotation.createdAt, new Date())
      const salesCase = salesCases.find(sc => sc.id === quotation.salesCaseId)
      const customer = customers.find(c => c.id === salesCase?.customerId)
      
      return {
        poNumber: `PO-${customer?.name.substring(0, 3).toUpperCase()}-${faker.string.alphanumeric(6).toUpperCase()}`,
        customerId: customer?.id,
        quotationId: quotation.id,
        salesCaseId: quotation.salesCaseId,
        poDate,
        poAmount: quotation.totalAmount,
        currency: quotation.currency,
        exchangeRate: quotation.exchangeRate,
        isAccepted: true,
        acceptedAt: poDate,
        acceptedBy: users.salesManager.id,
        notes: `Customer PO for ${quotation.quotationNumber}`,
        createdBy: quotation.createdBy,
        createdAt: poDate
      }
    }).filter(po => po.customerId)
    
    const createdPOs = await processBatch(
      customerPOData,
      async (batch) => {
        return Promise.all(
          batch.map(po => prisma.customerPO.create({ data: po }))
        )
      },
      20,
      'Creating customer POs'
    )
    customerPOs.push(...createdPOs)
  }
  
  console.log('   🛒 Creating sales orders...')
  
  // Create Sales Orders from accepted quotations
  const acceptedQuotations = quotations.filter(q => q.status === 'ACCEPTED')
  const salesOrdersData = acceptedQuotations.map((quotation, index) => {
    const orderDate = getRandomDate(quotation.createdAt, new Date())
    const customerPO = customerPOs.find(po => po.quotationId === quotation.id)
    
    return {
      orderNumber: `SO-${new Date().getFullYear()}-${String(index + 1).padStart(5, '0')}`,
      quotationId: quotation.id,
      salesCaseId: quotation.salesCaseId,
      orderDate,
      requestedDate: new Date(orderDate.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days later
      paymentTerms: quotation.paymentTerms,
      shippingTerms: quotation.deliveryTerms,
      customerPO: customerPO?.poNumber || `PO-${faker.string.alphanumeric(8).toUpperCase()}`,
      subtotal: quotation.subtotal,
      discountAmount: quotation.discountAmount,
      taxAmount: quotation.taxAmount,
      totalAmount: quotation.totalAmount,
      status: faker.helpers.weightedArrayElement([
        { value: 'DRAFT', weight: 0.5 },
        { value: 'CONFIRMED', weight: 2 },
        { value: 'IN_PROGRESS', weight: 3 },
        { value: 'COMPLETED', weight: 4 },
        { value: 'CANCELLED', weight: 0.5 }
      ]),
      approvedBy: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(faker.helpers.arrayElement(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'])) 
        ? users.salesManager.id 
        : null,
      approvedAt: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(faker.helpers.arrayElement(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED']))
        ? new Date(orderDate.getTime() + 2 * 60 * 60 * 1000) // 2 hours after creation
        : null,
      createdBy: quotation.createdBy,
      createdAt: orderDate,
      customerPOId: customerPO?.id
    }
  })
  
  const salesOrders = await processBatch(
    salesOrdersData,
    async (batch) => {
      return Promise.all(
        batch.map(async (so) => {
          const quotation = acceptedQuotations.find(q => q.id === so.quotationId)
          if (!quotation) return null
          
          const { customerPOId, ...orderData } = so
          
          const order = await prisma.salesOrder.create({
            data: {
              ...orderData,
              items: {
                create: quotation.items.map((item: any) => ({
                  lineNumber: item.lineNumber,
                  lineDescription: item.lineDescription,
                  isLineHeader: item.isLineHeader || false,
                  itemId: item.itemId,
                  itemCode: item.itemCode,
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  discount: item.discount,
                  discountAmount: item.discountAmount,
                  taxRate: item.taxRate,
                  taxAmount: item.taxAmount,
                  subtotal: item.subtotal,
                  totalAmount: item.totalAmount,
                  sortOrder: item.sortOrder
                }))
              }
            },
            include: { items: true }
          })
          
          // Update customer PO with sales order ID if enabled
          if (CONFIG.ENABLE_CUSTOMER_PO && customerPOId) {
            await prisma.customerPO.update({
              where: { id: customerPOId },
              data: { salesOrderId: order.id }
            })
          }
          
          // Update sales case actual value
          await prisma.salesCase.update({
            where: { id: so.salesCaseId },
            data: {
              actualValue: { increment: so.totalAmount }
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
  const itemsBySupplier = items.filter(i => i.type === 'INVENTORY').reduce((acc, item) => {
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
        const unitPrice = item.standardCost || (item.listPrice * 0.6)
        const lineTotal = unitPrice * quantity
        const taxAmount = lineTotal * 0.05
        
        return {
          lineNumber: lineIndex + 1,
          itemId: item.id,
          itemCode: item.code,
          description: item.description,
          quantity,
          unitPrice,
          taxRate: 5,
          taxAmount,
          subtotal: lineTotal,
          totalAmount: lineTotal + taxAmount,
          sortOrder: lineIndex + 1
        }
      })
      
      const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0)
      const totalTax = lines.reduce((sum, line) => sum + line.taxAmount, 0)
      const total = subtotal + totalTax
      
      const isApproved = faker.datatype.boolean(0.8)
      
      purchaseOrdersData.push({
        poNumber: `PO-${new Date().getFullYear()}-${String(poNumber++).padStart(5, '0')}`,
        supplierId,
        orderDate,
        expectedDate: new Date(orderDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days later
        currency: supplier.currency,
        exchangeRate: supplier.currency === 'AED' ? 1 : faker.number.float({ min: 3.5, max: 4.2 }),
        paymentTerms: `${supplier.paymentTerms} days`,
        deliveryTerms: 'FOB Origin',
        subtotal,
        taxAmount: totalTax,
        totalAmount: total,
        status: faker.helpers.weightedArrayElement([
          { value: 'DRAFT', weight: 0.5 },
          { value: 'SENT', weight: 1 },
          { value: 'CONFIRMED', weight: 2 },
          { value: 'PARTIAL', weight: 2 },
          { value: 'RECEIVED', weight: 4 },
          { value: 'CANCELLED', weight: 0.5 }
        ]),
        approvedBy: isApproved ? users.admin.id : null,
        approvedAt: isApproved ? new Date(orderDate.getTime() + 4 * 60 * 60 * 1000) : null,
        sentToSupplier: ['SENT', 'CONFIRMED', 'PARTIAL', 'RECEIVED'].includes(faker.helpers.arrayElement(['SENT', 'CONFIRMED', 'PARTIAL', 'RECEIVED'])),
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
              items: {
                create: po.lines
              }
            },
            include: { items: true }
          })
        )
      )
    },
    20,
    'Creating purchase orders'
  )
  
  console.log('   ✅ Transactional data created')
  
  return { salesCases, quotations, salesOrders, purchaseOrders, customerPOs }
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
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      taxAmount: order.taxAmount,
      totalAmount: order.totalAmount,
      balanceAmount: order.totalAmount,
      status: faker.helpers.weightedArrayElement([
        { value: 'DRAFT', weight: 0.5 },
        { value: 'SENT', weight: 1 },
        { value: 'PARTIAL', weight: 2 },
        { value: 'PAID', weight: 5 },
        { value: 'OVERDUE', weight: 1.5 }
      ]),
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
              items: {
                create: order.items
                  .filter((item: any) => !item.isLineHeader)
                  .map((item: any) => ({
                    itemId: item.itemId,
                    itemCode: item.itemCode,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discount: item.discount,
                    discountAmount: item.discountAmount,
                    taxRate: item.taxRate,
                    taxAmount: item.taxAmount,
                    subtotal: item.subtotal,
                    totalAmount: item.totalAmount
                  }))
              }
            },
            include: { items: true, customer: true }
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
    let remainingAmount = invoice.totalAmount
    
    for (let i = 0; i < numPayments; i++) {
      const paymentDate = getRandomDate(invoice.invoiceDate, new Date())
      const amount = i === numPayments - 1 
        ? remainingAmount 
        : faker.number.float({ min: remainingAmount * 0.3, max: remainingAmount * 0.7 })
      
      const payment = await prisma.payment.create({
        data: {
          paymentNumber: `PMT-${new Date().getFullYear()}-${String(payments.length + 1).padStart(5, '0')}`,
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          paymentDate,
          amount,
          paymentMethod: faker.helpers.arrayElement(['BANK_TRANSFER', 'CHEQUE', 'CASH']),
          reference: `${faker.string.alphanumeric(8).toUpperCase()}`,
          notes: `Payment for ${invoice.invoiceNumber}`,
          createdBy: users.accountant.id,
          createdAt: paymentDate
        }
      })
      
      // Update invoice balance
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { 
          balanceAmount: { decrement: amount },
          paidAmount: { increment: amount }
        }
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
      exchangeRate: po.exchangeRate || 1,
      subtotal: po.subtotal,
      taxAmount: po.taxAmount,
      totalAmount: po.totalAmount,
      paidAmount: 0,
      status: faker.helpers.weightedArrayElement([
        { value: 'DRAFT', weight: 0.5 },
        { value: 'RECEIVED', weight: 1 },
        { value: 'APPROVED', weight: 2 },
        { value: 'PARTIAL', weight: 2 },
        { value: 'PAID', weight: 4.5 }
      ]),
      matchingStatus: faker.helpers.arrayElement(['MATCHED', 'PARTIAL', 'UNMATCHED']),
      approvedBy: faker.datatype.boolean(0.8) ? users.accountant.id : null,
      approvedAt: faker.datatype.boolean(0.8) ? new Date() : null,
      createdBy: users.accountant.id,
      createdAt: invoiceDate
    }
  })
  
  const supplierInvoices = await processBatch(
    supplierInvoicesData,
    async (batch) => {
      return Promise.all(
        batch.map(async (si) => {
          const invoice = await prisma.supplierInvoice.create({
            data: si,
            include: { supplier: true }
          })
          
          // Create journal entry with multi-currency support
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
        supplierInvoiceId: invoice.id,
        paymentDate,
        amount: invoice.totalAmount,
        currency: invoice.currency,
        exchangeRate: invoice.exchangeRate || 1,
        baseAmount: invoice.totalAmount * (invoice.exchangeRate || 1),
        paymentMethod: 'BANK_TRANSFER',
        reference: `TT-${faker.string.alphanumeric(8).toUpperCase()}`,
        status: 'COMPLETED',
        createdBy: users.accountant.id,
        createdAt: paymentDate
      }
    })
    
    // Update supplier invoice
    await prisma.supplierInvoice.update({
      where: { id: invoice.id },
      data: { 
        paidAmount: invoice.totalAmount,
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
  unitsOfMeasure: any[],
  suppliers: any[]
) {
  console.log('   📦 Creating goods receipts...')
  
  // Create Goods Receipts for received POs
  const receivedPOs = purchaseOrders.filter(po => 
    ['RECEIVED', 'PARTIAL'].includes(po.status)
  )
  
  const goodsReceipts: any[] = []
  const stockLots: any[] = []
  const stockMovements: any[] = []
  
  for (const po of receivedPOs) {
    const receiptDate = getRandomDate(po.orderDate, new Date())
    
    const receipt = await prisma.goodsReceipt.create({
      data: {
        receiptNumber: `GRN-${new Date().getFullYear()}-${String(goodsReceipts.length + 1).padStart(5, '0')}`,
        purchaseOrderId: po.id,
        receiptDate,
        status: po.status === 'RECEIVED' ? 'COMPLETED' : 'PARTIAL',
        notes: `Received from ${po.supplierId}`,
        receivedBy: users.warehouseManager.id,
        createdBy: users.warehouseManager.id,
        createdAt: receiptDate,
        items: {
          create: po.items.map((line: any) => ({
            purchaseOrderItemId: line.id,
            itemId: line.itemId,
            itemCode: line.itemCode,
            description: line.description,
            quantityOrdered: line.quantity,
            quantityReceived: po.status === 'RECEIVED' 
              ? line.quantity 
              : Math.floor(line.quantity * faker.number.float({ min: 0.5, max: 0.8 })),
            unitCost: line.unitPrice
          }))
        }
      },
      include: { items: true }
    })
    
    // Create stock lots if enabled
    if (CONFIG.ENABLE_STOCK_LOTS) {
      for (const receiptItem of receipt.items) {
        const supplier = suppliers.find(s => s.id === po.supplierId)
        
        const stockLot = await prisma.stockLot.create({
          data: {
            lotNumber: `LOT-${new Date().getFullYear()}-${String(stockLots.length + 1).padStart(6, '0')}`,
            itemId: receiptItem.itemId,
            receivedDate: receiptDate,
            supplierName: supplier?.name,
            supplierId: po.supplierId,
            purchaseRef: po.poNumber,
            receivedQty: receiptItem.quantityReceived,
            availableQty: receiptItem.quantityReceived,
            unitCost: receiptItem.unitCost,
            totalCost: receiptItem.unitCost * receiptItem.quantityReceived,
            createdBy: users.warehouseManager.id
          }
        })
        stockLots.push(stockLot)
        
        // Create location stock lot record
        const defaultLocation = locations.find(l => l.isDefault) || locations[0]
        await prisma.locationStockLot.create({
          data: {
            locationId: defaultLocation.id,
            stockLotId: stockLot.id,
            availableQty: receiptItem.quantityReceived
          }
        })
      }
    }
    
    // Create stock movements
    for (const line of receipt.items) {
      const defaultLocation = locations.find(l => l.isDefault) || locations[0]
      const movement = await createStockMovement({
        itemId: line.itemId,
        locationId: defaultLocation.id,
        quantity: line.quantityReceived,
        type: MovementType.STOCK_IN,
        referenceType: 'GOODS_RECEIPT',
        referenceId: receipt.id,
        referenceNumber: receipt.receiptNumber,
        cost: line.unitCost * line.quantityReceived,
        unitCost: line.unitCost,
        stockLotId: CONFIG.ENABLE_STOCK_LOTS ? stockLots[stockLots.length - 1]?.id : undefined,
        userId: users.warehouseManager.id,
        date: receiptDate
      })
      stockMovements.push(movement)
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
    // Get the customer from the order's salesCase relation
    const orderWithSalesCase = await prisma.salesOrder.findUnique({
      where: { id: order.id },
      include: { 
        salesCase: {
          include: {
            customer: true
          }
        }
      }
    })
    const customer = orderWithSalesCase?.salesCase?.customer
    
    // Check if this order contains services
    const hasServices = order.items.some((item: any) => {
      const itemData = items.find(i => i.id === item.itemId)
      return itemData?.type === 'SERVICE'
    })
    
    const shipment = await prisma.shipment.create({
      data: {
        shipmentNumber: `SHP-${new Date().getFullYear()}-${String(shipments.length + 1).padStart(5, '0')}`,
        salesOrderId: order.id,
        shipmentDate,
        carrier: hasServices && CONFIG.ENABLE_SERVICE_DELIVERY 
          ? 'Service Team' 
          : faker.helpers.arrayElement(['DHL', 'FedEx', 'Aramex', 'Emirates Post']),
        trackingNumber: hasServices && CONFIG.ENABLE_SERVICE_DELIVERY
          ? `SVC-${faker.string.alphanumeric(8).toUpperCase()}`
          : faker.string.alphanumeric(12).toUpperCase(),
        status: faker.helpers.weightedArrayElement([
          { value: 'PENDING', weight: 1 },
          { value: 'PICKED', weight: 1 },
          { value: 'IN_TRANSIT', weight: 2 },
          { value: 'DELIVERED', weight: 6 }
        ]),
        shipToAddress: customer?.address || 'Customer Address',
        notes: hasServices ? `Service delivery for ${order.orderNumber}` : `Shipment for ${order.orderNumber}`,
        createdBy: users.warehouseManager.id,
        createdAt: shipmentDate,
        items: {
          create: order.items
            .filter((item: any) => !item.isLineHeader)
            .map((item: any) => ({
              salesOrderItemId: item.id,
              itemId: item.itemId,
              itemCode: item.itemCode,
              description: item.description,
              quantity: item.quantity,
              quantityShipped: item.quantity
            }))
        }
      },
      include: { items: true }
    })
    
    // Create stock movements for shipped inventory items
    if (['IN_TRANSIT', 'DELIVERED'].includes(shipment.status)) {
      for (const shipmentItem of shipment.items) {
        const itemData = items.find(i => i.id === shipmentItem.itemId)
        if (itemData?.type === 'INVENTORY') {
          // Use different locations based on configuration
          let locationId = locations[0].id
          if (CONFIG.ENABLE_MULTI_LOCATION) {
            // Ship from the location with most stock
            const balances = await prisma.inventoryBalance.findMany({
              where: { itemId: shipmentItem.itemId },
              orderBy: { availableQuantity: 'desc' }
            })
            if (balances.length > 0) {
              locationId = balances[0].locationId
            }
          }
          
          const movement = await createStockMovement({
            itemId: shipmentItem.itemId,
            locationId,
            quantity: -shipmentItem.quantity,
            type: MovementType.STOCK_OUT,
            referenceType: 'SHIPMENT',
            referenceId: shipment.id,
            referenceNumber: shipment.shipmentNumber,
            cost: 0,
            unitCost: 0,
            userId: users.warehouseManager.id,
            date: shipmentDate
          })
          stockMovements.push(movement)
        }
      }
    }
    
    shipments.push(shipment)
  }
  
  // Create opening stock movements
  console.log('   📊 Creating opening stock movements...')
  
  const openingStockDate = getDateMonthsAgo(CONFIG.DATE_RANGE_MONTHS)
  const inventoryItems = items.filter(i => i.type === 'INVENTORY')
  
  for (const item of inventoryItems.slice(0, 50)) { // Limit to first 50 items
    const quantity = faker.number.int({ min: 50, max: 200 })
    const unitCost = item.standardCost || (item.listPrice * 0.6)
    
    const movement = await createStockMovement({
      itemId: item.id,
      locationId: locations[0].id,
      quantity,
      type: MovementType.OPENING,
      referenceType: 'OPENING_BALANCE',
      referenceId: 'OPENING',
      referenceNumber: 'OPENING-BALANCE',
      cost: quantity * unitCost,
      unitCost,
      userId: users.admin.id,
      date: openingStockDate
    })
    stockMovements.push(movement)
  }
  
  console.log('   📊 Creating inventory balances...')
  
  // Calculate and create inventory balances
  const balanceMap = new Map<string, { quantity: number, totalCost: number }>()
  
  // Get all stock movements
  const movements = await prisma.stockMovement.findMany({
    include: { item: true }
  })
  
  // Calculate balances
  for (const movement of movements) {
    const key = `${movement.itemId}-${movement.locationId}`
    const current = balanceMap.get(key) || { quantity: 0, totalCost: 0 }
    current.quantity += movement.quantity
    current.totalCost += movement.totalCost || 0
    balanceMap.set(key, current)
  }
  
  // Create or update inventory balance records
  for (const [key, data] of balanceMap.entries()) {
    const [itemId, locationId] = key.split('-')
    
    if (data.quantity > 0) {
      const item = items.find(i => i.id === itemId)
      if (!item) continue
      
      const avgCost = data.totalCost / data.quantity
      
      await prisma.inventoryBalance.upsert({
        where: {
          locationId_itemId: { locationId, itemId }
        },
        update: {
          availableQuantity: data.quantity,
          totalQuantity: data.quantity,
          averageCost: avgCost,
          totalValue: data.quantity * avgCost,
          lastMovementDate: new Date()
        },
        create: {
          itemId,
          locationId,
          availableQuantity: data.quantity,
          totalQuantity: data.quantity,
          averageCost: avgCost,
          totalValue: data.quantity * avgCost,
          minStockLevel: item.reorderPoint,
          reorderPoint: item.reorderPoint,
          lastMovementDate: new Date()
        }
      })
    }
  }
  
  console.log('   ✅ Operational data created')
  
  return { goodsReceipts, shipments, stockLots, stockMovements }
}

// Helper functions for journal entries
async function createInvoiceJournalEntry(
  invoice: any,
  accounts: Record<string, any>,
  userId: string
) {
  const baseAmount = invoice.totalAmount
  
  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber: `JE-${Date.now()}`,
      date: invoice.invoiceDate,
      description: `Invoice ${invoice.invoiceNumber}`,
      reference: invoice.invoiceNumber,
      currency: 'AED',
      exchangeRate: 1,
      status: JournalStatus.POSTED,
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      lines: {
        create: [
          {
            accountId: invoice.customer.accountId,
            description: `AR - ${invoice.invoiceNumber}`,
            debitAmount: invoice.totalAmount,
            creditAmount: 0,
            currency: 'AED',
            exchangeRate: 1,
            baseDebitAmount: invoice.totalAmount,
            baseCreditAmount: 0
          },
          {
            accountId: accounts['4000'].id,
            description: `Sales - ${invoice.invoiceNumber}`,
            debitAmount: 0,
            creditAmount: invoice.subtotal - invoice.discountAmount,
            currency: 'AED',
            exchangeRate: 1,
            baseDebitAmount: 0,
            baseCreditAmount: invoice.subtotal - invoice.discountAmount
          },
          {
            accountId: accounts['2100'].id,
            description: `VAT - ${invoice.invoiceNumber}`,
            debitAmount: 0,
            creditAmount: invoice.taxAmount,
            currency: 'AED',
            exchangeRate: 1,
            baseDebitAmount: 0,
            baseCreditAmount: invoice.taxAmount
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
  const baseAmount = payment.amount
  const cashAccount = accounts['1000'] // Default to AED cash account
  
  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber: `JE-${Date.now()}`,
      date: payment.paymentDate,
      description: `Payment ${payment.paymentNumber}`,
      reference: payment.paymentNumber,
      currency: 'AED',
      exchangeRate: 1,
      status: JournalStatus.POSTED,
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      lines: {
        create: [
          {
            accountId: cashAccount.id,
            description: `Cash receipt - ${payment.paymentNumber}`,
            debitAmount: payment.amount,
            creditAmount: 0,
            currency: 'AED',
            exchangeRate: 1,
            baseDebitAmount: baseAmount,
            baseCreditAmount: 0
          },
          {
            accountId: customer.accountId,
            description: `AR payment - ${payment.paymentNumber}`,
            debitAmount: 0,
            creditAmount: payment.amount,
            currency: 'AED',
            exchangeRate: 1,
            baseDebitAmount: 0,
            baseCreditAmount: baseAmount
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
  const baseAmount = invoice.totalAmount
  
  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber: `JE-${Date.now()}`,
      date: invoice.invoiceDate,
      description: `Supplier Invoice ${invoice.invoiceNumber}`,
      reference: invoice.invoiceNumber,
      currency: 'AED',
      exchangeRate: 1,
      status: JournalStatus.POSTED,
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      lines: {
        create: [
          {
            accountId: accounts['1200'].id,
            description: `Inventory - ${invoice.invoiceNumber}`,
            debitAmount: invoice.subtotal,
            creditAmount: 0,
            currency: invoice.currency,
            exchangeRate: invoice.exchangeRate || 1,
            baseDebitAmount: invoice.subtotal * (invoice.exchangeRate || 1),
            baseCreditAmount: 0
          },
          {
            accountId: accounts['2100'].id,
            description: `Input VAT - ${invoice.invoiceNumber}`,
            debitAmount: invoice.taxAmount,
            creditAmount: 0,
            currency: invoice.currency,
            exchangeRate: invoice.exchangeRate || 1,
            baseDebitAmount: invoice.taxAmount * (invoice.exchangeRate || 1),
            baseCreditAmount: 0
          },
          {
            accountId: invoice.supplier.accountId,
            description: `AP - ${invoice.invoiceNumber}`,
            debitAmount: 0,
            creditAmount: invoice.totalAmount,
            currency: invoice.currency,
            exchangeRate: invoice.exchangeRate || 1,
            baseDebitAmount: 0,
            baseCreditAmount: baseAmount
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
  const cashAccount = payment.currency === 'USD' ? accounts['1001'] 
    : payment.currency === 'EUR' ? accounts['1002'] 
    : accounts['1000']
  
  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber: `JE-${Date.now()}`,
      date: payment.paymentDate,
      description: `Supplier Payment ${payment.paymentNumber}`,
      reference: payment.paymentNumber,
      currency: payment.currency,
      exchangeRate: payment.exchangeRate || 1,
      status: JournalStatus.POSTED,
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      lines: {
        create: [
          {
            accountId: supplier.accountId,
            description: `AP payment - ${payment.paymentNumber}`,
            debitAmount: payment.amount,
            creditAmount: 0,
            currency: payment.currency,
            exchangeRate: payment.exchangeRate || 1,
            baseDebitAmount: payment.baseAmount,
            baseCreditAmount: 0
          },
          {
            accountId: cashAccount.id,
            description: `Cash payment - ${payment.paymentNumber}`,
            debitAmount: 0,
            creditAmount: payment.amount,
            currency: payment.currency,
            exchangeRate: payment.exchangeRate || 1,
            baseDebitAmount: 0,
            baseCreditAmount: payment.baseAmount
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
  referenceNumber: string
  cost: number
  unitCost: number
  stockLotId?: string
  userId: string
  date: Date
}) {
  const movement = await prisma.stockMovement.create({
    data: {
      movementNumber: `MOV-${Date.now()}-${faker.string.alphanumeric(4).toUpperCase()}`,
      itemId: data.itemId,
      stockLotId: data.stockLotId,
      movementType: data.type,
      movementDate: data.date,
      quantity: data.quantity,
      unitCost: data.unitCost,
      totalCost: data.cost,
      unitOfMeasureId: (await prisma.item.findUnique({ where: { id: data.itemId } }))?.unitOfMeasureId || '',
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      referenceNumber: data.referenceNumber,
      locationId: data.locationId,
      createdBy: data.userId,
      createdAt: data.date
    }
  })
  
  return movement
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