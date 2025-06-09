import { PrismaClient, AccountType, Role, CustomerStatus, LeadStatus, SalesCaseStatus, QuotationStatus, ItemType, MovementType, JournalStatus, SupplierInvoiceStatus, ThreeWayMatchingStatus } from '../lib/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// UAE Diesel Engine Maintenance Company Seed Data
async function main() {
  console.warn('🌱 Starting UAE Diesel Engine Maintenance Company seed...')

  // Clean existing data
  await cleanDatabase()

  // Create users
  const users = await createUsers()
  console.warn('✅ Created users')

  // Create chart of accounts (UAE specific)
  const accounts = await createChartOfAccounts(users.admin.id)
  console.warn('✅ Created chart of accounts')

  // Create suppliers (UAE based)
  const suppliers = await createSuppliers(users.admin.id, accounts)
  console.warn('✅ Created suppliers')

  // Create customers (UAE companies)
  const customers = await createCustomers(users.admin.id, users.sales.id)
  console.warn('✅ Created customers')

  // Create leads
  const leads = await createLeads(users.sales.id)
  console.warn('✅ Created leads')

  // Create sales cases
  const salesCases = await createSalesCases(users.sales.id, customers, leads)
  console.warn('✅ Created sales cases')

  // Create inventory for diesel engine parts and services
  const inventory = await createInventoryFoundation(users.admin.id, accounts)
  console.warn('✅ Created inventory foundation')

  // Create quotations
  const quotations = await createQuotations(users.sales.id, customers, inventory.items)
  console.warn('✅ Created quotations')

  // Create stock movements
  await createStockMovements(users.warehouse.id, inventory.items)
  console.warn('✅ Created stock movements')

  // Create sample journal entries (in AED)
  await createSampleJournalEntries(users.accountant.id, accounts)
  console.warn('✅ Created journal entries')

  console.warn('🎉 UAE Diesel Engine Maintenance seed completed successfully!')
  console.warn('\n📋 Login Credentials:')
  console.warn('Admin: username: admin, password: DieselUAE2024!')
  console.warn('Sales Manager: username: sales_manager, password: DieselUAE2024!')
  console.warn('Service Tech: username: service_tech, password: DieselUAE2024!')
  console.warn('Accountant: username: accountant, password: DieselUAE2024!')
  console.warn('Warehouse: username: warehouse, password: DieselUAE2024!')
}

async function cleanDatabase() {
  try {
    // Delete in correct order to respect foreign keys
    await prisma.auditLog.deleteMany()
    await prisma.journalLine.deleteMany()
    await prisma.journalEntry.deleteMany()
    await prisma.supplierPayment.deleteMany()
    await prisma.supplierInvoiceItem.deleteMany()
    await prisma.supplierInvoice.deleteMany()
    await prisma.goodsReceiptItem.deleteMany()
    await prisma.goodsReceipt.deleteMany()
    await prisma.purchaseOrderItem.deleteMany()
    await prisma.purchaseOrder.deleteMany()
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
    await prisma.supplier.deleteMany()
    await prisma.account.deleteMany()
    await prisma.user.deleteMany()
    console.warn('✅ Cleaned existing data')
  } catch (error) {
    console.error('Error cleaning database:', error)
    throw error
  }
}

async function createUsers() {
  const hashedPassword = await bcrypt.hash('DieselUAE2024!', 10)

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@dieseluae.com',
      password: hashedPassword,
      role: Role.ADMIN,
      firstName: 'Ahmed',
      lastName: 'Al Rashid',
      isActive: true
    }
  })

  const salesManager = await prisma.user.create({
    data: {
      username: 'sales_manager',
      email: 'sales@dieseluae.com',
      password: hashedPassword,
      role: Role.USER,
      firstName: 'Mohammed',
      lastName: 'Al Maktoum',
      isActive: true
    }
  })

  const serviceTech = await prisma.user.create({
    data: {
      username: 'service_tech',
      email: 'service@dieseluae.com',
      password: hashedPassword,
      role: Role.USER,
      firstName: 'Khalid',
      lastName: 'Al Nahyan',
      isActive: true
    }
  })

  const accountant = await prisma.user.create({
    data: {
      username: 'accountant',
      email: 'accounts@dieseluae.com',
      password: hashedPassword,
      role: Role.USER,
      firstName: 'Fatima',
      lastName: 'Al Qassimi',
      isActive: true
    }
  })

  const warehouse = await prisma.user.create({
    data: {
      username: 'warehouse',
      email: 'warehouse@dieseluae.com',
      password: hashedPassword,
      role: Role.USER,
      firstName: 'Omar',
      lastName: 'Al Sharqi',
      isActive: true
    }
  })

  return { admin, salesManager, serviceTech, accountant, warehouse }
}

async function createChartOfAccounts(userId: string) {
  // Assets
  const cash = await prisma.account.create({
    data: {
      code: '1000',
      name: 'Cash - AED',
      type: AccountType.ASSET,
      description: 'Cash and cash equivalents in AED',
      currency: 'AED',
      isActive: true,
      createdBy: userId
    }
  })

  const bankUAE = await prisma.account.create({
    data: {
      code: '1100',
      name: 'Emirates NBD - Current Account',
      type: AccountType.ASSET,
      description: 'Main operating account',
      currency: 'AED',
      isActive: true,
      createdBy: userId
    }
  })

  const accountsReceivable = await prisma.account.create({
    data: {
      code: '1200',
      name: 'Accounts Receivable - Trade',
      type: AccountType.ASSET,
      description: 'Customer receivables',
      currency: 'AED',
      isActive: true,
      createdBy: userId
    }
  })

  const inventory = await prisma.account.create({
    data: {
      code: '1300',
      name: 'Inventory - Spare Parts',
      type: AccountType.ASSET,
      description: 'Diesel engine spare parts inventory',
      currency: 'AED',
      isActive: true,
      createdBy: userId
    }
  })

  const equipment = await prisma.account.create({
    data: {
      code: '1500',
      name: 'Service Equipment & Tools',
      type: AccountType.ASSET,
      description: 'Workshop equipment and tools',
      currency: 'AED',
      isActive: true,
      createdBy: userId
    }
  })

  // Liabilities
  const accountsPayable = await prisma.account.create({
    data: {
      code: '2000',
      name: 'Accounts Payable - Suppliers',
      type: AccountType.LIABILITY,
      description: 'Supplier payables',
      currency: 'AED',
      isActive: true,
      createdBy: userId
    }
  })

  const vatPayable = await prisma.account.create({
    data: {
      code: '2100',
      name: 'VAT Payable',
      type: AccountType.LIABILITY,
      description: 'UAE VAT payable (5%)',
      currency: 'AED',
      isActive: true,
      createdBy: userId
    }
  })

  // Equity
  const capitalStock = await prisma.account.create({
    data: {
      code: '3000',
      name: 'Share Capital',
      type: AccountType.EQUITY,
      description: 'Shareholder capital',
      currency: 'AED',
      isActive: true,
      createdBy: userId
    }
  })

  // Income
  const serviceRevenue = await prisma.account.create({
    data: {
      code: '4000',
      name: 'Service Revenue - Maintenance',
      type: AccountType.INCOME,
      description: 'Revenue from maintenance services',
      currency: 'AED',
      isActive: true,
      createdBy: userId
    }
  })

  const partsRevenue = await prisma.account.create({
    data: {
      code: '4100',
      name: 'Parts Sales Revenue',
      type: AccountType.INCOME,
      description: 'Revenue from spare parts sales',
      currency: 'AED',
      isActive: true,
      createdBy: userId
    }
  })

  // Expenses
  const cogs = await prisma.account.create({
    data: {
      code: '5000',
      name: 'Cost of Parts Sold',
      type: AccountType.EXPENSE,
      description: 'Cost of spare parts sold',
      currency: 'AED',
      isActive: true,
      createdBy: userId
    }
  })

  const salariesExpense = await prisma.account.create({
    data: {
      code: '5100',
      name: 'Salaries - Technical Staff',
      type: AccountType.EXPENSE,
      description: 'Technical staff salaries',
      currency: 'AED',
      isActive: true,
      createdBy: userId
    }
  })

  const rentExpense = await prisma.account.create({
    data: {
      code: '5200',
      name: 'Workshop Rent',
      type: AccountType.EXPENSE,
      description: 'Workshop facility rent',
      currency: 'AED',
      isActive: true,
      createdBy: userId
    }
  })

  return {
    cash,
    bankUAE,
    accountsReceivable,
    inventory,
    equipment,
    accountsPayable,
    vatPayable,
    capitalStock,
    serviceRevenue,
    partsRevenue,
    cogs,
    salariesExpense,
    rentExpense
  }
}

async function createSuppliers(userId: string, accounts: any) {
  const cumminsArabia = await prisma.supplier.create({
    data: {
      supplierNumber: 'SUP-001',
      name: 'Cummins Arabia FZE',
      email: 'sales@cumminsarabia.ae',
      phone: '+971 4 885 7777',
      address: 'Jebel Ali Free Zone, Dubai, UAE',
      currency: 'AED',
      paymentTerms: 30,
      creditLimit: 500000,
      taxId: '100334567890003',
      bankName: 'Standard Chartered',
      bankAccount: 'AE070330000010123456789',
      contactPerson: 'Rashid Ahmed',
      contactEmail: 'rashid@cumminsarabia.ae',
      contactPhone: '+971 50 123 4567',
      accountId: accounts.accountsPayable.id,
      isActive: true,
      isPreferred: true,
      createdBy: userId
    }
  })

  const caterpillarUAE = await prisma.supplier.create({
    data: {
      supplierNumber: 'SUP-002',
      name: 'Al-Bahar - Caterpillar Dealer',
      email: 'parts@al-bahar.com',
      phone: '+971 2 641 4444',
      address: 'Mussafah Industrial Area, Abu Dhabi, UAE',
      currency: 'AED',
      paymentTerms: 45,
      creditLimit: 750000,
      taxId: '100445678901234',
      bankName: 'First Abu Dhabi Bank',
      bankAccount: 'AE070350000012345678901',
      contactPerson: 'Sultan Al Kaabi',
      contactEmail: 'sultan.kaabi@al-bahar.com',
      accountId: accounts.accountsPayable.id,
      isActive: true,
      isPreferred: true,
      createdBy: userId
    }
  })

  const lubricantsSupplier = await prisma.supplier.create({
    data: {
      supplierNumber: 'SUP-003',
      name: 'ENOC Lubricants & Grease Trading',
      email: 'commercial@enoclubricants.com',
      phone: '+971 4 339 3933',
      address: 'Sheikh Zayed Road, Dubai, UAE',
      currency: 'AED',
      paymentTerms: 30,
      creditLimit: 250000,
      taxId: '100556789012345',
      bankName: 'Emirates Islamic Bank',
      bankAccount: 'AE070340000098765432101',
      contactPerson: 'Majid Hassan',
      contactEmail: 'majid.h@enoclubricants.com',
      accountId: accounts.accountsPayable.id,
      isActive: true,
      createdBy: userId
    }
  })

  return { cumminsArabia, caterpillarUAE, lubricantsSupplier }
}

async function createCustomers(adminId: string, salesId: string) {
  const dpWorld = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-001',
      companyName: 'DP World - Jebel Ali',
      tradeName: 'DP World',
      taxId: '100123456789012',
      email: 'maintenance@dpworld.com',
      phone: '+971 4 881 5000',
      website: 'https://www.dpworld.com',
      address: 'Jebel Ali Port, Dubai, UAE',
      industry: 'Ports & Logistics',
      numberOfEmployees: 5000,
      annualRevenue: 8000000000, // 8 billion AED
      creditLimit: 2000000, // 2 million AED
      paymentTerms: 60,
      currency: 'AED',
      status: CustomerStatus.ACTIVE,
      createdBy: adminId
    }
  })

  const emiratesTransport = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-002',
      companyName: 'Emirates Transport',
      tradeName: 'ET',
      taxId: '100234567890123',
      email: 'fleet@emiratestransport.ae',
      phone: '+971 6 505 5555',
      website: 'https://www.et.gov.ae',
      address: 'Industrial Area, Sharjah, UAE',
      industry: 'Transportation',
      numberOfEmployees: 23000,
      annualRevenue: 3500000000, // 3.5 billion AED
      creditLimit: 1500000, // 1.5 million AED
      paymentTerms: 45,
      currency: 'AED',
      status: CustomerStatus.ACTIVE,
      createdBy: salesId
    }
  })

  const adnoc = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-003',
      companyName: 'ADNOC Distribution',
      tradeName: 'ADNOC',
      taxId: '100345678901234',
      email: 'facilities@adnocdistribution.ae',
      phone: '+971 2 606 0000',
      website: 'https://www.adnocdistribution.ae',
      address: 'Corniche Road, Abu Dhabi, UAE',
      industry: 'Oil & Gas',
      numberOfEmployees: 10000,
      annualRevenue: 20000000000, // 20 billion AED
      creditLimit: 5000000, // 5 million AED
      paymentTerms: 90,
      currency: 'AED',
      status: CustomerStatus.ACTIVE,
      createdBy: adminId
    }
  })

  const rakCement = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-004',
      companyName: 'RAK Cement Company',
      tradeName: 'RAK Cement',
      taxId: '100456789012345',
      email: 'plant@rakcement.com',
      phone: '+971 7 244 9100',
      website: 'https://www.rakcement.com',
      address: 'Khor Khwair, Ras Al Khaimah, UAE',
      industry: 'Manufacturing',
      numberOfEmployees: 1500,
      annualRevenue: 800000000, // 800 million AED
      creditLimit: 750000, // 750k AED
      paymentTerms: 30,
      currency: 'AED',
      status: CustomerStatus.ACTIVE,
      createdBy: salesId
    }
  })

  return { dpWorld, emiratesTransport, adnoc, rakCement }
}

async function createLeads(salesId: string) {
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        companyName: 'Dubai Municipality - Fleet Division',
        contactName: 'Eng. Abdullah Al Rashid',
        email: 'abdullah.rashid@dm.gov.ae',
        phone: '+971 4 221 5555',
        address: 'Deira, Dubai, UAE',
        industry: 'Government',
        estimatedValue: 3000000, // 3 million AED annual contract
        status: LeadStatus.NEW,
        source: 'Government Tender Portal',
        notes: 'RFQ for annual maintenance contract for 150 diesel generators',
        createdBy: salesId
    }
    }),
    prisma.lead.create({
      data: {
        companyName: 'Emaar Properties',
        contactName: 'Sara Al Maktoum',
        email: 'sara.maktoum@emaar.ae',
        phone: '+971 4 367 3333',
        address: 'Downtown Dubai, UAE',
        industry: 'Real Estate',
        estimatedValue: 1500000, // 1.5 million AED
        status: LeadStatus.CONTACTED,
        source: 'Referral - Dubai Mall',
        notes: 'Backup generator maintenance for multiple properties',
        createdBy: salesId
      }
    }),
    prisma.lead.create({
      data: {
        companyName: 'Masdar City',
        contactName: 'Dr. Ahmad Hassan',
        email: 'ahmad.hassan@masdar.ae',
        phone: '+971 2 653 3333',
        address: 'Masdar City, Abu Dhabi, UAE',
        industry: 'Energy & Utilities',
        estimatedValue: 2000000, // 2 million AED
        status: LeadStatus.QUALIFIED,
        source: 'WETEX Exhibition 2024',
        notes: 'Sustainable energy project - diesel backup systems',
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
  // Sales case for DP World annual contract
  const dpWorldCase = await prisma.salesCase.create({
    data: {
      caseNumber: 'SC-2024-001',
      title: 'DP World Annual Maintenance Contract Renewal',
      description: 'Annual maintenance contract for 50 container handling equipment diesel engines',
      customerId: customers.dpWorld.id,
      estimatedValue: 4500000, // 4.5 million AED
      probability: 85,
      expectedCloseDate: new Date('2024-03-31'),
      stage: 'Negotiation',
      status: SalesCaseStatus.IN_PROGRESS,
      assignedTo: salesId,
      createdBy: salesId
    }
  })

  // Sales case for Emirates Transport
  const etCase = await prisma.salesCase.create({
    data: {
      caseNumber: 'SC-2024-002',
      title: 'Emirates Transport Bus Fleet Service Contract',
      description: 'Preventive maintenance for 200 school buses diesel engines',
      customerId: customers.emiratesTransport.id,
      estimatedValue: 2800000, // 2.8 million AED
      probability: 70,
      expectedCloseDate: new Date('2024-04-15'),
      stage: 'Proposal',
      status: SalesCaseStatus.IN_PROGRESS,
      assignedTo: salesId,
      createdBy: salesId
    }
  })

  // Sales case from lead - Dubai Municipality
  const dmCase = await prisma.salesCase.create({
    data: {
      caseNumber: 'SC-2024-003',
      title: 'Dubai Municipality Generator Maintenance',
      description: 'Government tender for generator maintenance services',
      leadId: leads[0].id,
      estimatedValue: 3000000, // 3 million AED
      probability: 60,
      expectedCloseDate: new Date('2024-05-30'),
      stage: 'Discovery',
      status: SalesCaseStatus.IN_PROGRESS,
      assignedTo: salesId,
      createdBy: salesId
    }
  })

  // Add updates to sales cases
  await prisma.salesCaseUpdate.create({
    data: {
      salesCaseId: dpWorldCase.id,
      updateType: 'PROGRESS',
      description: 'Site visit completed. Assessed all 50 engines. Preparing detailed proposal.',
      createdBy: salesId
    }
  })

  await prisma.salesCaseUpdate.create({
    data: {
      salesCaseId: etCase.id,
      updateType: 'PROGRESS',
      description: 'Initial meeting with fleet manager. They want comprehensive preventive maintenance package.',
      createdBy: salesId
    }
  })

  return { dpWorldCase, etCase, dmCase }
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

  const set = await prisma.unitOfMeasure.create({
    data: {
      code: 'SET',
      name: 'Set',
      symbol: 'set',
      isBaseUnit: true,
      createdBy: userId
    }
  })

  const liter = await prisma.unitOfMeasure.create({
    data: {
      code: 'L',
      name: 'Liter',
      symbol: 'L',
      isBaseUnit: true,
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

  const hour = await prisma.unitOfMeasure.create({
    data: {
      code: 'HR',
      name: 'Hour',
      symbol: 'hr',
      isBaseUnit: true,
      createdBy: userId
    }
  })

  // Categories
  const engineParts = await prisma.category.create({
    data: {
      code: 'ENGINE',
      name: 'Engine Components',
      description: 'Diesel engine internal components',
      createdBy: userId
    }
  })

  const filters = await prisma.category.create({
    data: {
      code: 'FILTER',
      name: 'Filters',
      description: 'Oil, fuel, and air filters',
      parentId: engineParts.id,
      createdBy: userId
    }
  })

  const pistonParts = await prisma.category.create({
    data: {
      code: 'PISTON',
      name: 'Piston & Connecting Rod',
      description: 'Pistons, rings, and connecting rods',
      parentId: engineParts.id,
      createdBy: userId
    }
  })

  const lubricants = await prisma.category.create({
    data: {
      code: 'LUBE',
      name: 'Lubricants & Fluids',
      description: 'Engine oils and coolants',
      createdBy: userId
    }
  })

  const services = await prisma.category.create({
    data: {
      code: 'SERVICE',
      name: 'Services',
      description: 'Maintenance and repair services',
      createdBy: userId
    }
  })

  // Items - Diesel Engine Parts
  const oilFilter = await prisma.item.create({
    data: {
      code: 'FLT-001',
      name: 'Cummins Oil Filter LF9009',
      description: 'Heavy duty oil filter for Cummins ISX engines',
      categoryId: filters.id,
      type: ItemType.PRODUCT,
      unitOfMeasureId: pieces.id,
      trackInventory: true,
      minStockLevel: 50,
      maxStockLevel: 500,
      reorderPoint: 100,
      standardCost: 85, // 85 AED
      listPrice: 120, // 120 AED
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.cogs.id,
      salesAccountId: accounts.partsRevenue.id,
      isSaleable: true,
      isPurchaseable: true,
      createdBy: userId
    }
  })

  const fuelFilter = await prisma.item.create({
    data: {
      code: 'FLT-002',
      name: 'CAT Fuel Filter 1R-0750',
      description: 'Fuel filter for Caterpillar 3500 series engines',
      categoryId: filters.id,
      type: ItemType.PRODUCT,
      unitOfMeasureId: pieces.id,
      trackInventory: true,
      minStockLevel: 40,
      maxStockLevel: 400,
      reorderPoint: 80,
      standardCost: 125, // 125 AED
      listPrice: 180, // 180 AED
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.cogs.id,
      salesAccountId: accounts.partsRevenue.id,
      isSaleable: true,
      isPurchaseable: true,
      createdBy: userId
    }
  })

  const pistonKit = await prisma.item.create({
    data: {
      code: 'PST-001',
      name: 'Cummins Piston Kit 4089406',
      description: 'Complete piston kit with rings for QSK19 engine',
      categoryId: pistonParts.id,
      type: ItemType.PRODUCT,
      unitOfMeasureId: set.id,
      trackInventory: true,
      minStockLevel: 10,
      maxStockLevel: 50,
      reorderPoint: 15,
      standardCost: 2800, // 2,800 AED
      listPrice: 3850, // 3,850 AED
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.cogs.id,
      salesAccountId: accounts.partsRevenue.id,
      isSaleable: true,
      isPurchaseable: true,
      createdBy: userId
    }
  })

  const engineOil = await prisma.item.create({
    data: {
      code: 'LUB-001',
      name: 'Shell Rimula R4 X 15W-40',
      description: 'Heavy duty diesel engine oil - 20L drum',
      categoryId: lubricants.id,
      type: ItemType.PRODUCT,
      unitOfMeasureId: liter.id,
      trackInventory: true,
      minStockLevel: 200,
      maxStockLevel: 2000,
      reorderPoint: 400,
      standardCost: 280, // 280 AED per 20L
      listPrice: 385, // 385 AED per 20L
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.cogs.id,
      salesAccountId: accounts.partsRevenue.id,
      isSaleable: true,
      isPurchaseable: true,
      createdBy: userId
    }
  })

  const coolant = await prisma.item.create({
    data: {
      code: 'LUB-002',
      name: 'CAT Extended Life Coolant',
      description: 'Premium coolant concentrate - 20L',
      categoryId: lubricants.id,
      type: ItemType.PRODUCT,
      unitOfMeasureId: liter.id,
      trackInventory: true,
      minStockLevel: 100,
      maxStockLevel: 1000,
      reorderPoint: 200,
      standardCost: 165, // 165 AED per 20L
      listPrice: 225, // 225 AED per 20L
      inventoryAccountId: accounts.inventory.id,
      cogsAccountId: accounts.cogs.id,
      salesAccountId: accounts.partsRevenue.id,
      isSaleable: true,
      isPurchaseable: true,
      createdBy: userId
    }
  })

  // Service items (non-inventory)
  const preventiveMaintenance = await prisma.item.create({
    data: {
      code: 'SRV-001',
      name: 'Preventive Maintenance - 250 Hours',
      description: '250-hour preventive maintenance service for diesel engines',
      categoryId: services.id,
      type: ItemType.SERVICE,
      unitOfMeasureId: hour.id,
      trackInventory: false,
      standardCost: 800, // 800 AED per service
      listPrice: 1200, // 1,200 AED per service
      salesAccountId: accounts.serviceRevenue.id,
      isSaleable: true,
      isPurchaseable: false,
      createdBy: userId
    }
  })

  const engineOverhaul = await prisma.item.create({
    data: {
      code: 'SRV-002',
      name: 'Engine Overhaul Service',
      description: 'Complete engine overhaul including parts and labor',
      categoryId: services.id,
      type: ItemType.SERVICE,
      unitOfMeasureId: pieces.id,
      trackInventory: false,
      standardCost: 25000, // 25,000 AED
      listPrice: 35000, // 35,000 AED
      salesAccountId: accounts.serviceRevenue.id,
      isSaleable: true,
      isPurchaseable: false,
      createdBy: userId
    }
  })

  const emergencyRepair = await prisma.item.create({
    data: {
      code: 'SRV-003',
      name: 'Emergency Repair Service',
      description: '24/7 emergency repair service - per hour',
      categoryId: services.id,
      type: ItemType.SERVICE,
      unitOfMeasureId: hour.id,
      trackInventory: false,
      standardCost: 350, // 350 AED per hour
      listPrice: 500, // 500 AED per hour
      salesAccountId: accounts.serviceRevenue.id,
      isSaleable: true,
      isPurchaseable: false,
      createdBy: userId
    }
  })

  return {
    units: { pieces, set, liter, kg, hour },
    categories: { engineParts, filters, pistonParts, lubricants, services },
    items: { 
      oilFilter, 
      fuelFilter, 
      pistonKit, 
      engineOil, 
      coolant, 
      preventiveMaintenance, 
      engineOverhaul,
      emergencyRepair 
    }
  }
}

async function createQuotations(
  salesId: string, 
  customers: any, 
  items: any
) {
  // Quotation for DP World - Annual maintenance
  const quotationDPWorld = await prisma.quotation.create({
    data: {
      quotationNumber: 'Q-2024-001',
      customerId: customers.dpWorld.id,
      salesCaseId: null, // Link to sales case if needed
      createdBy: salesId
    }
  })

  const versionDPWorld = await prisma.quotationVersion.create({
    data: {
      quotationId: quotationDPWorld.id,
      versionNumber: 1,
      date: new Date('2024-01-15'),
      validUntil: new Date('2024-02-15'),
      currency: 'AED',
      exchangeRate: 1,
      paymentTerms: '60 days net',
      deliveryTerms: 'On-site service at Jebel Ali Port',
      notes: 'Annual maintenance contract for 50 container handling equipment',
      termsAndConditions: 'Standard service terms apply. 24/7 emergency support included.',
      status: QuotationStatus.SENT,
      isCurrent: true,
      createdBy: salesId,
      items: {
        create: [
          {
            itemId: items.preventiveMaintenance.id,
            description: 'Quarterly preventive maintenance - 50 engines x 4 quarters',
            quantity: 200,
            unitPrice: 1200,
            discountPercent: 15, // Volume discount
            taxRate: 5, // UAE VAT
            sortOrder: 1
          },
          {
            itemId: items.oilFilter.id,
            description: 'Oil filters for quarterly changes',
            quantity: 200,
            unitPrice: 120,
            discountPercent: 20, // Bulk discount
            taxRate: 5,
            sortOrder: 2
          },
          {
            itemId: items.fuelFilter.id,
            description: 'Fuel filters for quarterly changes',
            quantity: 200,
            unitPrice: 180,
            discountPercent: 20, // Bulk discount
            taxRate: 5,
            sortOrder: 3
          },
          {
            itemId: items.engineOil.id,
            description: 'Engine oil for services - 20L drums',
            quantity: 400, // 400 x 20L
            unitPrice: 385,
            discountPercent: 25, // Volume discount
            taxRate: 5,
            sortOrder: 4
          },
          {
            itemId: items.emergencyRepair.id,
            description: 'Emergency repair hours (estimated)',
            quantity: 100,
            unitPrice: 500,
            discountPercent: 0,
            taxRate: 5,
            sortOrder: 5
          }
        ]
      }
    }
  })

  // Quotation for RAK Cement - Engine overhaul
  const quotationRAK = await prisma.quotation.create({
    data: {
      quotationNumber: 'Q-2024-002',
      customerId: customers.rakCement.id,
      createdBy: salesId
    }
  })

  const versionRAK = await prisma.quotationVersion.create({
    data: {
      quotationId: quotationRAK.id,
      versionNumber: 1,
      date: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      currency: 'AED',
      exchangeRate: 1,
      paymentTerms: '30 days net',
      deliveryTerms: 'Service at RAK Cement facility',
      notes: 'Complete overhaul of 3 backup generator engines',
      status: QuotationStatus.DRAFT,
      isCurrent: true,
      createdBy: salesId,
      items: {
        create: [
          {
            itemId: items.engineOverhaul.id,
            description: 'Complete engine overhaul - CAT 3512B generators',
            quantity: 3,
            unitPrice: 35000,
            discountPercent: 10,
            taxRate: 5,
            sortOrder: 1
          },
          {
            itemId: items.pistonKit.id,
            description: 'Piston kits for overhaul',
            quantity: 36, // 12 cylinders x 3 engines
            unitPrice: 3850,
            discountPercent: 15,
            taxRate: 5,
            sortOrder: 2
          },
          {
            itemId: items.coolant.id,
            description: 'Coolant refill after overhaul - 20L drums',
            quantity: 15,
            unitPrice: 225,
            discountPercent: 10,
            taxRate: 5,
            sortOrder: 3
          }
        ]
      }
    }
  })

  return { quotationDPWorld, quotationRAK }
}

async function createStockMovements(warehouseId: string, items: any) {
  // Opening stock for filters
  await prisma.stockMovement.create({
    data: {
      movementNumber: 'OPEN-0001',
      itemId: items.oilFilter.id,
      movementType: MovementType.OPENING,
      movementDate: new Date('2024-01-01'),
      quantity: 250,
      unitCost: 85,
      totalCost: 21250,
      unitOfMeasureId: items.oilFilter.unitOfMeasureId,
      notes: 'Opening stock balance',
      createdBy: warehouseId,
      stockLot: {
        create: {
          lotNumber: 'LOT-OFL-001',
          itemId: items.oilFilter.id,
          receivedDate: new Date('2024-01-01'),
          receivedQty: 250,
          availableQty: 250,
          unitCost: 85,
          totalCost: 21250,
          createdBy: warehouseId
        }
      }
    }
  })

  await prisma.stockMovement.create({
    data: {
      movementNumber: 'OPEN-0002',
      itemId: items.fuelFilter.id,
      movementType: MovementType.OPENING,
      movementDate: new Date('2024-01-01'),
      quantity: 200,
      unitCost: 125,
      totalCost: 25000,
      unitOfMeasureId: items.fuelFilter.unitOfMeasureId,
      notes: 'Opening stock balance',
      createdBy: warehouseId,
      stockLot: {
        create: {
          lotNumber: 'LOT-FFL-001',
          itemId: items.fuelFilter.id,
          receivedDate: new Date('2024-01-01'),
          receivedQty: 200,
          availableQty: 200,
          unitCost: 125,
          totalCost: 25000,
          createdBy: warehouseId
        }
      }
    }
  })

  // Stock in for engine oil from ENOC
  await prisma.stockMovement.create({
    data: {
      movementNumber: 'SIN-0001',
      itemId: items.engineOil.id,
      movementType: MovementType.STOCK_IN,
      movementDate: new Date('2024-01-10'),
      quantity: 1000, // 1000 liters (50 x 20L drums)
      unitCost: 14, // 280 AED per 20L = 14 AED per liter
      totalCost: 14000,
      unitOfMeasureId: items.engineOil.unitOfMeasureId,
      referenceType: 'PURCHASE',
      referenceNumber: 'PO-2024-001',
      supplier: 'ENOC Lubricants',
      notes: 'Monthly stock replenishment',
      createdBy: warehouseId,
      stockLot: {
        create: {
          lotNumber: 'LOT-OIL-001',
          itemId: items.engineOil.id,
          receivedDate: new Date('2024-01-10'),
          receivedQty: 1000,
          availableQty: 1000,
          unitCost: 14,
          totalCost: 14000,
          supplier: 'ENOC Lubricants',
          purchaseRef: 'PO-2024-001',
          expiryDate: new Date('2026-01-10'), // 2 year shelf life
          createdBy: warehouseId
        }
      }
    }
  })

  // Stock in for piston kits from Cummins
  await prisma.stockMovement.create({
    data: {
      movementNumber: 'SIN-0002',
      itemId: items.pistonKit.id,
      movementType: MovementType.STOCK_IN,
      movementDate: new Date('2024-01-05'),
      quantity: 20,
      unitCost: 2800,
      totalCost: 56000,
      unitOfMeasureId: items.pistonKit.unitOfMeasureId,
      referenceType: 'PURCHASE',
      referenceNumber: 'PO-2024-002',
      supplier: 'Cummins Arabia',
      notes: 'Piston kits for upcoming overhauls',
      createdBy: warehouseId,
      stockLot: {
        create: {
          lotNumber: 'LOT-PST-001',
          itemId: items.pistonKit.id,
          receivedDate: new Date('2024-01-05'),
          receivedQty: 20,
          availableQty: 20,
          unitCost: 2800,
          totalCost: 56000,
          supplier: 'Cummins Arabia',
          purchaseRef: 'PO-2024-002',
          createdBy: warehouseId
        }
      }
    }
  })

  // Stock out for service job
  await prisma.stockMovement.create({
    data: {
      movementNumber: 'SOUT-0001',
      itemId: items.oilFilter.id,
      movementType: MovementType.STOCK_OUT,
      movementDate: new Date('2024-01-20'),
      quantity: -10,
      unitCost: 85,
      totalCost: 850,
      unitOfMeasureId: items.oilFilter.unitOfMeasureId,
      referenceType: 'SERVICE',
      referenceNumber: 'SRV-2024-001',
      customer: 'DP World',
      notes: 'Used for preventive maintenance',
      createdBy: warehouseId
    }
  })

  // Update stock lot available quantity
  await prisma.stockLot.updateMany({
    where: {
      itemId: items.oilFilter.id,
      lotNumber: 'LOT-OFL-001'
    },
    data: {
      availableQty: 240 // 250 - 10
    }
  })

  // Stock adjustment for damaged coolant
  await prisma.stockMovement.create({
    data: {
      movementNumber: 'ADJ-0001',
      itemId: items.coolant.id,
      movementType: MovementType.ADJUSTMENT,
      movementDate: new Date('2024-01-25'),
      quantity: -40, // 2 drums damaged
      unitCost: 8.25, // 165 AED per 20L = 8.25 per liter
      totalCost: 330,
      unitOfMeasureId: items.coolant.unitOfMeasureId,
      referenceType: 'ADJUSTMENT',
      referenceNumber: 'ADJ-2024-001',
      notes: 'Damaged during storage - container leak',
      createdBy: warehouseId
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
      currency: 'AED',
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
        debitAmount: 500000, // 500,000 AED
        creditAmount: 0,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 500000,
        baseCreditAmount: 0
      },
      {
        journalEntryId: openingEntry.id,
        accountId: accounts.bankUAE.id,
        description: 'Opening bank balance',
        debitAmount: 2500000, // 2.5 million AED
        creditAmount: 0,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 2500000,
        baseCreditAmount: 0
      },
      {
        journalEntryId: openingEntry.id,
        accountId: accounts.inventory.id,
        description: 'Opening inventory',
        debitAmount: 800000, // 800,000 AED
        creditAmount: 0,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 800000,
        baseCreditAmount: 0
      },
      {
        journalEntryId: openingEntry.id,
        accountId: accounts.equipment.id,
        description: 'Service equipment and tools',
        debitAmount: 1200000, // 1.2 million AED
        creditAmount: 0,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 1200000,
        baseCreditAmount: 0
      },
      {
        journalEntryId: openingEntry.id,
        accountId: accounts.capitalStock.id,
        description: 'Share capital',
        debitAmount: 0,
        creditAmount: 5000000, // 5 million AED
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: 5000000
      }
    ]
  })

  // Monthly workshop rent payment
  const rentEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE2024-0002',
      date: new Date('2024-01-05'),
      description: 'Workshop rent payment - January',
      reference: 'RENT-JAN-2024',
      currency: 'AED',
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
        description: 'Workshop rent - Mussafah',
        debitAmount: 35000, // 35,000 AED per month
        creditAmount: 0,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 35000,
        baseCreditAmount: 0
      },
      {
        journalEntryId: rentEntry.id,
        accountId: accounts.bankUAE.id,
        description: 'Bank transfer for rent',
        debitAmount: 0,
        creditAmount: 35000,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: 35000
      }
    ]
  })

  // Service revenue transaction with VAT
  const serviceEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE2024-0003',
      date: new Date('2024-01-20'),
      description: 'Service invoice #INV-2024-001 - DP World',
      reference: 'INV-2024-001',
      currency: 'AED',
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
        journalEntryId: serviceEntry.id,
        accountId: accounts.accountsReceivable.id,
        description: 'Invoice to DP World',
        debitAmount: 157500, // 150,000 + 5% VAT
        creditAmount: 0,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 157500,
        baseCreditAmount: 0
      },
      {
        journalEntryId: serviceEntry.id,
        accountId: accounts.serviceRevenue.id,
        description: 'Service revenue',
        debitAmount: 0,
        creditAmount: 150000,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: 150000
      },
      {
        journalEntryId: serviceEntry.id,
        accountId: accounts.vatPayable.id,
        description: 'VAT 5%',
        debitAmount: 0,
        creditAmount: 7500,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: 7500
      }
    ]
  })

  // Parts purchase from supplier
  const purchaseEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE2024-0004',
      date: new Date('2024-01-10'),
      description: 'Purchase invoice - Cummins Arabia',
      reference: 'PINV-2024-001',
      currency: 'AED',
      exchangeRate: 1,
      status: JournalStatus.POSTED,
      postedAt: new Date('2024-01-10'),
      postedBy: accountantId,
      createdBy: accountantId
    }
  })

  await prisma.journalLine.createMany({
    data: [
      {
        journalEntryId: purchaseEntry.id,
        accountId: accounts.inventory.id,
        description: 'Engine parts purchase',
        debitAmount: 56000,
        creditAmount: 0,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 56000,
        baseCreditAmount: 0
      },
      {
        journalEntryId: purchaseEntry.id,
        accountId: accounts.vatPayable.id,
        description: 'Input VAT 5%',
        debitAmount: 2800,
        creditAmount: 0,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 2800,
        baseCreditAmount: 0
      },
      {
        journalEntryId: purchaseEntry.id,
        accountId: accounts.accountsPayable.id,
        description: 'Payable to Cummins Arabia',
        debitAmount: 0,
        creditAmount: 58800,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: 58800
      }
    ]
  })

  // Salary payment
  const salaryEntry = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE2024-0005',
      date: new Date('2024-01-31'),
      description: 'Monthly salaries - January',
      reference: 'SAL-JAN-2024',
      currency: 'AED',
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
        description: 'Technical staff salaries',
        debitAmount: 185000, // 185,000 AED
        creditAmount: 0,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 185000,
        baseCreditAmount: 0
      },
      {
        journalEntryId: salaryEntry.id,
        accountId: accounts.bankUAE.id,
        description: 'Salary payments',
        debitAmount: 0,
        creditAmount: 185000,
        currency: 'AED',
        exchangeRate: 1,
        baseDebitAmount: 0,
        baseCreditAmount: 185000
      }
    ]
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
    console.warn('✅ UAE Diesel Engine Maintenance seed completed successfully')
    process.exit(0)
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })