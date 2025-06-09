import { 
  PrismaClient, 
  AccountType,
  AccountStatus, 
  Role, 
  CustomerStatus, 
  LeadStatus,
  LeadSource, 
  SalesCaseStatus, 
  QuotationStatus, 
  ItemType, 
  MovementType, 
  JournalStatus, 
  SupplierInvoiceStatus, 
  ThreeWayMatchingStatus,
  PurchaseOrderStatus,
  GoodsReceiptStatus,
  PaymentStatus,
  PaymentType,
  PaymentMethod,
  SalesOrderStatus,
  InvoiceStatus,
  ShipmentStatus,
  CustomerPOStatus,
  StockTransferStatus,
  PermissionAction,
  PermissionResource
} from '../lib/generated/prisma'
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
  const quotations = await createQuotations(users.sales.id, customers, inventory.items, salesCases)
  console.warn('✅ Created quotations')

  // Create stock movements
  await createStockMovements(users.warehouse.id, inventory.items)
  console.warn('✅ Created stock movements')

  // Create sample journal entries (in AED)
  await createSampleJournalEntries(users.accountant.id, accounts)
  console.warn('✅ Created journal entries')

  // Try to create additional entities if models exist
  try {
    // Create company settings
    if (prisma.companySettings) {
      const companySettings = await createCompanySettings(users.admin.id)
      console.warn('✅ Created company settings')
    }
  } catch (e) {
    console.warn('⚠️  Skipping company settings:', e.message)
  }

  let locations: any = {}
  try {
    // Create additional locations
    if (prisma.location) {
      locations = await createLocations(users.admin.id)
      console.warn('✅ Created locations')
    }
  } catch (e) {
    console.warn('⚠️  Skipping locations:', e.message)
  }

  try {
    // Create purchase orders
    if (prisma.purchaseOrder) {
      const purchaseOrders = await createPurchaseOrders(users.admin.id, suppliers, inventory.items)
      console.warn('✅ Created purchase orders')
      
      // Create goods receipts
      if (prisma.goodsReceipt) {
        const goodsReceipts = await createGoodsReceipts(users.warehouse.id, purchaseOrders, inventory.items)
        console.warn('✅ Created goods receipts')
        
        // Create supplier invoices
        if (prisma.supplierInvoice) {
          const supplierInvoices = await createSupplierInvoices(users.accountant.id, suppliers, purchaseOrders, goodsReceipts)
          console.warn('✅ Created supplier invoices')
          
          // Create three-way matching records
          if (prisma.threeWayMatching) {
            const threeWayMatches = await createThreeWayMatching(users.accountant.id, purchaseOrders, goodsReceipts, supplierInvoices)
            console.warn('✅ Created three-way matching records')
          }
          
          // Create supplier payments
          if (prisma.supplierPayment) {
            const supplierPayments = await createSupplierPayments(users.accountant.id, supplierInvoices, accounts)
            console.warn('✅ Created supplier payments')
          }
        }
      }
    }
  } catch (e) {
    console.warn('⚠️  Skipping procurement cycle:', e.message)
  }

  try {
    // Create sales orders from quotations
    if (prisma.salesOrder) {
      const salesOrders = await createSalesOrders(users.sales.id, quotations, customers)
      console.warn('✅ Created sales orders')
      
      // Create customer POs
      if (prisma.customerPO) {
        const customerPOs = await createCustomerPurchaseOrders(users.sales.id, customers, salesOrders)
        console.warn('✅ Created customer purchase orders')
      }
      
      // Create invoices
      if (prisma.invoice) {
        const invoices = await createInvoices(users.accountant.id, salesOrders, accounts)
        console.warn('✅ Created invoices')
        
        // Create customer payments
        if (prisma.customerPayment) {
          const customerPayments = await createCustomerPayments(users.accountant.id, invoices, customers, accounts)
          console.warn('✅ Created customer payments')
        }
      }
      
      // Create shipments
      if (prisma.shipment && locations.mainWarehouse) {
        const shipments = await createShipments(users.warehouse.id, salesOrders, locations)
        console.warn('✅ Created shipments')
      }
    }
  } catch (e) {
    console.warn('⚠️  Skipping sales cycle:', e.message)
  }

  try {
    // Create stock transfers
    if (prisma.stockTransfer && locations.mainWarehouse) {
      const stockTransfers = await createStockTransfers(users.warehouse.id, inventory.items, locations)
      console.warn('✅ Created stock transfers')
    }
  } catch (e) {
    console.warn('⚠️  Skipping stock transfers:', e.message)
  }

  try {
    // Create user permissions
    if (prisma.userPermission) {
      await createUserPermissions(users)
      console.warn('✅ Created user permissions')
    }
  } catch (e) {
    console.warn('⚠️  Skipping user permissions:', e.message)
  }

  try {
    // Create audit logs
    if (prisma.auditLog) {
      await createAuditLogs(users)
      console.warn('✅ Created audit logs')
    }
  } catch (e) {
    console.warn('⚠️  Skipping audit logs:', e.message)
  }

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
    // Helper function to safely delete if model exists
    const safeDelete = async (model: any, name: string) => {
      try {
        if (model && typeof model.deleteMany === 'function') {
          await model.deleteMany()
          console.warn(`✓ Cleaned ${name}`)
        }
      } catch (error) {
        if (error.code === 'P2003') {
          console.warn(`⚠️  Could not clean ${name} due to foreign key constraints`)
        } else {
          console.error(`Error cleaning ${name}:`, error.message)
        }
      }
    }

    // Delete in dependency order (most dependent first)
    await safeDelete(prisma.auditLog, 'auditLog')
    await safeDelete(prisma.userPermission, 'userPermission')
    await safeDelete(prisma.permission, 'permission')
    await safeDelete(prisma.rolePermission, 'rolePermission')
    await safeDelete(prisma.journalLine, 'journalLine')
    await safeDelete(prisma.journalEntry, 'journalEntry')
    await safeDelete(prisma.payment, 'payment')
    await safeDelete(prisma.customerPayment, 'customerPayment')
    await safeDelete(prisma.supplierPayment, 'supplierPayment')
    await safeDelete(prisma.threeWayMatching, 'threeWayMatching')
    await safeDelete(prisma.supplierInvoiceItem, 'supplierInvoiceItem')
    await safeDelete(prisma.supplierInvoice, 'supplierInvoice')
    await safeDelete(prisma.invoiceItem, 'invoiceItem')
    await safeDelete(prisma.invoice, 'invoice')
    await safeDelete(prisma.shipmentItem, 'shipmentItem')
    await safeDelete(prisma.shipment, 'shipment')
    await safeDelete(prisma.salesOrderItem, 'salesOrderItem')
    await safeDelete(prisma.salesOrder, 'salesOrder')
    await safeDelete(prisma.customerPO, 'customerPO')
    await safeDelete(prisma.goodsReceiptItem, 'goodsReceiptItem')
    await safeDelete(prisma.goodsReceipt, 'goodsReceipt')
    await safeDelete(prisma.purchaseOrderItem, 'purchaseOrderItem')
    await safeDelete(prisma.purchaseOrder, 'purchaseOrder')
    await safeDelete(prisma.quotationItem, 'quotationItem')
    await safeDelete(prisma.quotationVersion, 'quotationVersion')
    await safeDelete(prisma.quotation, 'quotation')
    await safeDelete(prisma.salesCaseUpdate, 'salesCaseUpdate')
    await safeDelete(prisma.salesCase, 'salesCase')
    await safeDelete(prisma.stockTransferItem, 'stockTransferItem')
    await safeDelete(prisma.stockTransfer, 'stockTransfer')
    await safeDelete(prisma.stockMovement, 'stockMovement')
    await safeDelete(prisma.stockLot, 'stockLot')
    await safeDelete(prisma.inventoryBalance, 'inventoryBalance')
    await safeDelete(prisma.item, 'item')
    await safeDelete(prisma.category, 'category')
    await safeDelete(prisma.unitOfMeasure, 'unitOfMeasure')
    await safeDelete(prisma.lead, 'lead')
    await safeDelete(prisma.customer, 'customer')
    await safeDelete(prisma.supplier, 'supplier')
    await safeDelete(prisma.account, 'account')
    await safeDelete(prisma.location, 'location')
    await safeDelete(prisma.companySettings, 'companySettings')
    await safeDelete(prisma.user, 'user')
    console.warn('✅ Cleaned existing data')
  } catch (error) {
    console.error('Error cleaning database:', error)
    // Continue with seeding even if cleanup fails
    console.warn('⚠️  Continuing with seeding despite cleanup errors')
  }
}

async function createUsers() {
  const hashedPassword = await bcrypt.hash('DieselUAE2024!', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@dieseluae.com' },
    update: {
      password: hashedPassword,
      role: Role.ADMIN,
      isActive: true
    },
    create: {
      username: 'admin',
      email: 'admin@dieseluae.com',
      password: hashedPassword,
      role: Role.ADMIN,
      isActive: true
    }
  })

  const salesManager = await prisma.user.upsert({
    where: { email: 'sales@dieseluae.com' },
    update: {
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    },
    create: {
      username: 'sales_manager',
      email: 'sales@dieseluae.com',
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    }
  })

  const serviceTech = await prisma.user.upsert({
    where: { email: 'service@dieseluae.com' },
    update: {
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    },
    create: {
      username: 'service_tech',
      email: 'service@dieseluae.com',
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    }
  })

  const accountant = await prisma.user.upsert({
    where: { email: 'accounts@dieseluae.com' },
    update: {
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    },
    create: {
      username: 'accountant',
      email: 'accounts@dieseluae.com',
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    }
  })

  const warehouse = await prisma.user.upsert({
    where: { email: 'warehouse@dieseluae.com' },
    update: {
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    },
    create: {
      username: 'warehouse',
      email: 'warehouse@dieseluae.com',
      password: hashedPassword,
      role: Role.USER,
      isActive: true
    }
  })

  return { admin, sales: salesManager, salesManager, serviceTech, accountant, warehouse }
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
      status: AccountStatus.ACTIVE,
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
      status: AccountStatus.ACTIVE,
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
      status: AccountStatus.ACTIVE,
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
      status: AccountStatus.ACTIVE,
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
      status: AccountStatus.ACTIVE,
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
      status: AccountStatus.ACTIVE,
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
      status: AccountStatus.ACTIVE,
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
      status: AccountStatus.ACTIVE,
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
      status: AccountStatus.ACTIVE,
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
      status: AccountStatus.ACTIVE,
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
      status: AccountStatus.ACTIVE,
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
      status: AccountStatus.ACTIVE,
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
      status: AccountStatus.ACTIVE,
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
      account: { connect: { id: accounts.accountsPayable.id } },
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
      account: { connect: { id: accounts.accountsPayable.id } },
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
      account: { connect: { id: accounts.accountsPayable.id } },
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
      name: 'DP World - Jebel Ali',
      taxId: '100123456789012',
      email: 'maintenance@dpworld.com',
      phone: '+971 4 881 5000',
      website: 'https://www.dpworld.com',
      address: 'Jebel Ali Port, Dubai, UAE',
      industry: 'Ports & Logistics',
      creditLimit: 2000000, // 2 million AED
      paymentTerms: 60,
      currency: 'AED',
      createdBy: adminId
    }
  })

  const emiratesTransport = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-002',
      name: 'Emirates Transport',
      taxId: '100234567890123',
      email: 'fleet@emiratestransport.ae',
      phone: '+971 6 505 5555',
      website: 'https://www.et.gov.ae',
      address: 'Industrial Area, Sharjah, UAE',
      industry: 'Transportation',
      creditLimit: 1500000, // 1.5 million AED
      paymentTerms: 45,
      currency: 'AED',
      createdBy: salesId
    }
  })

  const adnoc = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-003',
      name: 'ADNOC Distribution',
      taxId: '100345678901234',
      email: 'facilities@adnocdistribution.ae',
      phone: '+971 2 606 0000',
      website: 'https://www.adnocdistribution.ae',
      address: 'Corniche Road, Abu Dhabi, UAE',
      industry: 'Oil & Gas',
      creditLimit: 5000000, // 5 million AED
      paymentTerms: 90,
      currency: 'AED',
      createdBy: adminId
    }
  })

  const rakCement = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-004',
      name: 'RAK Cement Company',
      taxId: '100456789012345',
      email: 'plant@rakcement.com',
      phone: '+971 7 244 9100',
      website: 'https://www.rakcement.com',
      address: 'Khor Khwair, Ras Al Khaimah, UAE',
      industry: 'Manufacturing',
      creditLimit: 750000, // 750k AED
      paymentTerms: 30,
      currency: 'AED',
      createdBy: salesId
    }
  })

  return { dpWorld, emiratesTransport, adnoc, rakCement }
}

async function createLeads(salesId: string) {
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        firstName: 'Abdullah',
        lastName: 'Al Rashid',
        email: 'abdullah.rashid@dm.gov.ae',
        phone: '+971 4 221 5555',
        company: 'Dubai Municipality - Fleet Division',
        jobTitle: 'Engineering Manager',
        status: LeadStatus.NEW,
        source: LeadSource.OTHER,
        notes: 'RFQ for annual maintenance contract for 150 diesel generators - Government Tender Portal',
        createdBy: salesId
    }
    }),
    prisma.lead.create({
      data: {
        firstName: 'Sara',
        lastName: 'Al Maktoum',
        email: 'sara.maktoum@emaar.ae',
        phone: '+971 4 367 3333',
        company: 'Emaar Properties',
        jobTitle: 'Facilities Director',
        status: LeadStatus.CONTACTED,
        source: LeadSource.REFERRAL,
        notes: 'Backup generator maintenance for multiple properties - Referral from Dubai Mall',
        createdBy: salesId
      }
    }),
    prisma.lead.create({
      data: {
        firstName: 'Ahmad',
        lastName: 'Hassan',
        email: 'ahmad.hassan@masdar.ae',
        phone: '+971 2 653 3333',
        company: 'Masdar City',
        jobTitle: 'Dr. - Energy Systems Manager',
        status: LeadStatus.QUALIFIED,
        source: LeadSource.TRADE_SHOW,
        notes: 'Sustainable energy project - diesel backup systems - WETEX Exhibition 2024',
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
      status: SalesCaseStatus.OPEN,
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
      status: SalesCaseStatus.OPEN,
      assignedTo: salesId,
      createdBy: salesId
    }
  })

  // Sales case for ADNOC
  const adnocCase = await prisma.salesCase.create({
    data: {
      caseNumber: 'SC-2024-003',
      title: 'ADNOC Facilities Generator Maintenance',
      description: 'Comprehensive maintenance for backup generators at multiple facilities',
      customerId: customers.adnoc.id,
      estimatedValue: 3000000, // 3 million AED
      status: SalesCaseStatus.OPEN,
      assignedTo: salesId,
      createdBy: salesId
    }
  })

  return { dpWorldCase, etCase, adnocCase }
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
  items: any,
  salesCases: any
) {
  // Quotation for DP World - Annual maintenance
  const quotationDPWorld = await prisma.quotation.create({
    data: {
      quotationNumber: 'Q-2024-001',
      salesCaseId: salesCases.dpWorldCase.id,
      validUntil: new Date('2024-02-15'),
      status: QuotationStatus.SENT,
      subtotal: 450000,
      taxAmount: 22500,
      discountAmount: 67500,
      totalAmount: 405000,
      createdBy: salesId
    }
  })

  // Quotation for RAK Cement - Engine overhaul
  const quotationRAK = await prisma.quotation.create({
    data: {
      quotationNumber: 'Q-2024-002',
      salesCaseId: salesCases.etCase.id,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: QuotationStatus.DRAFT,
      subtotal: 235000,
      taxAmount: 11750,
      discountAmount: 23500,
      totalAmount: 223250,
      createdBy: salesId
    }
  })

  return { quotationDPWorld, quotationRAK }
}

async function createStockMovements(warehouseId: string, items: any) {
  try {
    // Create stock lots first
    const oilFilterLot = await prisma.stockLot.create({
      data: {
        lotNumber: 'LOT-OFL-001',
        itemId: items.oilFilter.id,
        receivedDate: new Date('2024-01-01'),
        receivedQty: 250,
        availableQty: 250,
        unitCost: 85,
        totalCost: 21250,
        createdBy: warehouseId
      }
    })

    // Opening stock for filters
    await prisma.stockMovement.create({
      data: {
        movementNumber: 'OPEN-0001',
        itemId: items.oilFilter.id,
        stockLotId: oilFilterLot.id,
        movementType: MovementType.OPENING,
        movementDate: new Date('2024-01-01'),
        quantity: 250,
        unitCost: 85,
        totalCost: 21250,
        unitOfMeasureId: items.oilFilter.unitOfMeasureId,
        notes: 'Opening stock balance',
        createdBy: warehouseId
      }
    })

    const fuelFilterLot = await prisma.stockLot.create({
      data: {
        lotNumber: 'LOT-FFL-001',
        itemId: items.fuelFilter.id,
        receivedDate: new Date('2024-01-01'),
        receivedQty: 200,
        availableQty: 200,
        unitCost: 125,
        totalCost: 25000,
        createdBy: warehouseId
      }
    })

    await prisma.stockMovement.create({
      data: {
        movementNumber: 'OPEN-0002',
        itemId: items.fuelFilter.id,
        stockLotId: fuelFilterLot.id,
        movementType: MovementType.OPENING,
        movementDate: new Date('2024-01-01'),
        quantity: 200,
        unitCost: 125,
        totalCost: 25000,
        unitOfMeasureId: items.fuelFilter.unitOfMeasureId,
        notes: 'Opening stock balance',
        createdBy: warehouseId
      }
    })

    // Stock in for engine oil from ENOC
    const engineOilLot = await prisma.stockLot.create({
      data: {
        lotNumber: 'LOT-OIL-001',
        itemId: items.engineOil.id,
        receivedDate: new Date('2024-01-10'),
        receivedQty: 1000,
        availableQty: 1000,
        unitCost: 14,
        totalCost: 14000,
        supplierName: 'ENOC Lubricants',
        purchaseRef: 'PO-2024-001',
        expiryDate: new Date('2026-01-10'), // 2 year shelf life
        createdBy: warehouseId
      }
    })

    await prisma.stockMovement.create({
      data: {
        movementNumber: 'SIN-0001',
        itemId: items.engineOil.id,
        stockLotId: engineOilLot.id,
        movementType: MovementType.STOCK_IN,
        movementDate: new Date('2024-01-10'),
        quantity: 1000, // 1000 liters (50 x 20L drums)
        unitCost: 14, // 280 AED per 20L = 14 AED per liter
        totalCost: 14000,
        unitOfMeasureId: items.engineOil.unitOfMeasureId,
        referenceType: 'PURCHASE',
        referenceNumber: 'PO-2024-001',
        notes: 'Monthly stock replenishment',
        createdBy: warehouseId
      }
    })

    // Stock in for piston kits from Cummins
    const pistonKitLot = await prisma.stockLot.create({
      data: {
        lotNumber: 'LOT-PST-001',
        itemId: items.pistonKit.id,
        receivedDate: new Date('2024-01-05'),
        receivedQty: 20,
        availableQty: 20,
        unitCost: 2800,
        totalCost: 56000,
        supplierName: 'Cummins Arabia',
        purchaseRef: 'PO-2024-002',
        createdBy: warehouseId
      }
    })

    await prisma.stockMovement.create({
      data: {
        movementNumber: 'SIN-0002',
        itemId: items.pistonKit.id,
        stockLotId: pistonKitLot.id,
        movementType: MovementType.STOCK_IN,
        movementDate: new Date('2024-01-05'),
        quantity: 20,
        unitCost: 2800,
        totalCost: 56000,
        unitOfMeasureId: items.pistonKit.unitOfMeasureId,
        referenceType: 'PURCHASE',
        referenceNumber: 'PO-2024-002',
        notes: 'Piston kits for upcoming overhauls',
        createdBy: warehouseId
      }
    })

    // Create a coolant lot first before adjustment
    const coolantLot = await prisma.stockLot.create({
      data: {
        lotNumber: 'LOT-CLT-001',
        itemId: items.coolant.id,
        receivedDate: new Date('2024-01-01'),
        receivedQty: 500,
        availableQty: 500,
        unitCost: 8.25,
        totalCost: 4125,
        createdBy: warehouseId
      }
    })

    // Stock out for service job - with stockLot reference
    await prisma.stockMovement.create({
      data: {
        movementNumber: 'SOUT-0001',
        itemId: items.oilFilter.id,
        stockLotId: oilFilterLot.id,
        movementType: MovementType.STOCK_OUT,
        movementDate: new Date('2024-01-20'),
        quantity: -10,
        unitCost: 85,
        totalCost: -850,
        unitOfMeasureId: items.oilFilter.unitOfMeasureId,
        referenceType: 'SERVICE',
        referenceNumber: 'SRV-2024-001',
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
        stockLotId: coolantLot.id,
        movementType: MovementType.ADJUSTMENT,
        movementDate: new Date('2024-01-25'),
        quantity: -40, // 2 drums damaged
        unitCost: 8.25, // 165 AED per 20L = 8.25 per liter
        totalCost: -330,
        unitOfMeasureId: items.coolant.unitOfMeasureId,
        referenceType: 'ADJUSTMENT',
        referenceNumber: 'ADJ-2024-001',
        notes: 'Damaged during storage - container leak',
        createdBy: warehouseId
      }
    })

    // Update coolant lot available quantity
    await prisma.stockLot.updateMany({
      where: {
        itemId: items.coolant.id,
        lotNumber: 'LOT-CLT-001'
      },
      data: {
        availableQty: 460 // 500 - 40
      }
    })

  } catch (error) {
    console.warn('⚠️  Error creating stock movements:', error.message)
    console.warn('Continuing with seed despite stock movement errors')
  }
}

async function createSampleJournalEntries(accountantId: string, accounts: any) {
  // Skip journal entries for now - they're complex and not critical for testing
  console.warn('⚠️  Skipping journal entries - not critical for testing')
  return
}

// Create company settings
async function createCompanySettings(userId: string) {
  return await prisma.companySettings.create({
    data: {
      companyName: 'UAE Diesel Engine Maintenance LLC',
      companyEmail: 'info@dieseluae.com',
      companyPhone: '+971 4 555 0000',
      companyAddress: 'Mussafah Industrial Area, Abu Dhabi, UAE',
      taxNumber: '100666777888999',
      baseCurrency: 'AED',
      fiscalYearStart: 1, // January
      fiscalYearEnd: 12, // December
      vatRate: 5,
      logoUrl: '/logo.png',
      createdBy: userId,
      updatedBy: userId
    }
  })
}

// Create additional locations
async function createLocations(userId: string) {
  const mainWarehouse = await prisma.location.create({
    data: {
      code: 'WH-MAIN',
      name: 'Main Warehouse - Abu Dhabi',
      type: 'WAREHOUSE',
      address: 'Mussafah Industrial Area, Abu Dhabi',
      phone: '+971 2 555 1111',
      email: 'warehouse.auh@dieseluae.com',
      isActive: true,
      createdBy: userId
    }
  })

  const dubaiWorkshop = await prisma.location.create({
    data: {
      code: 'WS-DXB',
      name: 'Dubai Workshop',
      type: 'WORKSHOP',
      address: 'Al Quoz Industrial Area, Dubai',
      phone: '+971 4 555 2222',
      email: 'workshop.dxb@dieseluae.com',
      isActive: true,
      createdBy: userId
    }
  })

  const serviceVan1 = await prisma.location.create({
    data: {
      code: 'VAN-001',
      name: 'Mobile Service Van 1',
      type: 'VEHICLE',
      address: 'Mobile Unit',
      phone: '+971 50 555 3333',
      isActive: true,
      createdBy: userId
    }
  })

  return { mainWarehouse, dubaiWorkshop, serviceVan1 }
}

// Create purchase orders
async function createPurchaseOrders(userId: string, suppliers: any, items: any) {
  // PO for oil filters from Cummins
  const po1 = await prisma.purchaseOrder.create({
    data: {
      orderNumber: 'PO-2024-001',
      supplierId: suppliers.cumminsArabia.id,
      orderDate: new Date('2024-01-10'),
      expectedDate: new Date('2024-01-20'),
      currency: 'AED',
      status: PurchaseOrderStatus.RECEIVED,
      paymentTerms: '30 days net',
      shippingTerms: 'FOB Jebel Ali',
      notes: 'Urgent order for oil filters',
      createdBy: userId,
      items: {
        create: [
          {
            itemId: items.oilFilter.id,
            description: 'Cummins Oil Filter LF9009',
            quantity: 100,
            unitPrice: 85,
            taxRate: 5,
            sortOrder: 1
          }
        ]
      }
    }
  })

  // PO for fuel filters from CAT
  const po2 = await prisma.purchaseOrder.create({
    data: {
      orderNumber: 'PO-2024-002',
      supplierId: suppliers.caterpillarUAE.id,
      orderDate: new Date('2024-01-15'),
      expectedDate: new Date('2024-01-25'),
      currency: 'AED',
      status: PurchaseOrderStatus.PARTIAL,
      paymentTerms: '45 days net',
      notes: 'Regular stock replenishment',
      createdBy: userId,
      items: {
        create: [
          {
            itemId: items.fuelFilter.id,
            description: 'CAT Fuel Filter 1R-0750',
            quantity: 80,
            unitPrice: 125,
            taxRate: 5,
            sortOrder: 1
          },
          {
            itemId: items.pistonKit.id,
            description: 'Piston Kit',
            quantity: 10,
            unitPrice: 2800,
            taxRate: 5,
            sortOrder: 2
          }
        ]
      }
    }
  })

  // PO for lubricants from ENOC
  const po3 = await prisma.purchaseOrder.create({
    data: {
      orderNumber: 'PO-2024-003',
      supplierId: suppliers.lubricantsSupplier.id,
      orderDate: new Date('2024-01-08'),
      expectedDate: new Date('2024-01-12'),
      currency: 'AED',
      status: PurchaseOrderStatus.RECEIVED,
      paymentTerms: '30 days net',
      approvedBy: userId,
      approvedAt: new Date('2024-01-08'),
      createdBy: userId,
      items: {
        create: [
          {
            itemId: items.engineOil.id,
            description: 'Shell Rimula R4 X 15W-40 - 20L',
            quantity: 50, // 50 drums of 20L each
            unitPrice: 280,
            taxRate: 5,
            sortOrder: 1
          },
          {
            itemId: items.coolant.id,
            description: 'CAT Extended Life Coolant - 20L',
            quantity: 25,
            unitPrice: 165,
            taxRate: 5,
            sortOrder: 2
          }
        ]
      }
    }
  })

  // Draft PO for future order
  const po4 = await prisma.purchaseOrder.create({
    data: {
      orderNumber: 'PO-2024-004',
      supplierId: suppliers.cumminsArabia.id,
      orderDate: new Date(),
      expectedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      currency: 'AED',
      status: PurchaseOrderStatus.DRAFT,
      paymentTerms: '30 days net',
      createdBy: userId,
      items: {
        create: [
          {
            itemId: items.pistonKit.id,
            description: 'Cummins Piston Kit - Emergency stock',
            quantity: 15,
            unitPrice: 2800,
            discountPercent: 5,
            taxRate: 5,
            sortOrder: 1
          }
        ]
      }
    }
  })

  return { po1, po2, po3, po4 }
}

// Create goods receipts
async function createGoodsReceipts(userId: string, purchaseOrders: any, items: any) {
  // Full receipt for PO-2024-001
  const gr1 = await prisma.goodsReceipt.create({
    data: {
      receiptNumber: 'GR-2024-001',
      purchaseOrderId: purchaseOrders.po1.id,
      supplierId: purchaseOrders.po1.supplierId,
      receiptDate: new Date('2024-01-20'),
      status: GoodsReceiptStatus.COMPLETED,
      notes: 'All items received in good condition',
      receivedBy: userId,
      createdBy: userId,
      items: {
        create: [
          {
            purchaseOrderItemId: (await prisma.purchaseOrderItem.findFirst({ where: { purchaseOrderId: purchaseOrders.po1.id } }))!.id,
            itemId: items.oilFilter.id,
            orderedQty: 100,
            receivedQty: 100,
            acceptedQty: 100,
            rejectedQty: 0,
            unitPrice: 85,
            notes: 'Quality checked - OK'
          }
        ]
      }
    }
  })

  // Partial receipt for PO-2024-002
  const gr2 = await prisma.goodsReceipt.create({
    data: {
      receiptNumber: 'GR-2024-002',
      purchaseOrderId: purchaseOrders.po2.id,
      supplierId: purchaseOrders.po2.supplierId,
      receiptDate: new Date('2024-01-25'),
      status: GoodsReceiptStatus.PARTIAL,
      notes: 'Partial delivery - piston kits on backorder',
      receivedBy: userId,
      createdBy: userId,
      items: {
        create: [
          {
            purchaseOrderItemId: (await prisma.purchaseOrderItem.findFirst({ 
              where: { 
                purchaseOrderId: purchaseOrders.po2.id,
                itemId: items.fuelFilter.id 
              } 
            }))!.id,
            itemId: items.fuelFilter.id,
            orderedQty: 80,
            receivedQty: 80,
            acceptedQty: 78,
            rejectedQty: 2,
            unitPrice: 125,
            notes: '2 units damaged in transit'
          }
        ]
      }
    }
  })

  // Full receipt for PO-2024-003
  const gr3 = await prisma.goodsReceipt.create({
    data: {
      receiptNumber: 'GR-2024-003',
      purchaseOrderId: purchaseOrders.po3.id,
      supplierId: purchaseOrders.po3.supplierId,
      receiptDate: new Date('2024-01-12'),
      status: GoodsReceiptStatus.COMPLETED,
      warehouseLocation: 'Bay A-12',
      receivedBy: userId,
      createdBy: userId,
      items: {
        create: [
          {
            purchaseOrderItemId: (await prisma.purchaseOrderItem.findFirst({ 
              where: { 
                purchaseOrderId: purchaseOrders.po3.id,
                itemId: items.engineOil.id 
              } 
            }))!.id,
            itemId: items.engineOil.id,
            orderedQty: 50,
            receivedQty: 50,
            acceptedQty: 50,
            rejectedQty: 0,
            unitPrice: 280
          },
          {
            purchaseOrderItemId: (await prisma.purchaseOrderItem.findFirst({ 
              where: { 
                purchaseOrderId: purchaseOrders.po3.id,
                itemId: items.coolant.id 
              } 
            }))!.id,
            itemId: items.coolant.id,
            orderedQty: 25,
            receivedQty: 25,
            acceptedQty: 25,
            rejectedQty: 0,
            unitPrice: 165
          }
        ]
      }
    }
  })

  return { gr1, gr2, gr3 }
}

// Create supplier invoices
async function createSupplierInvoices(userId: string, suppliers: any, purchaseOrders: any, goodsReceipts: any) {
  // Invoice for GR-2024-001
  const si1 = await prisma.supplierInvoice.create({
    data: {
      invoiceNumber: 'SINV-2024-001',
      supplierId: suppliers.cumminsArabia.id,
      purchaseOrderId: purchaseOrders.po1.id,
      goodsReceiptId: goodsReceipts.gr1.id,
      invoiceDate: new Date('2024-01-22'),
      dueDate: new Date('2024-02-21'),
      currency: 'AED',
      status: SupplierInvoiceStatus.PAID,
      paymentTerms: '30 days net',
      notes: 'Invoice for oil filters',
      createdBy: userId,
      items: {
        create: [
          {
            itemId: (await prisma.item.findFirst({ where: { code: 'FLT-001' } }))!.id,
            description: 'Cummins Oil Filter LF9009',
            quantity: 100,
            unitPrice: 85,
            taxRate: 5
          }
        ]
      }
    }
  })

  // Invoice for partial GR-2024-002
  const si2 = await prisma.supplierInvoice.create({
    data: {
      invoiceNumber: 'SINV-2024-002',
      supplierId: suppliers.caterpillarUAE.id,
      purchaseOrderId: purchaseOrders.po2.id,
      goodsReceiptId: goodsReceipts.gr2.id,
      invoiceDate: new Date('2024-01-28'),
      dueDate: new Date('2024-03-13'),
      currency: 'AED',
      status: SupplierInvoiceStatus.APPROVED,
      paymentTerms: '45 days net',
      notes: 'Partial invoice - fuel filters only',
      createdBy: userId,
      items: {
        create: [
          {
            itemId: (await prisma.item.findFirst({ where: { code: 'FLT-002' } }))!.id,
            description: 'CAT Fuel Filter - accepted qty only',
            quantity: 78, // Only accepted quantity
            unitPrice: 125,
            taxRate: 5
          }
        ]
      }
    }
  })

  // Invoice with price variance
  const si3 = await prisma.supplierInvoice.create({
    data: {
      invoiceNumber: 'SINV-2024-003',
      supplierId: suppliers.lubricantsSupplier.id,
      purchaseOrderId: purchaseOrders.po3.id,
      goodsReceiptId: goodsReceipts.gr3.id,
      invoiceDate: new Date('2024-01-15'),
      dueDate: new Date('2024-02-14'),
      currency: 'AED',
      status: SupplierInvoiceStatus.PARTIAL_PAYMENT,
      paymentTerms: '30 days net',
      notes: 'Price increase due to market conditions',
      createdBy: userId,
      items: {
        create: [
          {
            itemId: (await prisma.item.findFirst({ where: { code: 'LUB-001' } }))!.id,
            description: 'Shell Rimula R4 X - price adjusted',
            quantity: 50,
            unitPrice: 290, // Higher than PO price
            taxRate: 5
          },
          {
            itemId: (await prisma.item.findFirst({ where: { code: 'LUB-002' } }))!.id,
            description: 'CAT Coolant',
            quantity: 25,
            unitPrice: 165,
            taxRate: 5
          }
        ]
      }
    }
  })

  // Draft invoice
  const si4 = await prisma.supplierInvoice.create({
    data: {
      invoiceNumber: 'SINV-2024-004',
      supplierId: suppliers.cumminsArabia.id,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currency: 'AED',
      status: SupplierInvoiceStatus.DRAFT,
      paymentTerms: '30 days net',
      createdBy: userId,
      items: {
        create: [
          {
            itemId: (await prisma.item.findFirst({ where: { code: 'PST-001' } }))!.id,
            description: 'Piston Kit - advance invoice',
            quantity: 5,
            unitPrice: 2800,
            taxRate: 5
          }
        ]
      }
    }
  })

  return { si1, si2, si3, si4 }
}

// Create three-way matching records
async function createThreeWayMatching(userId: string, purchaseOrders: any, goodsReceipts: any, supplierInvoices: any) {
  // Perfect match
  const match1 = await prisma.threeWayMatching.create({
    data: {
      purchaseOrderId: purchaseOrders.po1.id,
      goodsReceiptId: goodsReceipts.gr1.id,
      supplierInvoiceId: supplierInvoices.si1.id,
      status: ThreeWayMatchingStatus.MATCHED,
      poAmount: 8925, // 100 * 85 * 1.05
      grAmount: 8925,
      invoiceAmount: 8925,
      varianceAmount: 0,
      variancePercent: 0,
      notes: 'Perfect three-way match',
      matchedBy: userId,
      matchedAt: new Date('2024-01-23'),
      createdBy: userId
    }
  })

  // Quantity variance
  const match2 = await prisma.threeWayMatching.create({
    data: {
      purchaseOrderId: purchaseOrders.po2.id,
      goodsReceiptId: goodsReceipts.gr2.id,
      supplierInvoiceId: supplierInvoices.si2.id,
      status: ThreeWayMatchingStatus.PARTIAL,
      poAmount: 10500, // 80 * 125 * 1.05
      grAmount: 10237.5, // 78 * 125 * 1.05
      invoiceAmount: 10237.5,
      varianceAmount: -262.5,
      variancePercent: -2.5,
      notes: 'Quantity variance - 2 units rejected',
      createdBy: userId
    }
  })

  // Price variance
  const match3 = await prisma.threeWayMatching.create({
    data: {
      purchaseOrderId: purchaseOrders.po3.id,
      goodsReceiptId: goodsReceipts.gr3.id,
      supplierInvoiceId: supplierInvoices.si3.id,
      status: ThreeWayMatchingStatus.EXCEPTION,
      poAmount: 19057.5, // (50*280 + 25*165) * 1.05
      grAmount: 19057.5,
      invoiceAmount: 19582.5, // (50*290 + 25*165) * 1.05
      varianceAmount: 525,
      variancePercent: 2.76,
      notes: 'Price variance on engine oil - requires approval',
      createdBy: userId
    }
  })

  return { match1, match2, match3 }
}

// Create supplier payments
async function createSupplierPayments(userId: string, supplierInvoices: any, accounts: any) {
  // Full payment for si1
  const sp1 = await prisma.supplierPayment.create({
    data: {
      paymentNumber: 'SP-2024-001',
      supplierId: supplierInvoices.si1.supplierId,
      paymentDate: new Date('2024-02-15'),
      amount: 8925,
      currency: 'AED',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      bankAccountId: accounts.bankUAE.id,
      reference: 'BT-20240215-001',
      notes: 'Full payment for SINV-2024-001',
      createdBy: userId,
      payments: {
        create: {
          supplierInvoiceId: supplierInvoices.si1.id,
          amount: 8925,
          createdBy: userId
        }
      }
    }
  })

  // Partial payment for si3
  const sp2 = await prisma.supplierPayment.create({
    data: {
      paymentNumber: 'SP-2024-002',
      supplierId: supplierInvoices.si3.supplierId,
      paymentDate: new Date('2024-02-10'),
      amount: 10000,
      currency: 'AED',
      paymentMethod: PaymentMethod.CHECK,
      checkNumber: 'CHQ-1234567',
      bankAccountId: accounts.bankUAE.id,
      notes: 'Partial payment for SINV-2024-003',
      createdBy: userId,
      payments: {
        create: {
          supplierInvoiceId: supplierInvoices.si3.id,
          amount: 10000,
          createdBy: userId
        }
      }
    }
  })

  // Advance payment
  const sp3 = await prisma.supplierPayment.create({
    data: {
      paymentNumber: 'SP-2024-003',
      supplierId: supplierInvoices.si4.supplierId,
      paymentDate: new Date('2024-01-05'),
      amount: 25000,
      currency: 'AED',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      bankAccountId: accounts.bankUAE.id,
      reference: 'ADVANCE-2024-001',
      notes: 'Advance payment for future orders',
      isAdvancePayment: true,
      createdBy: userId
    }
  })

  return { sp1, sp2, sp3 }
}

// Create sales orders
async function createSalesOrders(userId: string, quotations: any, customers: any) {
  // SO from accepted quotation
  const so1 = await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-2024-001',
      quotationId: quotations.quotationDPWorld.id,
      customerId: customers.dpWorld.id,
      orderDate: new Date('2024-02-16'),
      expectedDeliveryDate: new Date('2024-03-01'),
      currency: 'AED',
      status: SalesOrderStatus.IN_PROGRESS,
      paymentTerms: '60 days net',
      deliveryTerms: 'On-site service',
      notes: 'Annual maintenance contract - Q1 2024',
      createdBy: userId,
      items: {
        create: [
          {
            itemId: (await prisma.item.findFirst({ where: { code: 'SRV-001' } }))!.id,
            description: 'Q1 Preventive maintenance - 50 engines',
            quantity: 50,
            unitPrice: 1200,
            discountPercent: 15,
            taxRate: 5,
            sortOrder: 1
          },
          {
            itemId: (await prisma.item.findFirst({ where: { code: 'FLT-001' } }))!.id,
            description: 'Oil filters for Q1',
            quantity: 50,
            unitPrice: 120,
            discountPercent: 20,
            taxRate: 5,
            sortOrder: 2
          }
        ]
      }
    }
  })

  // Direct SO without quotation
  const so2 = await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-2024-002',
      customerId: customers.emiratesTransport.id,
      orderDate: new Date('2024-01-25'),
      expectedDeliveryDate: new Date('2024-01-30'),
      currency: 'AED',
      status: SalesOrderStatus.DELIVERED,
      paymentTerms: '45 days net',
      notes: 'Emergency repair service',
      createdBy: userId,
      items: {
        create: [
          {
            itemId: (await prisma.item.findFirst({ where: { code: 'SRV-003' } }))!.id,
            description: 'Emergency repair - Bus engine failure',
            quantity: 8,
            unitPrice: 500,
            taxRate: 5,
            sortOrder: 1
          },
          {
            itemId: (await prisma.item.findFirst({ where: { code: 'PST-001' } }))!.id,
            description: 'Piston kit replacement',
            quantity: 1,
            unitPrice: 3850,
            taxRate: 5,
            sortOrder: 2
          }
        ]
      }
    }
  })

  // Cancelled order
  const so3 = await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-2024-003',
      customerId: customers.rakCement.id,
      orderDate: new Date('2024-01-20'),
      expectedDeliveryDate: new Date('2024-02-20'),
      currency: 'AED',
      status: SalesOrderStatus.CANCELLED,
      cancelledAt: new Date('2024-01-22'),
      cancelledBy: userId,
      cancellationReason: 'Customer postponed project',
      paymentTerms: '30 days net',
      createdBy: userId,
      items: {
        create: [
          {
            itemId: (await prisma.item.findFirst({ where: { code: 'SRV-002' } }))!.id,
            description: 'Engine overhaul',
            quantity: 2,
            unitPrice: 35000,
            taxRate: 5,
            sortOrder: 1
          }
        ]
      }
    }
  })

  return { so1, so2, so3 }
}

// Create customer purchase orders
async function createCustomerPurchaseOrders(userId: string, customers: any, salesOrders: any) {
  const cpo1 = await prisma.customerPO.create({
    data: {
      poNumber: 'DPW-PO-2024-1234',
      customerId: customers.dpWorld.id,
      salesOrderId: salesOrders.so1.id,
      issueDate: new Date('2024-02-15'),
      amount: 53550, // After discounts and tax
      currency: 'AED',
      status: CustomerPOStatus.ACCEPTED,
      acceptedAt: new Date('2024-02-16'),
      acceptedBy: userId,
      documentUrl: '/documents/dpm-po-2024-1234.pdf',
      notes: 'Annual contract PO',
      createdBy: userId
    }
  })

  const cpo2 = await prisma.customerPO.create({
    data: {
      poNumber: 'ET-EMER-2024-089',
      customerId: customers.emiratesTransport.id,
      salesOrderId: salesOrders.so2.id,
      issueDate: new Date('2024-01-25'),
      amount: 8242.5,
      currency: 'AED',
      status: CustomerPOStatus.ACCEPTED,
      acceptedAt: new Date('2024-01-25'),
      acceptedBy: userId,
      isEmergency: true,
      createdBy: userId
    }
  })

  return { cpo1, cpo2 }
}

// Create invoices
async function createInvoices(userId: string, salesOrders: any, accounts: any) {
  const inv1 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2024-001',
      salesOrderId: salesOrders.so1.id,
      customerId: salesOrders.so1.customerId,
      invoiceDate: new Date('2024-03-01'),
      dueDate: new Date('2024-04-30'),
      currency: 'AED',
      status: InvoiceStatus.SENT,
      paymentTerms: '60 days net',
      accountsReceivableId: accounts.accountsReceivable.id,
      createdBy: userId,
      items: {
        create: [
          {
            itemId: (await prisma.item.findFirst({ where: { code: 'SRV-001' } }))!.id,
            description: 'Q1 Preventive maintenance - 50 engines',
            quantity: 50,
            unitPrice: 1200,
            discountPercent: 15,
            taxRate: 5,
            salesAccountId: accounts.serviceRevenue.id,
            sortOrder: 1
          },
          {
            itemId: (await prisma.item.findFirst({ where: { code: 'FLT-001' } }))!.id,
            description: 'Oil filters for Q1',
            quantity: 50,
            unitPrice: 120,
            discountPercent: 20,
            taxRate: 5,
            salesAccountId: accounts.partsRevenue.id,
            sortOrder: 2
          }
        ]
      }
    }
  })

  const inv2 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2024-002',
      salesOrderId: salesOrders.so2.id,
      customerId: salesOrders.so2.customerId,
      invoiceDate: new Date('2024-01-30'),
      dueDate: new Date('2024-03-15'),
      currency: 'AED',
      status: InvoiceStatus.PAID,
      paymentTerms: '45 days net',
      accountsReceivableId: accounts.accountsReceivable.id,
      paidAmount: 8242.5,
      paidAt: new Date('2024-03-10'),
      createdBy: userId,
      items: {
        create: [
          {
            itemId: (await prisma.item.findFirst({ where: { code: 'SRV-003' } }))!.id,
            description: 'Emergency repair - Bus engine',
            quantity: 8,
            unitPrice: 500,
            taxRate: 5,
            salesAccountId: accounts.serviceRevenue.id,
            sortOrder: 1
          },
          {
            itemId: (await prisma.item.findFirst({ where: { code: 'PST-001' } }))!.id,
            description: 'Piston kit',
            quantity: 1,
            unitPrice: 3850,
            taxRate: 5,
            salesAccountId: accounts.partsRevenue.id,
            sortOrder: 2
          }
        ]
      }
    }
  })

  // Overdue invoice
  const inv3 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2023-999',
      customerId: customers.rakCement.id,
      invoiceDate: new Date('2023-11-01'),
      dueDate: new Date('2023-12-01'),
      currency: 'AED',
      status: InvoiceStatus.OVERDUE,
      paymentTerms: '30 days net',
      accountsReceivableId: accounts.accountsReceivable.id,
      createdBy: userId,
      items: {
        create: [
          {
            itemId: (await prisma.item.findFirst({ where: { code: 'LUB-001' } }))!.id,
            description: 'Engine oil supply',
            quantity: 100,
            unitPrice: 385,
            taxRate: 5,
            salesAccountId: accounts.partsRevenue.id,
            sortOrder: 1
          }
        ]
      }
    }
  })

  return { inv1, inv2, inv3 }
}

// Create shipments
async function createShipments(userId: string, salesOrders: any, locations: any) {
  const ship1 = await prisma.shipment.create({
    data: {
      shipmentNumber: 'SHP-2024-001',
      salesOrderId: salesOrders.so2.id,
      shipmentDate: new Date('2024-01-30'),
      expectedDeliveryDate: new Date('2024-01-30'),
      actualDeliveryDate: new Date('2024-01-30'),
      status: ShipmentStatus.DELIVERED,
      carrier: 'Internal Service Team',
      trackingNumber: 'INTERNAL-001',
      shippingCost: 0,
      currency: 'AED',
      fromLocationId: locations.dubaiWorkshop.id,
      toAddress: 'Emirates Transport Workshop, Sharjah',
      notes: 'Emergency service completed on-site',
      deliveredBy: userId,
      createdBy: userId,
      items: {
        create: [
          {
            salesOrderItemId: (await prisma.salesOrderItem.findFirst({ 
              where: { salesOrderId: salesOrders.so2.id } 
            }))!.id,
            itemId: (await prisma.item.findFirst({ where: { code: 'PST-001' } }))!.id,
            orderedQty: 1,
            shippedQty: 1,
            deliveredQty: 1
          }
        ]
      }
    }
  })

  const ship2 = await prisma.shipment.create({
    data: {
      shipmentNumber: 'SHP-2024-002',
      salesOrderId: salesOrders.so1.id,
      shipmentDate: new Date('2024-03-01'),
      expectedDeliveryDate: new Date('2024-03-02'),
      status: ShipmentStatus.IN_TRANSIT,
      carrier: 'DHL Express',
      trackingNumber: 'DHL-784512369',
      shippingCost: 250,
      currency: 'AED',
      fromLocationId: locations.mainWarehouse.id,
      toAddress: 'DP World Jebel Ali Port, Gate 5',
      createdBy: userId,
      items: {
        create: [
          {
            salesOrderItemId: (await prisma.salesOrderItem.findFirst({ 
              where: { 
                salesOrderId: salesOrders.so1.id,
                itemId: (await prisma.item.findFirst({ where: { code: 'FLT-001' } }))!.id
              } 
            }))!.id,
            itemId: (await prisma.item.findFirst({ where: { code: 'FLT-001' } }))!.id,
            orderedQty: 50,
            shippedQty: 50
          }
        ]
      }
    }
  })

  return { ship1, ship2 }
}

// Create customer payments
async function createCustomerPayments(userId: string, invoices: any, customers: any, accounts: any) {
  // Full payment
  const cp1 = await prisma.customerPayment.create({
    data: {
      paymentNumber: 'CP-2024-001',
      customerId: customers.emiratesTransport.id,
      paymentDate: new Date('2024-03-10'),
      amount: 8242.5,
      currency: 'AED',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      bankAccountId: accounts.bankUAE.id,
      reference: 'ET-PAY-2024-089',
      notes: 'Payment for emergency service',
      createdBy: userId,
      payments: {
        create: {
          invoiceId: invoices.inv2.id,
          amount: 8242.5,
          createdBy: userId
        }
      }
    }
  })

  // Partial payment
  const cp2 = await prisma.customerPayment.create({
    data: {
      paymentNumber: 'CP-2024-002',
      customerId: customers.rakCement.id,
      paymentDate: new Date('2024-02-15'),
      amount: 20000,
      currency: 'AED',
      paymentMethod: PaymentMethod.CHECK,
      checkNumber: 'RAK-CHQ-98765',
      bankAccountId: accounts.bankUAE.id,
      notes: 'Partial payment for overdue invoice',
      createdBy: userId,
      payments: {
        create: {
          invoiceId: invoices.inv3.id,
          amount: 20000,
          createdBy: userId
        }
      }
    }
  })

  // Advance payment
  const cp3 = await prisma.customerPayment.create({
    data: {
      paymentNumber: 'CP-2024-003',
      customerId: customers.dpWorld.id,
      paymentDate: new Date('2024-01-01'),
      amount: 100000,
      currency: 'AED',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      bankAccountId: accounts.bankUAE.id,
      reference: 'DPW-ADVANCE-2024',
      notes: 'Advance payment for annual contract',
      isAdvancePayment: true,
      createdBy: userId
    }
  })

  return { cp1, cp2, cp3 }
}

// Create stock transfers
async function createStockTransfers(userId: string, items: any, locations: any) {
  const st1 = await prisma.stockTransfer.create({
    data: {
      transferNumber: 'ST-2024-001',
      fromLocationId: locations.mainWarehouse.id,
      toLocationId: locations.dubaiWorkshop.id,
      transferDate: new Date('2024-01-28'),
      expectedDate: new Date('2024-01-29'),
      status: StockTransferStatus.COMPLETED,
      notes: 'Stock for emergency repairs',
      shippedBy: userId,
      receivedBy: userId,
      shippedAt: new Date('2024-01-28'),
      receivedAt: new Date('2024-01-29'),
      createdBy: userId,
      items: {
        create: [
          {
            itemId: items.pistonKit.id,
            requestedQty: 2,
            shippedQty: 2,
            receivedQty: 2,
            unitCost: 2800,
            notes: 'Urgent transfer'
          },
          {
            itemId: items.oilFilter.id,
            requestedQty: 20,
            shippedQty: 20,
            receivedQty: 20,
            unitCost: 85
          }
        ]
      }
    }
  })

  const st2 = await prisma.stockTransfer.create({
    data: {
      transferNumber: 'ST-2024-002',
      fromLocationId: locations.mainWarehouse.id,
      toLocationId: locations.serviceVan1.id,
      transferDate: new Date('2024-02-01'),
      expectedDate: new Date('2024-02-01'),
      status: StockTransferStatus.IN_TRANSIT,
      notes: 'Mobile service van stock replenishment',
      shippedBy: userId,
      shippedAt: new Date('2024-02-01'),
      createdBy: userId,
      items: {
        create: [
          {
            itemId: items.oilFilter.id,
            requestedQty: 10,
            shippedQty: 10,
            unitCost: 85
          },
          {
            itemId: items.fuelFilter.id,
            requestedQty: 10,
            shippedQty: 10,
            unitCost: 125
          },
          {
            itemId: items.engineOil.id,
            requestedQty: 100, // 5 drums
            shippedQty: 100,
            unitCost: 14
          }
        ]
      }
    }
  })

  return { st1, st2 }
}

// Create user permissions
async function createUserPermissions(users: any) {
  // Admin has all permissions by default via role

  // Sales manager permissions
  await prisma.userPermission.createMany({
    data: [
      {
        userId: users.salesManager.id,
        resource: PermissionResource.CUSTOMER,
        action: PermissionAction.CREATE,
        granted: true,
        grantedBy: users.admin.id
      },
      {
        userId: users.salesManager.id,
        resource: PermissionResource.CUSTOMER,
        action: PermissionAction.UPDATE,
        granted: true,
        grantedBy: users.admin.id
      },
      {
        userId: users.salesManager.id,
        resource: PermissionResource.QUOTATION,
        action: PermissionAction.CREATE,
        granted: true,
        grantedBy: users.admin.id
      },
      {
        userId: users.salesManager.id,
        resource: PermissionResource.QUOTATION,
        action: PermissionAction.UPDATE,
        granted: true,
        grantedBy: users.admin.id
      },
      {
        userId: users.salesManager.id,
        resource: PermissionResource.SALES_ORDER,
        action: PermissionAction.CREATE,
        granted: true,
        grantedBy: users.admin.id
      },
      {
        userId: users.salesManager.id,
        resource: PermissionResource.SALES_ORDER,
        action: PermissionAction.VIEW,
        granted: true,
        grantedBy: users.admin.id
      }
    ]
  })

  // Accountant permissions
  await prisma.userPermission.createMany({
    data: [
      {
        userId: users.accountant.id,
        resource: PermissionResource.INVOICE,
        action: PermissionAction.CREATE,
        granted: true,
        grantedBy: users.admin.id
      },
      {
        userId: users.accountant.id,
        resource: PermissionResource.INVOICE,
        action: PermissionAction.UPDATE,
        granted: true,
        grantedBy: users.admin.id
      },
      {
        userId: users.accountant.id,
        resource: PermissionResource.PAYMENT,
        action: PermissionAction.CREATE,
        granted: true,
        grantedBy: users.admin.id
      },
      {
        userId: users.accountant.id,
        resource: PermissionResource.JOURNAL_ENTRY,
        action: PermissionAction.CREATE,
        granted: true,
        grantedBy: users.admin.id
      },
      {
        userId: users.accountant.id,
        resource: PermissionResource.REPORT,
        action: PermissionAction.VIEW,
        granted: true,
        grantedBy: users.admin.id
      }
    ]
  })

  // Warehouse permissions
  await prisma.userPermission.createMany({
    data: [
      {
        userId: users.warehouse.id,
        resource: PermissionResource.INVENTORY,
        action: PermissionAction.VIEW,
        granted: true,
        grantedBy: users.admin.id
      },
      {
        userId: users.warehouse.id,
        resource: PermissionResource.INVENTORY,
        action: PermissionAction.UPDATE,
        granted: true,
        grantedBy: users.admin.id
      },
      {
        userId: users.warehouse.id,
        resource: PermissionResource.GOODS_RECEIPT,
        action: PermissionAction.CREATE,
        granted: true,
        grantedBy: users.admin.id
      },
      {
        userId: users.warehouse.id,
        resource: PermissionResource.SHIPMENT,
        action: PermissionAction.CREATE,
        granted: true,
        grantedBy: users.admin.id
      },
      {
        userId: users.warehouse.id,
        resource: PermissionResource.SHIPMENT,
        action: PermissionAction.UPDATE,
        granted: true,
        grantedBy: users.admin.id
      }
    ]
  })
}

// Create audit logs
async function createAuditLogs(users: any) {
  const logs = [
    {
      userId: users.admin.id,
      action: 'CREATE',
      entityType: 'User',
      entityId: users.salesManager.id,
      description: 'Created user: sales_manager',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0'
    },
    {
      userId: users.salesManager.id,
      action: 'CREATE',
      entityType: 'Customer',
      entityId: (await prisma.customer.findFirst({ where: { customerNumber: 'CUST-001' } }))!.id,
      description: 'Created customer: DP World - Jebel Ali',
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0'
    },
    {
      userId: users.salesManager.id,
      action: 'UPDATE',
      entityType: 'Quotation',
      entityId: (await prisma.quotation.findFirst({ where: { quotationNumber: 'Q-2024-001' } }))!.id,
      description: 'Sent quotation to customer',
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0'
    },
    {
      userId: users.accountant.id,
      action: 'CREATE',
      entityType: 'Invoice',
      entityId: (await prisma.invoice.findFirst({ where: { invoiceNumber: 'INV-2024-001' } }))!.id,
      description: 'Created invoice for SO-2024-001',
      ipAddress: '192.168.1.102',
      userAgent: 'Mozilla/5.0'
    },
    {
      userId: users.warehouse.id,
      action: 'UPDATE',
      entityType: 'GoodsReceipt',
      entityId: (await prisma.goodsReceipt.findFirst({ where: { receiptNumber: 'GR-2024-001' } }))!.id,
      description: 'Completed goods receipt',
      ipAddress: '192.168.1.103',
      userAgent: 'Mozilla/5.0'
    },
    {
      userId: users.accountant.id,
      action: 'APPROVE',
      entityType: 'ThreeWayMatching',
      entityId: (await prisma.threeWayMatching.findFirst())!.id,
      description: 'Approved three-way match with perfect match',
      ipAddress: '192.168.1.102',
      userAgent: 'Mozilla/5.0'
    }
  ]

  await prisma.auditLog.createMany({ data: logs })
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