import { 
  PrismaClient, 
  AccountType,
  AccountStatus, 
  Role,
  LeadStatus,
  LeadSource, 
  SalesCaseStatus, 
  QuotationStatus, 
  ItemType, 
  MovementType, 
  JournalStatus,
  SupplierInvoiceStatus,
  POStatus,
  ReceiptStatus,
  PaymentMethod,
  OrderStatus,
  InvoiceStatus,
  ShipmentStatus,
  TransferStatus,
  LocationType
} from '@prisma/client'
import bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

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
      console.warn(`   ⚠️  Retrying after error: ${error.message}`)
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
async function main() {
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
async function clearDatabase() {
  const tablesToClear = [
    'auditLog',
    'stockMovement',
    'stockLot',
    'stockTransferItem',
    'stockTransfer',
    'shipmentItem',
    'shipment',
    'payment',
    'invoiceItem',
    'invoice',
    'customerPO',
    'salesOrderItem',
    'salesOrder',
    'quotationItem',
    'quotation',
    'salesCaseExpense',
    'salesCase',
    'lead',
    'supplierPayment',
    'supplierInvoiceItem',
    'supplierInvoice',
    'goodsReceiptItem',
    'goodsReceipt',
    'purchaseOrderItem',
    'purchaseOrder',
    'inventoryBalance',
    'item',
    'category',
    'unitOfMeasure',
    'location',
    'customer',
    'supplier',
    'journalLine',
    'journalEntry',
    'account',
    'companySettings',
    'userPermission',
    'user'
  ]
  
  for (const table of tablesToClear) {
    try {
      await prisma[table].deleteMany({})
      console.log(`   ✅ Cleared ${table}`)
    } catch (error) {
      console.warn(`   ⚠️  Could not clear ${table}:`, error.message)
    }
  }
}

// Phase 1: Base Data
async function createBaseData() {
  const hashedPassword = await bcrypt.hash('Password123!', 10)
  
  // Create company settings
  const companySettings = await prisma.companySettings.create({
    data: {
      companyName: 'UAE Marine Engine Services LLC',
      tradeLicenseNumber: 'DED-2023-789456',
      taxRegistrationNumber: '100123456789012',
      logo: '/logo/uae-marine-logo.png',
      address: JSON.stringify({
        street: 'Plot 45, Dubai Maritime City',
        city: 'Dubai',
        state: 'Dubai',
        country: 'United Arab Emirates',
        postalCode: '12345'
      }),
      phone: '+971 4 123 4567',
      email: 'info@uaemarineservices.ae',
      website: 'https://www.uaemarineservices.ae',
      fiscalYearStart: '01-01',
      defaultCurrency: 'AED',
      dateFormat: 'DD/MM/YYYY',
      timeZone: 'Asia/Dubai'
    }
  })
  
  // Create users
  const users = {
    admin: await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@uaemarineservices.ae',
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
        isActive: true
      }
    }),
    manager: await prisma.user.create({
      data: {
        username: 'manager',
        email: 'manager@uaemarineservices.ae',
        password: hashedPassword,
        role: Role.MANAGER,
        isActive: true
      }
    }),
    warehouse: await prisma.user.create({
      data: {
        username: 'warehouse',
        email: 'warehouse@uaemarineservices.ae',
        password: hashedPassword,
        role: Role.USER,
        isActive: true
      }
    }),
    sales: await prisma.user.create({
      data: {
        username: 'sales_rep',
        email: 'sales@uaemarineservices.ae',
        password: hashedPassword,
        role: Role.USER,
        isActive: true
      }
    }),
    accountant: await prisma.user.create({
      data: {
        username: 'accountant',
        email: 'accounts@uaemarineservices.ae',
        password: hashedPassword,
        role: Role.USER,
        isActive: true
      }
    })
  }
  
  // Create chart of accounts
  const accounts = await createChartOfAccounts(users.admin.id)
  
  return { users, accounts }
}

// Create Chart of Accounts
async function createChartOfAccounts(userId: string) {
  const accountsData = [
    // Assets (1000-1999)
    { code: '1000', name: 'Cash on Hand', type: AccountType.ASSET, currency: 'AED' },
    { code: '1100', name: 'Bank - Emirates NBD', type: AccountType.ASSET, currency: 'AED' },
    { code: '1110', name: 'Bank - Abu Dhabi Commercial Bank', type: AccountType.ASSET, currency: 'AED' },
    { code: '1200', name: 'Accounts Receivable', type: AccountType.ASSET, currency: 'AED' },
    { code: '1300', name: 'Inventory - Spare Parts', type: AccountType.ASSET, currency: 'AED' },
    { code: '1400', name: 'Prepaid Expenses', type: AccountType.ASSET, currency: 'AED' },
    { code: '1500', name: 'Property, Plant & Equipment', type: AccountType.ASSET, currency: 'AED' },
    { code: '1510', name: 'Accumulated Depreciation', type: AccountType.ASSET, currency: 'AED' },
    
    // Liabilities (2000-2999)
    { code: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY, currency: 'AED' },
    { code: '2100', name: 'Accrued Expenses', type: AccountType.LIABILITY, currency: 'AED' },
    { code: '2200', name: 'VAT Payable', type: AccountType.LIABILITY, currency: 'AED' },
    { code: '2300', name: 'Salaries Payable', type: AccountType.LIABILITY, currency: 'AED' },
    { code: '2400', name: 'Customer Deposits', type: AccountType.LIABILITY, currency: 'AED' },
    
    // Equity (3000-3999)
    { code: '3000', name: 'Share Capital', type: AccountType.EQUITY, currency: 'AED' },
    { code: '3100', name: 'Retained Earnings', type: AccountType.EQUITY, currency: 'AED' },
    { code: '3200', name: 'Current Year Profit/Loss', type: AccountType.EQUITY, currency: 'AED' },
    
    // Revenue (4000-4999)
    { code: '4000', name: 'Sales - Spare Parts', type: AccountType.REVENUE, currency: 'AED' },
    { code: '4100', name: 'Service Revenue - Maintenance', type: AccountType.REVENUE, currency: 'AED' },
    { code: '4200', name: 'Service Revenue - Emergency Repairs', type: AccountType.REVENUE, currency: 'AED' },
    { code: '4900', name: 'Sales Discounts', type: AccountType.REVENUE, currency: 'AED' },
    
    // Expenses (5000-5999)
    { code: '5000', name: 'Cost of Goods Sold', type: AccountType.EXPENSE, currency: 'AED' },
    { code: '5100', name: 'Salaries & Wages', type: AccountType.EXPENSE, currency: 'AED' },
    { code: '5200', name: 'Rent Expense', type: AccountType.EXPENSE, currency: 'AED' },
    { code: '5300', name: 'Utilities Expense', type: AccountType.EXPENSE, currency: 'AED' },
    { code: '5400', name: 'Depreciation Expense', type: AccountType.EXPENSE, currency: 'AED' },
    { code: '5500', name: 'Insurance Expense', type: AccountType.EXPENSE, currency: 'AED' },
    { code: '5600', name: 'Marketing & Advertising', type: AccountType.EXPENSE, currency: 'AED' },
    { code: '5700', name: 'Office Supplies', type: AccountType.EXPENSE, currency: 'AED' },
    { code: '5800', name: 'Bank Charges', type: AccountType.EXPENSE, currency: 'AED' },
    { code: '5900', name: 'Miscellaneous Expense', type: AccountType.EXPENSE, currency: 'AED' }
  ]
  
  const accounts = {}
  for (const accountData of accountsData) {
    const account = await prisma.account.create({
      data: {
        ...accountData,
        status: AccountStatus.ACTIVE,
        description: `${accountData.name} account`,
        createdBy: userId
      }
    })
    accounts[accountData.code] = account
  }
  
  return accounts
}

// Phase 2: Master Data
async function createMasterData(adminId: string, accounts: any) {
  // Create customers
  const customers = await processBatch(
    UAE_MARINE_CUSTOMERS,
    async (batch) => {
      return Promise.all(
        batch.map(customerData => 
          prisma.customer.create({
            data: {
              name: customerData.name,
              code: `CUST-${customerData.trn.slice(-6)}`,
              email: `contact@${customerData.name.toLowerCase().replace(/\s+/g, '')}.ae`,
              phone: faker.phone.number('+971 # ### ####'),
              taxNumber: customerData.trn,
              address: JSON.stringify({
                street: faker.location.streetAddress(),
                city: customerData.location,
                state: customerData.location,
                country: 'United Arab Emirates',
                postalCode: faker.location.zipCode()
              }),
              isActive: true,
              creditLimit: faker.number.int({ min: 100000, max: 1000000 }),
              creditTerms: faker.helpers.arrayElement([30, 45, 60]),
              accountsReceivableId: accounts['1200'].id,
              createdBy: adminId
            }
          })
        )
      )
    },
    50,
    'Creating customers'
  )
  
  // Create suppliers
  const suppliers = await processBatch(
    MARINE_ENGINE_SUPPLIERS,
    async (batch) => {
      return Promise.all(
        batch.map(supplierData =>
          prisma.supplier.create({
            data: {
              name: supplierData.name,
              code: `SUPP-${supplierData.brand.toUpperCase().substring(0, 3)}-${faker.number.int({ min: 100, max: 999 })}`,
              contactPerson: faker.person.fullName(),
              email: `procurement@${supplierData.brand.toLowerCase().replace(/\s+/g, '')}.com`,
              phone: faker.phone.number('+971 # ### ####'),
              address: JSON.stringify({
                street: faker.location.streetAddress(),
                city: 'Dubai',
                state: 'Dubai',
                country: supplierData.country,
                postalCode: faker.location.zipCode()
              }),
              taxNumber: `TRN-${faker.number.int({ min: 100000000000000, max: 999999999999999 })}`,
              paymentTerms: faker.helpers.arrayElement([30, 45, 60]),
              currency: 'AED',
              bankAccount: faker.finance.accountNumber(),
              isActive: true,
              accountsPayableId: accounts['2000'].id,
              createdBy: adminId
            }
          })
        )
      )
    },
    50,
    'Creating suppliers'
  )
  
  // Create inventory categories
  const categories = await processBatch(
    MARINE_SPARE_PARTS_CATEGORIES,
    async (batch) => {
      return Promise.all(
        batch.map(categoryData =>
          prisma.category.create({
            data: {
              name: categoryData.name,
              code: categoryData.code,
              description: `Marine engine ${categoryData.name.toLowerCase()}`,
              isActive: true,
              createdBy: adminId
            }
          })
        )
      )
    },
    50,
    'Creating categories'
  )
  
  // Create units of measure
  const unitsOfMeasure = await Promise.all([
    prisma.unitOfMeasure.create({
      data: { code: 'PCS', name: 'Pieces', createdBy: adminId }
    }),
    prisma.unitOfMeasure.create({
      data: { code: 'SET', name: 'Set', createdBy: adminId }
    }),
    prisma.unitOfMeasure.create({
      data: { code: 'L', name: 'Liter', createdBy: adminId }
    }),
    prisma.unitOfMeasure.create({
      data: { code: 'KG', name: 'Kilogram', createdBy: adminId }
    }),
    prisma.unitOfMeasure.create({
      data: { code: 'M', name: 'Meter', createdBy: adminId }
    }),
    prisma.unitOfMeasure.create({
      data: { code: 'HR', name: 'Hour', createdBy: adminId }
    })
  ])
  
  // Create locations
  const locations = {
    mainWarehouse: await prisma.location.create({
      data: {
        locationName: 'Main Warehouse - Dubai',
        locationCode: 'WH-DXB-001',
        type: LocationType.WAREHOUSE,
        address: JSON.stringify({
          street: 'Warehouse District, Jebel Ali',
          city: 'Dubai',
          state: 'Dubai',
          country: 'UAE'
        }),
        isActive: true,
        createdBy: adminId
      }
    }),
    abuDhabiWarehouse: await prisma.location.create({
      data: {
        locationName: 'Abu Dhabi Warehouse',
        locationCode: 'WH-AUH-001',
        type: LocationType.WAREHOUSE,
        address: JSON.stringify({
          street: 'Mussafah Industrial Area',
          city: 'Abu Dhabi',
          state: 'Abu Dhabi',
          country: 'UAE'
        }),
        isActive: true,
        createdBy: adminId
      }
    }),
    sharjahWarehouse: await prisma.location.create({
      data: {
        locationName: 'Sharjah Service Center',
        locationCode: 'WH-SHJ-001',
        type: LocationType.WAREHOUSE,
        address: JSON.stringify({
          street: 'Industrial Area 12',
          city: 'Sharjah',
          state: 'Sharjah',
          country: 'UAE'
        }),
        isActive: true,
        createdBy: adminId
      }
    })
  }
  
  // Create inventory items
  const itemsToCreate = []
  for (const template of SPARE_PARTS_TEMPLATE) {
    for (const supplier of suppliers) {
      const brand = MARINE_ENGINE_SUPPLIERS.find(s => s.name === supplier.name)?.brand || 'Generic'
      const category = categories.find(c => c.code === template.category)
      
      itemsToCreate.push({
        name: `${template.name} - ${brand}`,
        itemCode: `${template.category}-${brand.toUpperCase().substring(0, 3)}-${faker.number.int({ min: 1000, max: 9999 })}`,
        description: `${brand} ${template.name} for marine engines`,
        type: ItemType.PRODUCT,
        categoryId: category?.id,
        unitOfMeasureId: unitsOfMeasure[0].id, // Pieces
        costPrice: faker.number.float({ min: template.minPrice * 0.6, max: template.maxPrice * 0.6, precision: 0.01 }),
        sellingPrice: faker.number.float({ min: template.minPrice, max: template.maxPrice, precision: 0.01 }),
        reorderLevel: faker.number.int({ min: 5, max: 20 }),
        reorderQuantity: faker.number.int({ min: 10, max: 50 }),
        supplierId: supplier.id,
        isActive: true,
        assetAccountId: accounts['1300'].id,
        revenueAccountId: accounts['4000'].id,
        createdBy: adminId
      })
    }
  }
  
  const items = await processBatch(
    itemsToCreate,
    async (batch) => {
      return Promise.all(
        batch.map(item => prisma.item.create({ data: item }))
      )
    },
    100,
    'Creating inventory items'
  )
  
  return { customers, suppliers, categories, items, locations, unitsOfMeasure }
}

// Phase 3: Transactional Data
async function createTransactionalData(
  users: any,
  customers: any[],
  suppliers: any[],
  items: any[]
) {
  const startDate = getDateMonthsAgo(CONFIG.DATE_RANGE_MONTHS)
  const endDate = new Date()
  
  // Generate leads with seasonal patterns
  const leadsData = []
  const totalLeads = 550
  
  for (let i = 0; i < totalLeads; i++) {
    const leadDate = getRandomDate(startDate, endDate)
    const month = leadDate.getMonth()
    
    // Higher lead generation in pre-summer months (March-May)
    const isHighSeason = month >= 2 && month <= 4
    const seasonalMultiplier = isHighSeason ? 1.5 : 1
    
    if (Math.random() < seasonalMultiplier * 0.7) {
      const leadSource = faker.helpers.weightedArrayElement([
        { value: LeadSource.WEBSITE, weight: 30 },
        { value: LeadSource.TRADE_SHOW, weight: 25 },
        { value: LeadSource.REFERRAL, weight: 20 },
        { value: LeadSource.COLD_CALL, weight: 15 },
        { value: LeadSource.EMAIL_CAMPAIGN, weight: 10 }
      ])
      
      // Determine status based on age
      const ageInDays = Math.floor((endDate.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24))
      let status: LeadStatus
      
      if (ageInDays < 7) {
        status = LeadStatus.NEW
      } else if (ageInDays < 30) {
        status = faker.helpers.weightedArrayElement([
          { value: LeadStatus.CONTACTED, weight: 40 },
          { value: LeadStatus.QUALIFIED, weight: 30 },
          { value: LeadStatus.NEW, weight: 30 }
        ])
      } else {
        status = faker.helpers.weightedArrayElement([
          { value: LeadStatus.QUALIFIED, weight: 35 },
          { value: LeadStatus.CONVERTED, weight: 25 },
          { value: LeadStatus.LOST, weight: 20 },
          { value: LeadStatus.CONTACTED, weight: 20 }
        ])
      }
      
      leadsData.push({
        companyName: faker.company.name() + ' Marine Services',
        contactName: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number('+971 # ### ####'),
        source: leadSource,
        status,
        description: faker.helpers.arrayElement([
          'Interested in annual maintenance contract',
          'Requires emergency engine repair',
          'Looking for spare parts supplier',
          'Need turbocharger overhaul service',
          'Inquiry about fuel system upgrades'
        ]),
        estimatedValue: faker.number.float({ min: 10000, max: 500000, precision: 1000 }),
        assignedToId: faker.helpers.arrayElement([users.sales.id, users.manager.id]),
        createdAt: leadDate,
        createdBy: users.sales.id
      })
    }
  }
  
  const leads = await processBatch(
    leadsData,
    async (batch) => {
      return Promise.all(
        batch.map(lead => prisma.lead.create({ data: lead }))
      )
    },
    100,
    'Creating leads'
  )
  
  // Create sales cases
  const salesCasesData = []
  const qualifiedLeads = leads.filter(l => l.status === LeadStatus.QUALIFIED)
  
  // Convert 60% of qualified leads to sales cases
  for (const lead of qualifiedLeads.slice(0, Math.floor(qualifiedLeads.length * 0.6))) {
    const customer = faker.helpers.arrayElement(customers)
    salesCasesData.push({
      title: `${customer.name} - ${lead.description}`,
      customerId: customer.id,
      leadId: lead.id,
      status: faker.helpers.weightedArrayElement([
        { value: SalesCaseStatus.OPEN, weight: 30 },
        { value: SalesCaseStatus.PROPOSAL, weight: 25 },
        { value: SalesCaseStatus.NEGOTIATION, weight: 20 },
        { value: SalesCaseStatus.WON, weight: 15 },
        { value: SalesCaseStatus.LOST, weight: 10 }
      ]),
      priority: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
      estimatedValue: lead.estimatedValue,
      probability: faker.number.int({ min: 10, max: 90 }),
      expectedCloseDate: faker.date.future({ years: 0.5, refDate: lead.createdAt }),
      assignedToId: lead.assignedToId,
      createdAt: faker.date.soon({ days: 7, refDate: lead.createdAt }),
      createdBy: lead.assignedToId
    })
  }
  
  // Add some direct sales cases without leads
  for (let i = 0; i < 60; i++) {
    const customer = faker.helpers.arrayElement(customers)
    const caseDate = getRandomDate(startDate, endDate)
    
    salesCasesData.push({
      title: `${customer.name} - ${faker.helpers.arrayElement(['Service Contract', 'Parts Order', 'Emergency Repair', 'Scheduled Maintenance'])}`,
      customerId: customer.id,
      status: faker.helpers.weightedArrayElement([
        { value: SalesCaseStatus.OPEN, weight: 20 },
        { value: SalesCaseStatus.PROPOSAL, weight: 20 },
        { value: SalesCaseStatus.NEGOTIATION, weight: 20 },
        { value: SalesCaseStatus.WON, weight: 30 },
        { value: SalesCaseStatus.LOST, weight: 10 }
      ]),
      priority: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
      estimatedValue: faker.number.float({ min: 15000, max: 750000, precision: 5000 }),
      probability: faker.number.int({ min: 20, max: 95 }),
      expectedCloseDate: faker.date.future({ years: 0.5, refDate: caseDate }),
      assignedToId: faker.helpers.arrayElement([users.sales.id, users.manager.id]),
      createdAt: caseDate,
      createdBy: users.sales.id
    })
  }
  
  const salesCases = await processBatch(
    salesCasesData,
    async (batch) => {
      return Promise.all(
        batch.map(sc => prisma.salesCase.create({ data: sc }))
      )
    },
    100,
    'Creating sales cases'
  )
  
  // Create quotations
  const quotationsData = []
  
  for (const salesCase of salesCases.filter(sc => 
    [SalesCaseStatus.PROPOSAL, SalesCaseStatus.NEGOTIATION, SalesCaseStatus.WON].includes(sc.status)
  )) {
    // Create 1-3 quotation versions
    const versionCount = faker.number.int({ min: 1, max: 3 })
    
    for (let version = 1; version <= versionCount; version++) {
      const quotationDate = faker.date.soon({ days: 14 * version, refDate: salesCase.createdAt })
      const validityDays = 30
      const validUntil = new Date(quotationDate)
      validUntil.setDate(validUntil.getDate() + validityDays)
      
      const quotationNumber = `QT-${quotationDate.getFullYear()}${(quotationDate.getMonth() + 1).toString().padStart(2, '0')}-${faker.number.int({ min: 1000, max: 9999 })}`
      
      let status: QuotationStatus
      if (version < versionCount) {
        status = QuotationStatus.SUPERSEDED
      } else if (salesCase.status === SalesCaseStatus.WON) {
        status = QuotationStatus.ACCEPTED
      } else if (validUntil < endDate) {
        status = QuotationStatus.EXPIRED
      } else {
        status = faker.helpers.weightedArrayElement([
          { value: QuotationStatus.DRAFT, weight: 30 },
          { value: QuotationStatus.SENT, weight: 50 },
          { value: QuotationStatus.REJECTED, weight: 20 }
        ])
      }
      
      quotationsData.push({
        quotationNumber,
        customerId: salesCase.customerId,
        salesCaseId: salesCase.id,
        version,
        status,
        quotationDate,
        validUntil,
        currency: 'AED',
        exchangeRate: 1,
        subtotal: 0, // Will update after items
        taxAmount: 0,
        totalAmount: 0,
        terms: 'Standard terms and conditions apply. Prices are subject to change without notice.',
        notes: faker.helpers.arrayElement([
          'Price includes delivery within UAE',
          'Installation charges extra',
          'Emergency service surcharge applicable',
          'Volume discount applied'
        ]),
        internalNotes: `Created from sales case: ${salesCase.title}`,
        createdBy: salesCase.assignedToId,
        createdAt: quotationDate
      })
    }
  }
  
  const quotations = await processBatch(
    quotationsData,
    async (batch) => {
      return Promise.all(
        batch.map(q => prisma.quotation.create({ data: q }))
      )
    },
    100,
    'Creating quotations'
  )
  
  // Create quotation items
  const quotationItemsData = []
  
  for (const quotation of quotations) {
    const itemCount = faker.number.int({ min: 3, max: 8 })
    const selectedItems = faker.helpers.arrayElements(items, itemCount)
    let subtotal = 0
    
    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i]
      const quantity = faker.number.int({ min: 1, max: 20 })
      const unitPrice = item.sellingPrice
      const discount = faker.number.float({ min: 0, max: 15, precision: 0.5 })
      const lineTotal = quantity * unitPrice * (1 - discount / 100)
      
      quotationItemsData.push({
        quotationId: quotation.id,
        itemId: item.id,
        itemCode: item.itemCode,
        description: item.description,
        quantity,
        unitPrice,
        discount,
        taxRate: 5, // UAE VAT
        taxAmount: lineTotal * 0.05,
        totalAmount: lineTotal * 1.05,
        sortOrder: i + 1,
        notes: faker.helpers.maybe(() => 
          faker.helpers.arrayElement(['Genuine OEM part', 'Express delivery available', 'In stock'])
        )
      })
      
      subtotal += lineTotal
    }
    
    // Update quotation totals
    const taxAmount = subtotal * 0.05
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        subtotal,
        taxAmount,
        totalAmount: subtotal + taxAmount
      }
    })
  }
  
  await processBatch(
    quotationItemsData,
    async (batch) => {
      return Promise.all(
        batch.map(item => prisma.quotationItem.create({ data: item }))
      )
    },
    200,
    'Creating quotation items'
  )
  
  // Create sales orders from accepted quotations
  const acceptedQuotations = quotations.filter(q => q.status === QuotationStatus.ACCEPTED)
  const salesOrdersData = []
  
  for (const quotation of acceptedQuotations) {
    const orderDate = faker.date.soon({ days: 7, refDate: quotation.quotationDate })
    const orderNumber = `SO-${orderDate.getFullYear()}${(orderDate.getMonth() + 1).toString().padStart(2, '0')}-${faker.number.int({ min: 1000, max: 9999 })}`
    
    // Determine status based on age
    const ageInDays = Math.floor((endDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
    let status: OrderStatus
    
    if (ageInDays < 7) {
      status = OrderStatus.PENDING
    } else if (ageInDays < 30) {
      status = faker.helpers.weightedArrayElement([
        { value: OrderStatus.CONFIRMED, weight: 50 },
        { value: OrderStatus.PROCESSING, weight: 50 }
      ])
    } else {
      status = faker.helpers.weightedArrayElement([
        { value: OrderStatus.DELIVERED, weight: 60 },
        { value: OrderStatus.PROCESSING, weight: 30 },
        { value: OrderStatus.CANCELLED, weight: 10 }
      ])
    }
    
    salesOrdersData.push({
      orderNumber,
      customerId: quotation.customerId,
      quotationId: quotation.id,
      salesCaseId: quotation.salesCaseId,
      status,
      orderDate,
      promisedDate: faker.date.soon({ days: 14, refDate: orderDate }),
      currency: quotation.currency,
      exchangeRate: quotation.exchangeRate,
      subtotal: quotation.subtotal,
      taxAmount: quotation.taxAmount,
      shippingAmount: faker.number.float({ min: 100, max: 500, precision: 50 }),
      totalAmount: quotation.totalAmount + faker.number.float({ min: 100, max: 500, precision: 50 }),
      billingAddress: JSON.stringify({
        street: faker.location.streetAddress(),
        city: faker.helpers.arrayElement(['Dubai', 'Abu Dhabi', 'Sharjah']),
        country: 'UAE'
      }),
      shippingAddress: JSON.stringify({
        street: faker.location.streetAddress(),
        city: faker.helpers.arrayElement(['Dubai', 'Abu Dhabi', 'Sharjah']),
        country: 'UAE'
      }),
      paymentTerms: faker.helpers.arrayElement(['Net 30', 'Net 45', 'Net 60']),
      shippingTerms: faker.helpers.arrayElement(['FOB', 'CIF', 'EXW']),
      notes: quotation.notes,
      internalNotes: `Converted from quotation ${quotation.quotationNumber}`,
      createdBy: quotation.createdBy,
      createdAt: orderDate
    })
  }
  
  const salesOrders = await processBatch(
    salesOrdersData,
    async (batch) => {
      return Promise.all(
        batch.map(so => prisma.salesOrder.create({ data: so }))
      )
    },
    100,
    'Creating sales orders'
  )
  
  // Create sales order items
  for (const order of salesOrders) {
    const quotationItems = await prisma.quotationItem.findMany({
      where: { quotationId: order.quotationId }
    })
    
    await processBatch(
      quotationItems,
      async (batch) => {
        return Promise.all(
          batch.map(qItem =>
            prisma.salesOrderItem.create({
              data: {
                salesOrderId: order.id,
                itemId: qItem.itemId,
                itemCode: qItem.itemCode,
                description: qItem.description,
                quantity: qItem.quantity,
                unitPrice: qItem.unitPrice,
                discount: qItem.discount,
                taxRate: qItem.taxRate,
                taxAmount: qItem.taxAmount,
                totalAmount: qItem.totalAmount,
                sortOrder: qItem.sortOrder
              }
            })
          )
        )
      },
      50,
      'Creating sales order items'
    )
  }
  
  // Create purchase orders
  const purchaseOrdersData = []
  const monthlyPOCount = Math.floor(200 / CONFIG.DATE_RANGE_MONTHS)
  
  for (let month = 0; month < CONFIG.DATE_RANGE_MONTHS; month++) {
    const monthStart = new Date(startDate)
    monthStart.setMonth(monthStart.getMonth() + month)
    
    for (let i = 0; i < monthlyPOCount; i++) {
      const poDate = getRandomDate(monthStart, new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0))
      const supplier = faker.helpers.arrayElement(suppliers)
      const poNumber = `PO-${poDate.getFullYear()}${(poDate.getMonth() + 1).toString().padStart(2, '0')}-${faker.number.int({ min: 1000, max: 9999 })}`
      
      // Determine if this is an expedited order
      const isExpedited = Math.random() < 0.15
      const deliveryDays = isExpedited ? faker.number.int({ min: 3, max: 7 }) : faker.number.int({ min: 14, max: 30 })
      
      purchaseOrdersData.push({
        poNumber,
        supplierId: supplier.id,
        status: POStatus.PENDING,
        orderDate: poDate,
        expectedDate: faker.date.soon({ days: deliveryDays, refDate: poDate }),
        currency: 'AED',
        exchangeRate: 1,
        subtotal: 0, // Will update after items
        taxAmount: 0,
        shippingAmount: faker.number.float({ min: 200, max: 1000, precision: 50 }),
        totalAmount: 0,
        paymentTerms: supplier.paymentTerms.toString() + ' days',
        deliveryTerms: faker.helpers.arrayElement(['DDP', 'DAP', 'FOB']),
        notes: isExpedited ? 'URGENT - Expedited delivery required' : undefined,
        internalNotes: `Regular replenishment order`,
        createdBy: users.manager.id,
        createdAt: poDate
      })
    }
  }
  
  const purchaseOrders = await processBatch(
    purchaseOrdersData,
    async (batch) => {
      return Promise.all(
        batch.map(po => prisma.purchaseOrder.create({ data: po }))
      )
    },
    100,
    'Creating purchase orders'
  )
  
  // Create purchase order items
  for (const po of purchaseOrders) {
    const supplier = await prisma.supplier.findUnique({ where: { id: po.supplierId } })
    const supplierItems = items.filter(item => item.supplierId === po.supplierId)
    const selectedItems = faker.helpers.arrayElements(supplierItems, faker.number.int({ min: 3, max: 8 }))
    
    let subtotal = 0
    
    await processBatch(
      selectedItems,
      async (batch) => {
        return Promise.all(
          batch.map((item, index) => {
            const quantity = faker.number.int({ min: 10, max: 100 })
            const unitPrice = item.costPrice
            const lineTotal = quantity * unitPrice
            subtotal += lineTotal
            
            return prisma.purchaseOrderItem.create({
              data: {
                purchaseOrderId: po.id,
                itemId: item.id,
                itemCode: item.itemCode,
                description: item.description,
                quantity,
                unitPrice,
                totalAmount: lineTotal,
                sortOrder: index + 1
              }
            })
          })
        )
      },
      50,
      'Creating purchase order items'
    )
    
    // Update PO totals
    const taxAmount = subtotal * 0.05
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: {
        subtotal,
        taxAmount,
        totalAmount: subtotal + taxAmount + po.shippingAmount
      }
    })
  }
  
  return { leads, salesCases, quotations, salesOrders, purchaseOrders }
}

// Phase 4: Financial Data
async function createFinancialData(
  users: any,
  salesOrders: any[],
  purchaseOrders: any[],
  customers: any[],
  suppliers: any[],
  accounts: any
) {
  // Create invoices from delivered/processing sales orders
  const invoiceableOrders = salesOrders.filter(so => 
    [OrderStatus.PROCESSING, OrderStatus.DELIVERED].includes(so.status)
  )
  
  const invoicesData = []
  
  for (const order of invoiceableOrders) {
    const invoiceDate = faker.date.soon({ days: 3, refDate: order.orderDate })
    const invoiceNumber = `INV-${invoiceDate.getFullYear()}${(invoiceDate.getMonth() + 1).toString().padStart(2, '0')}-${faker.number.int({ min: 1000, max: 9999 })}`
    
    // Determine payment terms and due date
    const paymentTermsDays = parseInt(order.paymentTerms.replace(/\D/g, '')) || 30
    const dueDate = new Date(invoiceDate)
    dueDate.setDate(dueDate.getDate() + paymentTermsDays)
    
    // Determine status based on current date
    let status: InvoiceStatus
    const now = new Date()
    
    if (dueDate < now && Math.random() < 0.7) {
      status = InvoiceStatus.PAID
    } else if (dueDate < now) {
      status = InvoiceStatus.OVERDUE
    } else {
      status = faker.helpers.weightedArrayElement([
        { value: InvoiceStatus.PENDING, weight: 40 },
        { value: InvoiceStatus.PARTIAL_PAID, weight: 20 },
        { value: InvoiceStatus.PAID, weight: 40 }
      ])
    }
    
    invoicesData.push({
      invoiceNumber,
      customerId: order.customerId,
      salesOrderId: order.id,
      status,
      invoiceDate,
      dueDate,
      currency: order.currency,
      exchangeRate: order.exchangeRate,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      shippingAmount: order.shippingAmount,
      totalAmount: order.totalAmount,
      paidAmount: 0, // Will update based on payments
      balanceAmount: order.totalAmount,
      paymentTerms: order.paymentTerms,
      notes: order.notes,
      billingAddress: order.billingAddress,
      shippingAddress: order.shippingAddress,
      createdBy: users.accountant.id,
      createdAt: invoiceDate
    })
  }
  
  const invoices = await processBatch(
    invoicesData,
    async (batch) => {
      return Promise.all(
        batch.map(inv => prisma.invoice.create({ data: inv }))
      )
    },
    100,
    'Creating invoices'
  )
  
  // Create invoice items
  for (const invoice of invoices) {
    const orderItems = await prisma.salesOrderItem.findMany({
      where: { salesOrderId: invoice.salesOrderId }
    })
    
    await processBatch(
      orderItems,
      async (batch) => {
        return Promise.all(
          batch.map(orderItem =>
            prisma.invoiceItem.create({
              data: {
                invoiceId: invoice.id,
                itemId: orderItem.itemId,
                itemCode: orderItem.itemCode,
                description: orderItem.description,
                quantity: orderItem.quantity,
                unitPrice: orderItem.unitPrice,
                discount: orderItem.discount,
                taxRate: orderItem.taxRate,
                taxAmount: orderItem.taxAmount,
                totalAmount: orderItem.totalAmount,
                accountId: accounts['4000'].id, // Sales revenue account
                sortOrder: orderItem.sortOrder
              }
            })
          )
        )
      },
      50,
      'Creating invoice items'
    )
  }
  
  // Create customer payments
  const paymentsData = []
  const paidInvoices = invoices.filter(inv => 
    [InvoiceStatus.PAID, InvoiceStatus.PARTIAL_PAID].includes(inv.status)
  )
  
  for (const invoice of paidInvoices) {
    const customer = customers.find(c => c.id === invoice.customerId)
    const isPartialPayment = invoice.status === InvoiceStatus.PARTIAL_PAID || Math.random() < 0.15
    
    if (isPartialPayment) {
      // Create 2-3 partial payments
      const paymentCount = faker.number.int({ min: 2, max: 3 })
      let remainingAmount = invoice.totalAmount
      
      for (let i = 0; i < paymentCount; i++) {
        const paymentDate = faker.date.between({ 
          from: invoice.invoiceDate, 
          to: i === paymentCount - 1 ? new Date() : invoice.dueDate 
        })
        
        const paymentAmount = i === paymentCount - 1 
          ? remainingAmount 
          : faker.number.float({ min: remainingAmount * 0.3, max: remainingAmount * 0.6, precision: 0.01 })
        
        remainingAmount -= paymentAmount
        
        paymentsData.push({
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          paymentDate,
          amount: paymentAmount,
          currency: invoice.currency,
          exchangeRate: invoice.exchangeRate,
          baseAmount: paymentAmount,
          paymentMethod: faker.helpers.weightedArrayElement([
            { value: PaymentMethod.BANK_TRANSFER, weight: 70 },
            { value: PaymentMethod.CHECK, weight: 20 },
            { value: PaymentMethod.CASH, weight: 10 }
          ]),
          referenceNumber: `PAY-${paymentDate.getFullYear()}${faker.number.int({ min: 10000, max: 99999 })}`,
          bankAccount: faker.helpers.arrayElement(['Emirates NBD - 1234567890', 'ADCB - 0987654321']),
          notes: `Payment for invoice ${invoice.invoiceNumber}`,
          reconciledDate: faker.date.soon({ days: 3, refDate: paymentDate }),
          bankAccountId: accounts['1100'].id,
          accountsReceivableId: accounts['1200'].id,
          createdBy: users.accountant.id,
          createdAt: paymentDate
        })
      }
    } else {
      // Full payment
      const paymentDate = faker.date.between({ from: invoice.invoiceDate, to: invoice.dueDate })
      
      paymentsData.push({
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        paymentDate,
        amount: invoice.totalAmount,
        currency: invoice.currency,
        exchangeRate: invoice.exchangeRate,
        baseAmount: invoice.totalAmount,
        paymentMethod: faker.helpers.weightedArrayElement([
          { value: PaymentMethod.BANK_TRANSFER, weight: 80 },
          { value: PaymentMethod.CHECK, weight: 20 }
        ]),
        referenceNumber: `PAY-${paymentDate.getFullYear()}${faker.number.int({ min: 10000, max: 99999 })}`,
        bankAccount: faker.helpers.arrayElement(['Emirates NBD - 1234567890', 'ADCB - 0987654321']),
        notes: `Full payment for invoice ${invoice.invoiceNumber}`,
        reconciledDate: faker.date.soon({ days: 3, refDate: paymentDate }),
        bankAccountId: accounts['1100'].id,
        accountsReceivableId: accounts['1200'].id,
        createdBy: users.accountant.id,
        createdAt: paymentDate
      })
    }
  }
  
  const payments = await processBatch(
    paymentsData,
    async (batch) => {
      return Promise.all(
        batch.map(payment => prisma.payment.create({ data: payment }))
      )
    },
    100,
    'Creating customer payments'
  )
  
  // Update invoice paid amounts
  for (const invoice of invoices) {
    const invoicePayments = payments.filter(p => p.invoiceId === invoice.id)
    const paidAmount = invoicePayments.reduce((sum, p) => sum + p.amount, 0)
    const balanceAmount = invoice.totalAmount - paidAmount
    
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount,
        balanceAmount,
        status: balanceAmount === 0 
          ? InvoiceStatus.PAID 
          : balanceAmount < invoice.totalAmount 
            ? InvoiceStatus.PARTIAL_PAID 
            : invoice.status
      }
    })
  }
  
  // Create goods receipts for purchase orders
  const goodsReceiptsData = []
  const receivablePOs = purchaseOrders.filter(po => {
    const age = Math.floor((new Date().getTime() - po.orderDate.getTime()) / (1000 * 60 * 60 * 24))
    return age > 7 // Only receive POs older than 7 days
  })
  
  for (const po of receivablePOs) {
    const receiptDate = faker.date.soon({ days: 14, refDate: po.orderDate })
    const receiptNumber = `GR-${receiptDate.getFullYear()}${(receiptDate.getMonth() + 1).toString().padStart(2, '0')}-${faker.number.int({ min: 1000, max: 9999 })}`
    
    goodsReceiptsData.push({
      receiptNumber,
      purchaseOrderId: po.id,
      supplierId: po.supplierId,
      status: ReceiptStatus.COMPLETED,
      receiptDate,
      totalAmount: po.totalAmount,
      notes: faker.helpers.maybe(() => 'All items received in good condition'),
      createdBy: users.warehouse.id,
      createdAt: receiptDate
    })
  }
  
  const goodsReceipts = await processBatch(
    goodsReceiptsData,
    async (batch) => {
      return Promise.all(
        batch.map(gr => prisma.goodsReceipt.create({ data: gr }))
      )
    },
    100,
    'Creating goods receipts'
  )
  
  // Create goods receipt items
  for (const receipt of goodsReceipts) {
    const poItems = await prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId: receipt.purchaseOrderId }
    })
    
    await processBatch(
      poItems,
      async (batch) => {
        return Promise.all(
          batch.map(poItem =>
            prisma.goodsReceiptItem.create({
              data: {
                goodsReceiptId: receipt.id,
                purchaseOrderItemId: poItem.id,
                itemId: poItem.itemId,
                itemCode: poItem.itemCode,
                quantityOrdered: poItem.quantity,
                quantityReceived: poItem.quantity, // Assuming full receipt
                unitPrice: poItem.unitPrice,
                totalAmount: poItem.totalAmount
              }
            })
          )
        )
      },
      50,
      'Creating goods receipt items'
    )
    
    // Update PO status
    await prisma.purchaseOrder.update({
      where: { id: receipt.purchaseOrderId },
      data: { status: POStatus.RECEIVED }
    })
  }
  
  // Create supplier invoices
  const supplierInvoicesData = []
  
  for (const receipt of goodsReceipts) {
    const invoiceDate = faker.date.soon({ days: 7, refDate: receipt.receiptDate })
    const po = purchaseOrders.find(p => p.id === receipt.purchaseOrderId)
    
    supplierInvoicesData.push({
      invoiceNumber: `SINV-${faker.number.int({ min: 100000, max: 999999 })}`,
      supplierId: receipt.supplierId,
      purchaseOrderId: receipt.purchaseOrderId,
      goodsReceiptId: receipt.id,
      status: SupplierInvoiceStatus.APPROVED,
      invoiceDate,
      dueDate: faker.date.soon({ days: parseInt(po.paymentTerms) || 30, refDate: invoiceDate }),
      currency: po.currency,
      exchangeRate: po.exchangeRate,
      subtotal: po.subtotal,
      taxAmount: po.taxAmount,
      totalAmount: po.totalAmount,
      paidAmount: 0,
      notes: faker.helpers.maybe(() => 'As per PO terms'),
      createdBy: users.accountant.id,
      createdAt: invoiceDate
    })
  }
  
  const supplierInvoices = await processBatch(
    supplierInvoicesData,
    async (batch) => {
      return Promise.all(
        batch.map(si => prisma.supplierInvoice.create({ data: si }))
      )
    },
    100,
    'Creating supplier invoices'
  )
  
  // Create supplier payments
  const supplierPaymentsData = []
  const payableInvoices = supplierInvoices.filter(si => {
    const age = Math.floor((new Date().getTime() - si.invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
    return age > 5 // Pay invoices after 5 days
  })
  
  for (const invoice of payableInvoices) {
    const supplier = suppliers.find(s => s.id === invoice.supplierId)
    const paymentDate = faker.date.between({ from: invoice.invoiceDate, to: invoice.dueDate })
    
    // Check for early payment discount
    const daysEarly = Math.floor((invoice.dueDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24))
    const earlyPaymentDiscount = daysEarly > 5 ? 0.02 : 0 // 2% discount for 5+ days early
    const paymentAmount = invoice.totalAmount * (1 - earlyPaymentDiscount)
    
    supplierPaymentsData.push({
      supplierId: invoice.supplierId,
      supplierInvoiceId: invoice.id,
      paymentDate,
      amount: paymentAmount,
      currency: invoice.currency,
      exchangeRate: invoice.exchangeRate,
      baseAmount: paymentAmount,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      referenceNumber: `SPAY-${paymentDate.getFullYear()}${faker.number.int({ min: 10000, max: 99999 })}`,
      bankAccount: supplier.bankAccount,
      notes: earlyPaymentDiscount > 0 ? `Early payment discount: ${(earlyPaymentDiscount * 100).toFixed(0)}%` : undefined,
      bankAccountId: accounts['1100'].id,
      accountsPayableId: accounts['2000'].id,
      createdBy: users.accountant.id,
      createdAt: paymentDate
    })
  }
  
  const supplierPayments = await processBatch(
    supplierPaymentsData,
    async (batch) => {
      return Promise.all(
        batch.map(sp => prisma.supplierPayment.create({ data: sp }))
      )
    },
    100,
    'Creating supplier payments'
  )
  
  // Update supplier invoice paid amounts
  for (const payment of supplierPayments) {
    await prisma.supplierInvoice.update({
      where: { id: payment.supplierInvoiceId },
      data: {
        paidAmount: payment.amount,
        status: SupplierInvoiceStatus.PAID
      }
    })
  }
  
  // Create journal entries
  await createJournalEntries(users.accountant.id, accounts)
  
  return { invoices, payments, supplierInvoices, supplierPayments }
}

// Create journal entries
async function createJournalEntries(accountantId: string, accounts: any) {
  const startDate = getDateMonthsAgo(CONFIG.DATE_RANGE_MONTHS)
  const endDate = new Date()
  const journalEntries = []
  
  // Monthly recurring entries
  for (let month = 0; month < CONFIG.DATE_RANGE_MONTHS; month++) {
    const monthDate = new Date(startDate)
    monthDate.setMonth(monthDate.getMonth() + month)
    
    // Monthly depreciation
    const depreciationEntry = await prisma.journalEntry.create({
      data: {
        entryNumber: `JE-${monthDate.getFullYear()}${(monthDate.getMonth() + 1).toString().padStart(2, '0')}-001`,
        entryDate: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0), // Last day of month
        description: `Monthly depreciation - ${monthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        reference: 'DEPR',
        currency: 'AED',
        exchangeRate: 1,
        status: JournalStatus.POSTED,
        createdBy: accountantId
      }
    })
    
    // Depreciation lines
    await prisma.journalLine.createMany({
      data: [
        {
          journalEntryId: depreciationEntry.id,
          accountId: accounts['5400'].id, // Depreciation expense
          debit: 8500,
          credit: 0,
          description: 'Monthly depreciation expense',
          currency: 'AED',
          exchangeRate: 1
        },
        {
          journalEntryId: depreciationEntry.id,
          accountId: accounts['1510'].id, // Accumulated depreciation
          debit: 0,
          credit: 8500,
          description: 'Accumulated depreciation',
          currency: 'AED',
          exchangeRate: 1
        }
      ]
    })
    
    // Monthly payroll accrual
    const payrollAmount = faker.number.float({ min: 85000, max: 95000, precision: 100 })
    const payrollEntry = await prisma.journalEntry.create({
      data: {
        entryNumber: `JE-${monthDate.getFullYear()}${(monthDate.getMonth() + 1).toString().padStart(2, '0')}-002`,
        entryDate: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0),
        description: `Monthly payroll accrual - ${monthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        reference: 'PAYROLL',
        currency: 'AED',
        exchangeRate: 1,
        status: JournalStatus.POSTED,
        createdBy: accountantId
      }
    })
    
    await prisma.journalLine.createMany({
      data: [
        {
          journalEntryId: payrollEntry.id,
          accountId: accounts['5100'].id, // Salaries expense
          debit: payrollAmount,
          credit: 0,
          description: 'Monthly salaries and wages',
          currency: 'AED',
          exchangeRate: 1
        },
        {
          journalEntryId: payrollEntry.id,
          accountId: accounts['2300'].id, // Salaries payable
          debit: 0,
          credit: payrollAmount,
          description: 'Salaries payable',
          currency: 'AED',
          exchangeRate: 1
        }
      ]
    })
    
    // Monthly rent with VAT
    const rentAmount = 15000
    const vatAmount = rentAmount * 0.05
    const rentEntry = await prisma.journalEntry.create({
      data: {
        entryNumber: `JE-${monthDate.getFullYear()}${(monthDate.getMonth() + 1).toString().padStart(2, '0')}-003`,
        entryDate: new Date(monthDate.getFullYear(), monthDate.getMonth(), 5), // 5th of month
        description: `Monthly rent - ${monthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        reference: 'RENT',
        currency: 'AED',
        exchangeRate: 1,
        status: JournalStatus.POSTED,
        createdBy: accountantId
      }
    })
    
    await prisma.journalLine.createMany({
      data: [
        {
          journalEntryId: rentEntry.id,
          accountId: accounts['5200'].id, // Rent expense
          debit: rentAmount,
          credit: 0,
          description: 'Monthly warehouse rent',
          currency: 'AED',
          exchangeRate: 1
        },
        {
          journalEntryId: rentEntry.id,
          accountId: accounts['1400'].id, // Prepaid expenses (VAT)
          debit: vatAmount,
          credit: 0,
          description: 'VAT on rent',
          currency: 'AED',
          exchangeRate: 1
        },
        {
          journalEntryId: rentEntry.id,
          accountId: accounts['1100'].id, // Bank
          debit: 0,
          credit: rentAmount + vatAmount,
          description: 'Payment from bank',
          currency: 'AED',
          exchangeRate: 1
        }
      ]
    })
  }
  
  // Quarterly VAT settlement
  for (let quarter = 0; quarter < Math.floor(CONFIG.DATE_RANGE_MONTHS / 3); quarter++) {
    const quarterDate = new Date(startDate)
    quarterDate.setMonth(quarterDate.getMonth() + (quarter * 3) + 2) // End of quarter
    
    const vatCollected = faker.number.float({ min: 45000, max: 65000, precision: 100 })
    const vatPaid = faker.number.float({ min: 25000, max: 35000, precision: 100 })
    const vatPayable = vatCollected - vatPaid
    
    const vatEntry = await prisma.journalEntry.create({
      data: {
        entryNumber: `JE-${quarterDate.getFullYear()}Q${quarter + 1}-VAT`,
        entryDate: new Date(quarterDate.getFullYear(), quarterDate.getMonth() + 1, 0),
        description: `VAT settlement Q${quarter + 1} ${quarterDate.getFullYear()}`,
        reference: 'VAT-SETTLEMENT',
        currency: 'AED',
        exchangeRate: 1,
        status: JournalStatus.POSTED,
        createdBy: accountantId
      }
    })
    
    await prisma.journalLine.createMany({
      data: [
        {
          journalEntryId: vatEntry.id,
          accountId: accounts['2200'].id, // VAT Payable
          debit: vatPayable,
          credit: 0,
          description: 'VAT payment to FTA',
          currency: 'AED',
          exchangeRate: 1
        },
        {
          journalEntryId: vatEntry.id,
          accountId: accounts['1100'].id, // Bank
          debit: 0,
          credit: vatPayable,
          description: 'VAT payment from bank',
          currency: 'AED',
          exchangeRate: 1
        }
      ]
    })
  }
  
  // Random bank charges
  for (let i = 0; i < 10; i++) {
    const chargeDate = getRandomDate(startDate, endDate)
    const chargeAmount = faker.number.float({ min: 50, max: 500, precision: 10 })
    
    const bankChargeEntry = await prisma.journalEntry.create({
      data: {
        entryNumber: `JE-BC-${chargeDate.getFullYear()}${faker.number.int({ min: 1000, max: 9999 })}`,
        entryDate: chargeDate,
        description: faker.helpers.arrayElement([
          'Bank service charges',
          'Wire transfer fees',
          'Account maintenance fee',
          'International transaction fee'
        ]),
        reference: 'BANK-CHARGE',
        currency: 'AED',
        exchangeRate: 1,
        status: JournalStatus.POSTED,
        createdBy: accountantId
      }
    })
    
    await prisma.journalLine.createMany({
      data: [
        {
          journalEntryId: bankChargeEntry.id,
          accountId: accounts['5800'].id, // Bank charges
          debit: chargeAmount,
          credit: 0,
          description: 'Bank charges',
          currency: 'AED',
          exchangeRate: 1
        },
        {
          journalEntryId: bankChargeEntry.id,
          accountId: accounts['1100'].id, // Bank
          debit: 0,
          credit: chargeAmount,
          description: 'Deducted from bank',
          currency: 'AED',
          exchangeRate: 1
        }
      ]
    })
  }
  
  console.log('   ✅ Created journal entries')
}

// Phase 5: Operational Data
async function createOperationalData(
  users: any,
  salesOrders: any[],
  purchaseOrders: any[],
  items: any[],
  locations: any,
  unitsOfMeasure: any[]
) {
  // Create shipments for confirmed orders
  const shippableOrders = salesOrders.filter(so => 
    [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.DELIVERED].includes(so.status)
  )
  
  const shipmentsData = []
  
  for (const order of shippableOrders) {
    const shipmentDate = faker.date.soon({ days: 3, refDate: order.orderDate })
    const shipmentNumber = `SH-${shipmentDate.getFullYear()}${(shipmentDate.getMonth() + 1).toString().padStart(2, '0')}-${faker.number.int({ min: 1000, max: 9999 })}`
    
    let status: ShipmentStatus
    if (order.status === OrderStatus.DELIVERED) {
      status = ShipmentStatus.DELIVERED
    } else if (Math.random() < 0.3) {
      status = ShipmentStatus.IN_TRANSIT
    } else {
      status = ShipmentStatus.READY
    }
    
    shipmentsData.push({
      shipmentNumber,
      salesOrderId: order.id,
      status,
      shipmentDate,
      carrier: faker.helpers.arrayElement(['Aramex', 'DHL Express', 'FedEx', 'Emirates Post']),
      trackingNumber: faker.string.alphanumeric(12).toUpperCase(),
      estimatedDeliveryDate: faker.date.soon({ days: 2, refDate: shipmentDate }),
      deliveredAt: status === ShipmentStatus.DELIVERED ? faker.date.soon({ days: 3, refDate: shipmentDate }) : null,
      shipFromAddress: JSON.stringify({
        name: 'UAE Marine Engine Services',
        street: 'Warehouse District, Jebel Ali',
        city: 'Dubai',
        country: 'UAE',
        phone: '+971 4 123 4567'
      }),
      shipToAddress: order.shippingAddress,
      shippingCost: order.shippingAmount || faker.number.float({ min: 100, max: 500, precision: 50 }),
      notes: faker.helpers.maybe(() => 'Handle with care - Marine engine parts'),
      createdBy: users.warehouse.id,
      createdAt: shipmentDate
    })
  }
  
  const shipments = await processBatch(
    shipmentsData,
    async (batch) => {
      return Promise.all(
        batch.map(sh => prisma.shipment.create({ data: sh }))
      )
    },
    100,
    'Creating shipments'
  )
  
  // Create shipment items
  for (const shipment of shipments) {
    const orderItems = await prisma.salesOrderItem.findMany({
      where: { salesOrderId: shipment.salesOrderId }
    })
    
    await processBatch(
      orderItems,
      async (batch) => {
        return Promise.all(
          batch.map(orderItem =>
            prisma.shipmentItem.create({
              data: {
                shipmentId: shipment.id,
                salesOrderItemId: orderItem.id,
                itemId: orderItem.itemId,
                itemCode: orderItem.itemCode,
                quantity: orderItem.quantity,
                unitOfMeasureId: items.find(i => i.id === orderItem.itemId)?.unitOfMeasureId
              }
            })
          )
        )
      },
      50,
      'Creating shipment items'
    )
  }
  
  // Create stock movements
  const stockMovements = []
  const startDate = getDateMonthsAgo(CONFIG.DATE_RANGE_MONTHS)
  
  // First, ensure locations exist
  if (!locations || !locations.mainWarehouse) {
    console.warn('   ⚠️  No locations found, skipping stock movements')
    return
  }
  
  // Create stock lots for all items
  const stockLots = new Map()
  
  for (const item of items) {
    const lot = await prisma.stockLot.create({
      data: {
        lotNumber: `LOT-${item.itemCode}-${faker.number.int({ min: 1000, max: 9999 })}`,
        itemId: item.id,
        locationId: locations.mainWarehouse.id,
        receivedQty: faker.number.int({ min: 100, max: 500 }),
        availableQty: faker.number.int({ min: 50, max: 400 }),
        expiryDate: faker.date.future({ years: 2 }),
        unitCost: item.costPrice,
        totalCost: item.costPrice * faker.number.int({ min: 100, max: 500 }),
        createdBy: users.warehouse.id
      }
    })
    stockLots.set(item.id, lot)
  }
  
  // Opening balances
  const openingBalanceDate = new Date(startDate)
  openingBalanceDate.setDate(1) // First day of the period
  
  for (const [itemId, lot] of stockLots) {
    const item = items.find(i => i.id === itemId)
    stockMovements.push({
      movementNumber: `MV-OPEN-${faker.number.int({ min: 10000, max: 99999 })}`,
      type: MovementType.ADJUSTMENT,
      itemId: item.id,
      stockLotId: lot.id,
      locationId: locations.mainWarehouse.id,
      quantity: lot.receivedQty,
      unitCost: item.costPrice,
      totalCost: lot.receivedQty * item.costPrice,
      movementDate: openingBalanceDate,
      reference: 'OPENING',
      notes: 'Opening balance',
      unitOfMeasureId: item.unitOfMeasureId,
      createdBy: users.warehouse.id,
      createdAt: openingBalanceDate
    })
  }
  
  // Stock in from purchases
  for (const po of purchaseOrders) {
    const receiptDate = faker.date.soon({ days: 14, refDate: po.orderDate })
    const poItems = await prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId: po.id }
    })
    
    for (const poItem of poItems) {
      const lot = stockLots.get(poItem.itemId)
      if (lot) {
        stockMovements.push({
          movementNumber: `MV-IN-${faker.number.int({ min: 10000, max: 99999 })}`,
          type: MovementType.STOCK_IN,
          itemId: poItem.itemId,
          stockLotId: lot.id,
          locationId: locations.mainWarehouse.id,
          quantity: poItem.quantity,
          unitCost: poItem.unitPrice,
          totalCost: poItem.totalAmount,
          movementDate: receiptDate,
          reference: `PO-${po.poNumber}`,
          notes: 'Stock received from purchase order',
          unitOfMeasureId: items.find(i => i.id === poItem.itemId)?.unitOfMeasureId,
          createdBy: users.warehouse.id,
          createdAt: receiptDate
        })
      }
    }
  }
  
  // Stock out for sales
  for (const shipment of shipments) {
    if (shipment.status !== ShipmentStatus.READY) {
      const shipmentItems = await prisma.shipmentItem.findMany({
        where: { shipmentId: shipment.id }
      })
      
      for (const shipItem of shipmentItems) {
        const lot = stockLots.get(shipItem.itemId)
        if (lot) {
          stockMovements.push({
            movementNumber: `MV-OUT-${faker.number.int({ min: 10000, max: 99999 })}`,
            type: MovementType.STOCK_OUT,
            itemId: shipItem.itemId,
            stockLotId: lot.id,
            locationId: locations.mainWarehouse.id,
            quantity: -shipItem.quantity, // Negative for stock out
            unitCost: items.find(i => i.id === shipItem.itemId)?.costPrice || 0,
            totalCost: -shipItem.quantity * (items.find(i => i.id === shipItem.itemId)?.costPrice || 0),
            movementDate: shipment.shipmentDate,
            reference: `SH-${shipment.shipmentNumber}`,
            notes: 'Stock shipped to customer',
            unitOfMeasureId: shipItem.unitOfMeasureId,
            createdBy: users.warehouse.id,
            createdAt: shipment.shipmentDate
          })
        }
      }
    }
  }
  
  // Random adjustments
  for (let i = 0; i < 20; i++) {
    const adjustmentDate = getRandomDate(startDate, new Date())
    const randomItem = faker.helpers.arrayElement(items)
    const lot = stockLots.get(randomItem.id)
    
    if (lot) {
      const adjustmentQty = faker.number.int({ min: -10, max: 10 })
      if (adjustmentQty !== 0) {
        stockMovements.push({
          movementNumber: `MV-ADJ-${faker.number.int({ min: 10000, max: 99999 })}`,
          type: MovementType.ADJUSTMENT,
          itemId: randomItem.id,
          stockLotId: lot.id,
          locationId: faker.helpers.arrayElement([locations.mainWarehouse, locations.abuDhabiWarehouse, locations.sharjahWarehouse]).id,
          quantity: adjustmentQty,
          unitCost: randomItem.costPrice,
          totalCost: adjustmentQty * randomItem.costPrice,
          movementDate: adjustmentDate,
          reference: faker.helpers.arrayElement(['CYCLE-COUNT', 'DAMAGE', 'LOSS', 'FOUND']),
          notes: faker.helpers.arrayElement([
            'Physical count variance',
            'Damaged goods written off',
            'Lost in warehouse',
            'Found during inventory count',
            'Quality control failure'
          ]),
          unitOfMeasureId: randomItem.unitOfMeasureId,
          createdBy: users.warehouse.id,
          createdAt: adjustmentDate
        })
      }
    }
  }
  
  await processBatch(
    stockMovements,
    async (batch) => {
      return Promise.all(
        batch.map(sm => prisma.stockMovement.create({ data: sm }))
      )
    },
    100,
    'Creating stock movements'
  )
  
  // Create stock transfers between locations
  const stockTransfersData = []
  
  for (let i = 0; i < 15; i++) {
    const transferDate = getRandomDate(startDate, new Date())
    const fromLocation = faker.helpers.arrayElement([locations.mainWarehouse, locations.abuDhabiWarehouse])
    const toLocation = faker.helpers.arrayElement(
      Object.values(locations).filter(l => l.id !== fromLocation.id)
    )
    
    stockTransfersData.push({
      transferNumber: `ST-${transferDate.getFullYear()}${faker.number.int({ min: 1000, max: 9999 })}`,
      fromLocationId: fromLocation.id,
      toLocationId: toLocation.id,
      status: faker.helpers.weightedArrayElement([
        { value: TransferStatus.COMPLETED, weight: 70 },
        { value: TransferStatus.IN_TRANSIT, weight: 20 },
        { value: TransferStatus.PENDING, weight: 10 }
      ]),
      transferDate,
      expectedDate: faker.date.soon({ days: 3, refDate: transferDate }),
      reason: faker.helpers.arrayElement([
        'Stock balancing',
        'Customer proximity',
        'Urgent requirement',
        'Warehouse optimization'
      ]),
      notes: faker.helpers.maybe(() => 'Transfer approved by warehouse manager'),
      requestedBy: users.warehouse.id,
      createdBy: users.warehouse.id,
      createdAt: transferDate
    })
  }
  
  const stockTransfers = await processBatch(
    stockTransfersData,
    async (batch) => {
      return Promise.all(
        batch.map(st => prisma.stockTransfer.create({ data: st }))
      )
    },
    50,
    'Creating stock transfers'
  )
  
  // Create stock transfer items and movements
  for (const transfer of stockTransfers) {
    const itemCount = faker.number.int({ min: 1, max: 5 })
    const selectedItems = faker.helpers.arrayElements(items, itemCount)
    
    for (const item of selectedItems) {
      const quantity = faker.number.int({ min: 5, max: 50 })
      
      await prisma.stockTransferItem.create({
        data: {
          stockTransferId: transfer.id,
          itemId: item.id,
          requestedQuantity: quantity,
          shippedQuantity: transfer.status !== TransferStatus.PENDING ? quantity : 0,
          receivedQuantity: transfer.status === TransferStatus.COMPLETED ? quantity : 0,
          unitOfMeasureId: item.unitOfMeasureId
        }
      })
      
      // Create movement records for completed transfers
      if (transfer.status === TransferStatus.COMPLETED) {
        const lot = stockLots.get(item.id)
        if (lot) {
          // Stock out from source
          await prisma.stockMovement.create({
            data: {
              movementNumber: `MV-XFER-OUT-${faker.number.int({ min: 10000, max: 99999 })}`,
              type: MovementType.TRANSFER,
              itemId: item.id,
              stockLotId: lot.id,
              locationId: transfer.fromLocationId,
              quantity: -quantity,
              unitCost: item.costPrice,
              totalCost: -quantity * item.costPrice,
              movementDate: transfer.transferDate,
              reference: transfer.transferNumber,
              notes: `Transfer to ${locations[Object.keys(locations).find(k => locations[k].id === transfer.toLocationId)]?.locationName}`,
              unitOfMeasureId: item.unitOfMeasureId,
              createdBy: users.warehouse.id
            }
          })
          
          // Stock in at destination
          await prisma.stockMovement.create({
            data: {
              movementNumber: `MV-XFER-IN-${faker.number.int({ min: 10000, max: 99999 })}`,
              type: MovementType.TRANSFER,
              itemId: item.id,
              stockLotId: lot.id,
              locationId: transfer.toLocationId,
              quantity: quantity,
              unitCost: item.costPrice,
              totalCost: quantity * item.costPrice,
              movementDate: faker.date.soon({ days: 1, refDate: transfer.transferDate }),
              reference: transfer.transferNumber,
              notes: `Transfer from ${transfer.fromLocationId}`,
              unitOfMeasureId: item.unitOfMeasureId,
              createdBy: users.warehouse.id
            }
          })
        }
      }
    }
  }
  
  // Create customer purchase orders
  const customerPOsData = []
  
  for (const order of salesOrders.slice(0, Math.floor(salesOrders.length * 0.7))) {
    const customer = customers.find(c => c.id === order.customerId)
    const poDate = faker.date.recent({ days: 3, refDate: order.orderDate })
    
    customerPOsData.push({
      poNumber: `${customer.name.substring(0, 3).toUpperCase()}-PO-${faker.number.int({ min: 10000, max: 99999 })}`,
      customerId: order.customerId,
      salesOrderId: order.id,
      poDate,
      poAmount: order.totalAmount,
      currency: order.currency,
      status: 'ACTIVE',
      attachmentUrl: faker.helpers.maybe(() => `/documents/po/${faker.string.uuid()}.pdf`),
      terms: order.paymentTerms,
      authorizedBy: faker.person.fullName(),
      authorizedDate: poDate,
      createdBy: users.sales.id,
      createdAt: poDate
    })
  }
  
  await processBatch(
    customerPOsData,
    async (batch) => {
      return Promise.all(
        batch.map(po => prisma.customerPO.create({ data: po }))
      )
    },
    100,
    'Creating customer purchase orders'
  )
  
  // Create audit logs
  const auditLogsData = []
  const entities = ['User', 'Customer', 'Supplier', 'Item', 'SalesOrder', 'Invoice', 'Payment']
  const actions = ['CREATE', 'UPDATE', 'DELETE', 'VIEW']
  
  // Generate realistic audit logs
  for (let i = 0; i < 200; i++) {
    const logDate = getRandomDate(startDate, new Date())
    const entity = faker.helpers.arrayElement(entities)
    const action = faker.helpers.weightedArrayElement([
      { value: 'VIEW', weight: 50 },
      { value: 'UPDATE', weight: 30 },
      { value: 'CREATE', weight: 15 },
      { value: 'DELETE', weight: 5 }
    ])
    
    auditLogsData.push({
      userId: faker.helpers.arrayElement(Object.values(users)).id,
      action,
      entity,
      entityId: faker.string.uuid(),
      details: JSON.stringify({
        timestamp: logDate.toISOString(),
        ip: faker.internet.ip(),
        userAgent: faker.internet.userAgent(),
        changes: action === 'UPDATE' ? {
          before: { status: 'DRAFT' },
          after: { status: 'SENT' }
        } : null
      }),
      ipAddress: faker.internet.ip(),
      userAgent: faker.internet.userAgent(),
      createdAt: logDate
    })
  }
  
  // Add login/logout logs
  for (const user of Object.values(users)) {
    // Generate login sessions
    for (let i = 0; i < 20; i++) {
      const loginDate = getRandomDate(startDate, new Date())
      const sessionDuration = faker.number.int({ min: 30, max: 480 }) // 30 min to 8 hours
      
      auditLogsData.push({
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        details: JSON.stringify({
          timestamp: loginDate.toISOString(),
          ip: faker.internet.ip(),
          userAgent: faker.internet.userAgent(),
          sessionId: faker.string.uuid()
        }),
        ipAddress: faker.internet.ip(),
        userAgent: faker.internet.userAgent(),
        createdAt: loginDate
      })
      
      const logoutDate = new Date(loginDate)
      logoutDate.setMinutes(logoutDate.getMinutes() + sessionDuration)
      
      auditLogsData.push({
        userId: user.id,
        action: 'LOGOUT',
        entity: 'User',
        entityId: user.id,
        details: JSON.stringify({
          timestamp: logoutDate.toISOString(),
          ip: faker.internet.ip(),
          userAgent: faker.internet.userAgent(),
          sessionDuration: `${sessionDuration} minutes`
        }),
        ipAddress: faker.internet.ip(),
        userAgent: faker.internet.userAgent(),
        createdAt: logoutDate
      })
    }
  }
  
  await processBatch(
    auditLogsData,
    async (batch) => {
      return Promise.all(
        batch.map(log => prisma.auditLog.create({ data: log }))
      )
    },
    100,
    'Creating audit logs'
  )
  
  console.log('   ✅ Created operational data')
}

// Run the seed
main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })