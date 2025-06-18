import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { 
  AccountType, 
  Role, 
  LeadSource,
  LeadStatus,
  SalesCaseStatus,
  QuotationStatus,
  ItemType,
  MovementType,
  JournalStatus,
  SalesOrderStatus,
  InvoiceStatus,
  PaymentStatus,
  PurchaseOrderStatus,
  SupplierInvoiceStatus,
  SupplierPaymentStatus,
  ShipmentStatus
} from '@/lib/generated/prisma'

async function main(): Promise<void> {
  console.warn('🌱 Starting UAE Marine Diesel Company seed...')

  // Clean existing data
  await cleanDatabase()

  // Create company settings
  const companySettings = await createCompanySettings()
  console.warn('✅ Created company settings')

  // Create users and profiles
  const users = await createUsersAndProfiles()
  console.warn('✅ Created users and profiles')

  // Create permissions
  await createPermissions(users)
  console.warn('✅ Created permissions')

  // Create exchange rates
  await createExchangeRates(users.admin.id)
  console.warn('✅ Created exchange rates')

  // Create tax configuration
  const taxConfig = await createTaxConfiguration(users.admin.id)
  console.warn('✅ Created tax configuration')

  // Create chart of accounts
  const accounts = await createChartOfAccounts(users.admin.id)
  console.warn('✅ Created chart of accounts')

  // Create locations/warehouses
  const locations = await createLocations(users.admin.id)
  console.warn('✅ Created locations')

  // Create marine-specific inventory
  const inventory = await createMarineInventory(users.admin.id, accounts, locations, taxConfig)
  console.warn('✅ Created marine inventory')

  // Create suppliers
  const suppliers = await createSuppliers(users.purchasing.id)
  console.warn('✅ Created suppliers')

  // Create customers
  const customers = await createCustomers(users.admin.id, users.sales.id)
  console.warn('✅ Created customers')

  // Create leads
  const leads = await createLeads(users.sales.id)
  console.warn('✅ Created leads')

  // Create sales team
  await createSalesTeam(users)
  console.warn('✅ Created sales team')

  // Create sales cases
  const salesCases = await createSalesCases(users.sales.id, customers, leads)
  console.warn('✅ Created sales cases')

  // Create quotations
  const quotations = await createQuotations(users.sales.id, salesCases, inventory.items, taxConfig.vatRate)
  console.warn('✅ Created quotations')

  // Create sales orders
  const salesOrders = await createSalesOrders(users.sales.id, quotations, customers)
  console.warn('✅ Created sales orders')

  // Create purchase workflow
  const purchaseData = await createPurchaseWorkflow(users.purchasing.id, suppliers, inventory.items, locations.mainWarehouse, taxConfig.vatRate)
  console.warn('✅ Created purchase workflow')

  // Create stock movements
  await createStockMovements(users.warehouse.id, inventory.items, locations, purchaseData.goodsReceipts)
  console.warn('✅ Created stock movements')

  // Create shipments
  const shipments = await createShipments(users.warehouse.id, salesOrders, locations.mainWarehouse)
  console.warn('✅ Created shipments')

  // Create invoices
  const invoices = await createInvoices(users.accountant.id, salesOrders, customers)
  console.warn('✅ Created invoices')

  // Create payments
  await createPayments(users.accountant.id, invoices, customers)
  console.warn('✅ Created payments')

  // Create supplier payments
  await createSupplierPayments(users.accountant.id, purchaseData.supplierInvoices, suppliers)
  console.warn('✅ Created supplier payments')

  // Create sample journal entries
  await createSampleJournalEntries(users.accountant.id, accounts)
  console.warn('✅ Created journal entries')

  console.warn('🎉 UAE Marine Diesel Company seed completed successfully!')
}

async function cleanDatabase(): Promise<void> {
  // Delete in correct order to respect foreign keys
  await prisma.auditLog.deleteMany()
  await prisma.journalLine.deleteMany()
  await prisma.journalEntry.deleteMany()
  await prisma.shipmentItem.deleteMany()
  await prisma.shipment.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.invoiceItem.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.supplierPayment.deleteMany()
  await prisma.supplierInvoice.deleteMany()
  await prisma.goodsReceiptItem.deleteMany()
  await prisma.goodsReceipt.deleteMany()
  await prisma.purchaseOrderItem.deleteMany()
  await prisma.purchaseOrder.deleteMany()
  await prisma.salesOrderItem.deleteMany()
  await prisma.salesOrder.deleteMany()
  await prisma.quotationItem.deleteMany()
  await prisma.quotation.deleteMany()
  await prisma.salesCase.deleteMany()
  await prisma.caseExpense.deleteMany()
  await prisma.stockMovement.deleteMany()
  await prisma.locationStockLot.deleteMany()
  await prisma.stockLot.deleteMany()
  await prisma.inventoryBalance.deleteMany()
  await prisma.item.deleteMany()
  await prisma.category.deleteMany()
  await prisma.unitOfMeasure.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.customerPO.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.location.deleteMany()
  await prisma.salesTeamMember.deleteMany()
  await prisma.account.deleteMany()
  await prisma.taxRate.deleteMany()
  await prisma.taxCategory.deleteMany()
  await prisma.exchangeRate.deleteMany()
  await prisma.userPermission.deleteMany()
  await prisma.rolePermission.deleteMany()
  await prisma.permission.deleteMany()
  await prisma.userProfile.deleteMany()
  await prisma.user.deleteMany()
  await prisma.companySettings.deleteMany()
}

async function createCompanySettings() {
  return await prisma.companySettings.create({
    data: {
      companyName: 'Gulf Marine Diesel Services LLC',
      address: 'Plot 123, Jebel Ali Free Zone, Dubai, UAE',
      phone: '+971 4 123 4567',
      email: 'info@gulfmarinediesel.ae',
      website: 'https://www.gulfmarinediesel.ae',
      logoUrl: '/logo/gmds-logo.png',
      defaultCurrency: 'AED',
      taxRegistrationNumber: 'TRN100234567890003',
      quotationTermsAndConditions: `1. All prices are in AED unless otherwise stated
2. Validity: This quotation is valid for 30 days from the date of issue
3. Payment Terms: 50% advance, 50% upon completion
4. Warranty: 12 months on parts, 6 months on labor
5. All work subject to vessel availability and weather conditions
6. Prices exclude VAT which will be added at the prevailing rate`,
      quotationFooterNotes: 'Thank you for choosing Gulf Marine Diesel Services - Your trusted partner in marine engine maintenance',
      quotationValidityDays: 30,
      quotationPrefix: 'QT',
      quotationNumberFormat: 'PREFIX-YYYY-NNNN',
      orderPrefix: 'SO',
      orderNumberFormat: 'PREFIX-YYYY-NNNN',
      defaultOrderPaymentTerms: 'Net 30 days',
      defaultOrderShippingTerms: 'Ex-Works Dubai',
      defaultShippingMethod: 'Customer Pickup',
      autoReserveInventory: true,
      requireCustomerPO: true,
      orderApprovalThreshold: 100000,
      showCompanyLogoOnQuotations: true,
      showCompanyLogoOnOrders: true,
      showTaxBreakdown: true,
      isActive: true
    }
  })
}

async function createUsersAndProfiles() {
  const hashedPassword = await bcrypt.hash('demo123', 10)

  // Admin user
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@gulfmarinediesel.ae',
      password: hashedPassword,
      role: Role.ADMIN,
      isActive: true,
      profile: {
        create: {
          firstName: 'Ahmed',
          lastName: 'Al Rashid',
          phone: '+971 50 123 4567',
          department: 'Management',
          jobTitle: 'General Manager',
          timezone: 'Asia/Dubai',
          language: 'en',
          dateFormat: 'DD/MM/YYYY',
          currency: 'AED'
        }
      }
    },
    include: { profile: true }
  })

  // Sales Manager
  const sales = await prisma.user.create({
    data: {
      username: 'sales_manager',
      email: 'sales@gulfmarinediesel.ae',
      password: hashedPassword,
      role: Role.USER,
      isActive: true,
      profile: {
        create: {
          firstName: 'Fatima',
          lastName: 'Hassan',
          phone: '+971 50 234 5678',
          department: 'Sales',
          jobTitle: 'Sales Manager',
          timezone: 'Asia/Dubai',
          language: 'en',
          dateFormat: 'DD/MM/YYYY',
          currency: 'AED'
        }
      }
    },
    include: { profile: true }
  })

  // Sales Executive
  const salesExec = await prisma.user.create({
    data: {
      username: 'sales_exec',
      email: 'sales.exec@gulfmarinediesel.ae',
      password: hashedPassword,
      role: Role.USER,
      isActive: true,
      profile: {
        create: {
          firstName: 'Mohammed',
          lastName: 'Khan',
          phone: '+971 50 345 6789',
          department: 'Sales',
          jobTitle: 'Sales Executive',
          timezone: 'Asia/Dubai',
          language: 'en',
          dateFormat: 'DD/MM/YYYY',
          currency: 'AED'
        }
      }
    },
    include: { profile: true }
  })

  // Accountant
  const accountant = await prisma.user.create({
    data: {
      username: 'accountant',
      email: 'accounts@gulfmarinediesel.ae',
      password: hashedPassword,
      role: Role.USER,
      isActive: true,
      profile: {
        create: {
          firstName: 'Priya',
          lastName: 'Sharma',
          phone: '+971 50 456 7890',
          department: 'Finance',
          jobTitle: 'Chief Accountant',
          timezone: 'Asia/Dubai',
          language: 'en',
          dateFormat: 'DD/MM/YYYY',
          currency: 'AED'
        }
      }
    },
    include: { profile: true }
  })

  // Warehouse Manager
  const warehouse = await prisma.user.create({
    data: {
      username: 'warehouse',
      email: 'warehouse@gulfmarinediesel.ae',
      password: hashedPassword,
      role: Role.USER,
      isActive: true,
      profile: {
        create: {
          firstName: 'John',
          lastName: 'Santos',
          phone: '+971 50 567 8901',
          department: 'Operations',
          jobTitle: 'Warehouse Manager',
          timezone: 'Asia/Dubai',
          language: 'en',
          dateFormat: 'DD/MM/YYYY',
          currency: 'AED'
        }
      }
    },
    include: { profile: true }
  })

  // Purchasing Manager
  const purchasing = await prisma.user.create({
    data: {
      username: 'purchasing',
      email: 'purchasing@gulfmarinediesel.ae',
      password: hashedPassword,
      role: Role.USER,
      isActive: true,
      profile: {
        create: {
          firstName: 'Ali',
          lastName: 'Mahmoud',
          phone: '+971 50 678 9012',
          department: 'Procurement',
          jobTitle: 'Purchasing Manager',
          timezone: 'Asia/Dubai',
          language: 'en',
          dateFormat: 'DD/MM/YYYY',
          currency: 'AED'
        }
      }
    },
    include: { profile: true }
  })

  // Service Engineer
  const engineer = await prisma.user.create({
    data: {
      username: 'engineer',
      email: 'engineer@gulfmarinediesel.ae',
      password: hashedPassword,
      role: Role.USER,
      isActive: true,
      profile: {
        create: {
          firstName: 'David',
          lastName: 'Rodriguez',
          phone: '+971 50 789 0123',
          department: 'Engineering',
          jobTitle: 'Senior Service Engineer',
          timezone: 'Asia/Dubai',
          language: 'en',
          dateFormat: 'DD/MM/YYYY',
          currency: 'AED'
        }
      }
    },
    include: { profile: true }
  })

  return { admin, sales, salesExec, accountant, warehouse, purchasing, engineer }
}

async function createPermissions(users: any) {
  // Create permissions
  const permissions = [
    // Company Settings
    { code: 'company.view', name: 'View Company Settings', description: 'View company configuration' },
    { code: 'company.edit', name: 'Edit Company Settings', description: 'Modify company configuration' },
    
    // Users
    { code: 'users.view', name: 'View Users', description: 'View user list and details' },
    { code: 'users.create', name: 'Create Users', description: 'Create new users' },
    { code: 'users.edit', name: 'Edit Users', description: 'Modify user information' },
    { code: 'users.delete', name: 'Delete Users', description: 'Remove users from system' },
    
    // Customers
    { code: 'customers.view', name: 'View Customers', description: 'View customer information' },
    { code: 'customers.create', name: 'Create Customers', description: 'Add new customers' },
    { code: 'customers.edit', name: 'Edit Customers', description: 'Modify customer details' },
    { code: 'customers.delete', name: 'Delete Customers', description: 'Remove customers' },
    
    // Sales
    { code: 'sales.view', name: 'View Sales', description: 'View sales information' },
    { code: 'sales.create', name: 'Create Sales', description: 'Create quotations and orders' },
    { code: 'sales.edit', name: 'Edit Sales', description: 'Modify sales documents' },
    { code: 'sales.approve', name: 'Approve Sales', description: 'Approve high-value sales' },
    
    // Purchasing
    { code: 'purchasing.view', name: 'View Purchasing', description: 'View purchase orders' },
    { code: 'purchasing.create', name: 'Create Purchasing', description: 'Create purchase orders' },
    { code: 'purchasing.edit', name: 'Edit Purchasing', description: 'Modify purchase orders' },
    { code: 'purchasing.approve', name: 'Approve Purchasing', description: 'Approve purchase orders' },
    
    // Inventory
    { code: 'inventory.view', name: 'View Inventory', description: 'View stock levels' },
    { code: 'inventory.manage', name: 'Manage Inventory', description: 'Manage stock movements' },
    { code: 'inventory.adjust', name: 'Adjust Inventory', description: 'Make stock adjustments' },
    
    // Accounting
    { code: 'accounting.view', name: 'View Accounting', description: 'View financial data' },
    { code: 'accounting.create', name: 'Create Accounting', description: 'Create journal entries' },
    { code: 'accounting.edit', name: 'Edit Accounting', description: 'Modify accounting records' },
    { code: 'accounting.reports', name: 'View Reports', description: 'Access financial reports' },
    
    // Reports
    { code: 'reports.sales', name: 'Sales Reports', description: 'Access sales reports' },
    { code: 'reports.inventory', name: 'Inventory Reports', description: 'Access inventory reports' },
    { code: 'reports.financial', name: 'Financial Reports', description: 'Access financial statements' }
  ]

  const createdPermissions = await Promise.all(
    permissions.map(p => 
      prisma.permission.create({
        data: { ...p, createdBy: users.admin.id }
      })
    )
  )

  // Admin gets all permissions
  await Promise.all(
    createdPermissions.map(permission =>
      prisma.userPermission.create({
        data: {
          userId: users.admin.id,
          permissionId: permission.id,
          grantedBy: users.admin.id
        }
      })
    )
  )

  // Sales Manager permissions
  const salesPermissions = createdPermissions.filter(p => 
    p.code.includes('customers') || 
    p.code.includes('sales') || 
    p.code === 'reports.sales' ||
    p.code === 'inventory.view'
  )

  await Promise.all(
    salesPermissions.map(permission =>
      prisma.userPermission.create({
        data: {
          userId: users.sales.id,
          permissionId: permission.id,
          grantedBy: users.admin.id
        }
      })
    )
  )

  // Accountant permissions
  const accountingPermissions = createdPermissions.filter(p => 
    p.code.includes('accounting') || 
    p.code.includes('reports.financial') ||
    p.code === 'customers.view' ||
    p.code === 'sales.view'
  )

  await Promise.all(
    accountingPermissions.map(permission =>
      prisma.userPermission.create({
        data: {
          userId: users.accountant.id,
          permissionId: permission.id,
          grantedBy: users.admin.id
        }
      })
    )
  )

  // Warehouse permissions
  const warehousePermissions = createdPermissions.filter(p => 
    p.code.includes('inventory') || 
    p.code === 'reports.inventory'
  )

  await Promise.all(
    warehousePermissions.map(permission =>
      prisma.userPermission.create({
        data: {
          userId: users.warehouse.id,
          permissionId: permission.id,
          grantedBy: users.admin.id
        }
      })
    )
  )

  // Purchasing permissions
  const purchasingPermissions = createdPermissions.filter(p => 
    p.code.includes('purchasing') || 
    p.code === 'inventory.view' ||
    p.code === 'reports.inventory'
  )

  await Promise.all(
    purchasingPermissions.map(permission =>
      prisma.userPermission.create({
        data: {
          userId: users.purchasing.id,
          permissionId: permission.id,
          grantedBy: users.admin.id
        }
      })
    )
  )
}

async function createExchangeRates(userId: string) {
  const rateDate = new Date()
  
  const rates = [
    // From AED to other currencies
    { fromCurrency: 'AED', toCurrency: 'USD', rate: 0.2723 }, // 1 AED = 0.2723 USD
    { fromCurrency: 'AED', toCurrency: 'EUR', rate: 0.2521 },
    { fromCurrency: 'AED', toCurrency: 'GBP', rate: 0.2156 },
    { fromCurrency: 'AED', toCurrency: 'INR', rate: 22.68 },
    { fromCurrency: 'AED', toCurrency: 'SAR', rate: 1.0208 },
    { fromCurrency: 'AED', toCurrency: 'KWD', rate: 0.0839 },
    { fromCurrency: 'AED', toCurrency: 'OMR', rate: 0.1048 },
    { fromCurrency: 'AED', toCurrency: 'BHD', rate: 0.1026 },
    { fromCurrency: 'AED', toCurrency: 'QAR', rate: 0.9916 },
    { fromCurrency: 'AED', toCurrency: 'SGD', rate: 0.3667 },
    { fromCurrency: 'AED', toCurrency: 'JPY', rate: 40.89 },
    
    // From USD to AED and others
    { fromCurrency: 'USD', toCurrency: 'AED', rate: 3.6725 },
    { fromCurrency: 'USD', toCurrency: 'EUR', rate: 0.9258 },
    { fromCurrency: 'USD', toCurrency: 'GBP', rate: 0.7919 },
    
    // From EUR to AED
    { fromCurrency: 'EUR', toCurrency: 'AED', rate: 3.9668 },
    
    // From GBP to AED
    { fromCurrency: 'GBP', toCurrency: 'AED', rate: 4.6368 }
  ]

  await Promise.all(
    rates.map(rate =>
      prisma.exchangeRate.create({
        data: {
          ...rate,
          rateDate,
          source: 'Central Bank UAE',
          isActive: true,
          createdBy: userId
        }
      })
    )
  )
}

async function createTaxConfiguration(userId: string) {
  // Create tax categories
  const standardCategory = await prisma.taxCategory.create({
    data: {
      code: 'STANDARD',
      name: 'Standard Rated',
      description: 'Standard VAT rated supplies',
      isActive: true,
      isDefault: true,
      createdBy: userId
    }
  })

  const zeroRatedCategory = await prisma.taxCategory.create({
    data: {
      code: 'ZERO',
      name: 'Zero Rated',
      description: 'Zero-rated supplies',
      isActive: true,
      createdBy: userId
    }
  })

  const exemptCategory = await prisma.taxCategory.create({
    data: {
      code: 'EXEMPT',
      name: 'Exempt',
      description: 'VAT exempt supplies',
      isActive: true,
      createdBy: userId
    }
  })

  // Create tax rates
  const vatRate = await prisma.taxRate.create({
    data: {
      code: 'VAT5',
      name: 'UAE VAT 5%',
      description: 'Standard UAE VAT rate',
      rate: 5,
      categoryId: standardCategory.id,
      taxType: 'SALES',
      appliesTo: 'ALL',
      isActive: true,
      isDefault: true,
      createdBy: userId
    }
  })

  const zeroRate = await prisma.taxRate.create({
    data: {
      code: 'VAT0',
      name: 'UAE VAT 0%',
      description: 'Zero-rated VAT',
      rate: 0,
      categoryId: zeroRatedCategory.id,
      taxType: 'SALES',
      appliesTo: 'ALL',
      isActive: true,
      createdBy: userId
    }
  })

  const reverseChargeRate = await prisma.taxRate.create({
    data: {
      code: 'RCM',
      name: 'Reverse Charge',
      description: 'Reverse charge mechanism for imports',
      rate: 5,
      categoryId: standardCategory.id,
      taxType: 'PURCHASE',
      appliesTo: 'IMPORT',
      isActive: true,
      createdBy: userId
    }
  })

  return { standardCategory, zeroRatedCategory, exemptCategory, vatRate, zeroRate, reverseChargeRate }
}

// Continue with remaining functions