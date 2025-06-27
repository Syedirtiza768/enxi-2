import { PurchaseOrderStatus, QuotationStatus } from "@prisma/client";
import { AccountType } from '@/lib/constants/account-type';
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { ExpenseStatus, ItemType, LocationType, MovementType, SalesCaseStatus, SalesCaseStage, SalesCaseSource, Priority, CustomerType } from "@/lib/types/shared-enums"
import { DEFAULT_CHART_OF_ACCOUNTS } from '@/lib/constants/default-accounts'

async function clearDatabase() {
  console.log('🧹 Clearing database...')
  
  // Delete in correct order to respect foreign key constraints
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
  await prisma.caseExpense.deleteMany()
  await prisma.salesCase.deleteMany()
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
  
  console.log('✅ Database cleared')
}

async function seedCompanySettings() {
  console.log('🏢 Creating company settings...')
  
  const company = await prisma.companySettings.create({
    data: {
      companyName: 'Elite Diesel Engine Services LLC',
      taxRegistrationNumber: 'TRN100289476543',
      address: '1234 Industrial Zone, Dubai, UAE',
      phone: '+971 4 123 4567',
      email: 'info@elitediesel.ae',
      website: 'www.elitediesel.ae',
      logoUrl: '/logo.png',
      defaultCurrency: 'AED',
      quotationTermsAndConditions: 'All quotations are valid for 30 days. Prices are subject to change based on material costs. Service warranty: 6 months on parts and labor.',
      quotationFooterNotes: 'Thank you for choosing Elite Diesel Engine Services. We guarantee professional service and genuine parts.',
      quotationValidityDays: 30,
      quotationPrefix: 'QT',
      quotationNumberFormat: 'PREFIX-YYYY-NNNN',
      orderPrefix: 'SO',
      orderNumberFormat: 'PREFIX-YYYY-NNNN',
      defaultOrderPaymentTerms: 'Net 30 days',
      defaultOrderShippingTerms: 'FOB Dubai',
      defaultShippingMethod: 'Customer Pickup / On-site Service',
      autoReserveInventory: true,
      requireCustomerPO: true,
      orderApprovalThreshold: 50000,
      showCompanyLogoOnQuotations: true,
      showCompanyLogoOnOrders: true,
      showTaxBreakdown: true,
      isActive: true,
    }
  })
  
  console.log('✅ Company settings created')
  return company
}

async function seedExchangeRates() {
  console.log('💱 Creating exchange rates...')
  
  const rates = [
    { fromCurrency: 'AED', toCurrency: 'USD', rate: 0.272, rateDate: new Date() },
    { fromCurrency: 'USD', toCurrency: 'AED', rate: 3.673, rateDate: new Date() },
    { fromCurrency: 'AED', toCurrency: 'EUR', rate: 0.249, rateDate: new Date() },
    { fromCurrency: 'EUR', toCurrency: 'AED', rate: 4.016, rateDate: new Date() },
    { fromCurrency: 'AED', toCurrency: 'GBP', rate: 0.215, rateDate: new Date() },
    { fromCurrency: 'GBP', toCurrency: 'AED', rate: 4.651, rateDate: new Date() },
  ]
  
  await prisma.exchangeRate.createMany({ data: rates })
  console.log('✅ Exchange rates created')
}

async function seedUsers() {
  console.log('👥 Creating users...')
  
  const hashedPassword = await bcrypt.hash('demo123', 10)
  
  const users = [
    {
      email: 'admin@elitediesel.ae',
      password: hashedPassword,
      isActive: true,
      profile: {
        create: {
          firstName: 'Admin',
          lastName: 'User',
          phone: '+971501234567',
          department: 'Management',
          jobTitle: 'System Administrator',
        }
      }
    },
    {
      email: 'service.manager@elitediesel.ae',
      password: hashedPassword,
      isActive: true,
      profile: {
        create: {
          firstName: 'Ahmed',
          lastName: 'Hassan',
          phone: '+971502345678',
          department: 'Service',
          jobTitle: 'Service Manager',
        }
      }
    },
    {
      email: 'sales@elitediesel.ae',
      password: hashedPassword,
      isActive: true,
      profile: {
        create: {
          firstName: 'Sarah',
          lastName: 'Johnson',
          phone: '+971503456789',
          department: 'Sales',
          jobTitle: 'Sales Executive',
        }
      }
    },
    {
      email: 'accountant@elitediesel.ae',
      password: hashedPassword,
      isActive: true,
      profile: {
        create: {
          firstName: 'Fatima',
          lastName: 'Al Rashid',
          phone: '+971504567890',
          department: 'Finance',
          jobTitle: 'Chief Accountant',
        }
      }
    },
    {
      email: 'warehouse@elitediesel.ae',
      password: hashedPassword,
      isActive: true,
      profile: {
        create: {
          firstName: 'Raj',
          lastName: 'Kumar',
          phone: '+971505678901',
          department: 'Warehouse',
          jobTitle: 'Warehouse Manager',
        }
      }
    },
    {
      email: 'technician1@elitediesel.ae',
      password: hashedPassword,
      isActive: true,
      profile: {
        create: {
          firstName: 'Mike',
          lastName: 'Thompson',
          phone: '+971506789012',
          department: 'Service',
          jobTitle: 'Senior Diesel Technician',
        }
      }
    },
    {
      email: 'technician2@elitediesel.ae',
      password: hashedPassword,
      isActive: true,
      profile: {
        create: {
          firstName: 'Ali',
          lastName: 'Mahmoud',
          phone: '+971507890123',
          department: 'Service',
          jobTitle: 'Diesel Technician',
        }
      }
    },
  ]
  
  for (const userData of users) {
    await prisma.user.create({ data: userData })
  }
  
  console.log('✅ Users created')
}

async function seedTaxConfiguration() {
  console.log('💰 Creating tax configuration...')
  
  // Tax categories
  const taxCategories = await prisma.taxCategory.createMany({
    data: [
      { code: 'VAT', name: 'Value Added Tax', description: 'Standard UAE VAT' },
      { code: 'EXEMPT', name: 'Tax Exempt', description: 'Items exempt from tax' },
      { code: 'ZERO', name: 'Zero Rated', description: 'Zero-rated items' },
    ]
  })
  
  // Tax rates
  const standardVat = await prisma.taxCategory.findFirst({ where: { code: 'VAT' } })
  const exempt = await prisma.taxCategory.findFirst({ where: { code: 'EXEMPT' } })
  const zero = await prisma.taxCategory.findFirst({ where: { code: 'ZERO' } })
  
  await prisma.taxRate.createMany({
    data: [
      {
        name: 'UAE VAT 5%',
        rate: 5,
        categoryId: standardVat!.id,
        isActive: true,
        effectiveFrom: new Date('2018-01-01'),
      },
      {
        name: 'Tax Exempt',
        rate: 0,
        categoryId: exempt!.id,
        isActive: true,
        effectiveFrom: new Date('2018-01-01'),
      },
      {
        name: 'Zero Rated',
        rate: 0,
        categoryId: zero!.id,
        isActive: true,
        effectiveFrom: new Date('2018-01-01'),
      },
    ]
  })
  
  console.log('✅ Tax configuration created')
}

async function seedChartOfAccounts() {
  console.log('📊 Creating chart of accounts...')
  
  // Create accounts from the default chart
  for (const accountData of DEFAULT_CHART_OF_ACCOUNTS) {
    const { parentCode, ...account } = accountData
    
    if (parentCode) {
      const parent = await prisma.account.findFirst({ where: { code: parentCode } })
      if (parent) {
        await prisma.account.create({
          data: {
            ...account,
            parentId: parent.id,
            currency: 'AED',
            isActive: true,
          }
        })
      }
    } else {
      await prisma.account.create({
        data: {
          ...account,
          currency: 'AED',
          isActive: true,
        }
      })
    }
  }
  
  console.log('✅ Chart of accounts created')
}

async function seedUnitsOfMeasure() {
  console.log('📏 Creating units of measure...')
  
  const units = [
    { code: 'PC', name: 'Piece', description: 'Individual items' },
    { code: 'SET', name: 'Set', description: 'Set of items' },
    { code: 'KG', name: 'Kilogram', description: 'Weight in kilograms' },
    { code: 'L', name: 'Liter', description: 'Volume in liters' },
    { code: 'M', name: 'Meter', description: 'Length in meters' },
    { code: 'HR', name: 'Hour', description: 'Time in hours' },
    { code: 'DAY', name: 'Day', description: 'Time in days' },
    { code: 'BOX', name: 'Box', description: 'Box of items' },
    { code: 'PACK', name: 'Pack', description: 'Package of items' },
    { code: 'DRUM', name: 'Drum', description: 'Drum container' },
  ]
  
  await prisma.unitOfMeasure.createMany({ data: units })
  console.log('✅ Units of measure created')
}

async function seedLocations() {
  console.log('📍 Creating locations...')
  
  const locations = [
    {
      code: 'MAIN-WH',
      name: 'Main Warehouse',
      type: LocationType.WAREHOUSE,
      address: '1234 Industrial Zone, Dubai',
      isActive: true,
    },
    {
      code: 'SERVICE-BAY-1',
      name: 'Service Bay 1',
      type: LocationType.STORE,
      address: 'Workshop Area A',
      isActive: true,
    },
    {
      code: 'SERVICE-BAY-2',
      name: 'Service Bay 2',
      type: LocationType.STORE,
      address: 'Workshop Area B',
      isActive: true,
    },
    {
      code: 'MOBILE-UNIT-1',
      name: 'Mobile Service Unit 1',
      type: LocationType.PRODUCTION,
      address: 'Field Service Vehicle',
      isActive: true,
    },
  ]
  
  await prisma.location.createMany({ data: locations })
  console.log('✅ Locations created')
}

async function seedCategories() {
  console.log('📦 Creating item categories...')
  
  const categories = [
    // Engine Parts
    { code: 'ENGINE-PARTS', name: 'Engine Parts', description: 'Diesel engine components' },
    { code: 'PISTONS', name: 'Pistons & Rings', description: 'Pistons and piston rings', parentCode: 'ENGINE-PARTS' },
    { code: 'VALVES', name: 'Valves & Guides', description: 'Engine valves and guides', parentCode: 'ENGINE-PARTS' },
    { code: 'BEARINGS', name: 'Bearings', description: 'Engine bearings', parentCode: 'ENGINE-PARTS' },
    { code: 'GASKETS', name: 'Gaskets & Seals', description: 'Engine gaskets and seals', parentCode: 'ENGINE-PARTS' },
    
    // Filters
    { code: 'FILTERS', name: 'Filters', description: 'All types of filters' },
    { code: 'OIL-FILTERS', name: 'Oil Filters', description: 'Engine oil filters', parentCode: 'FILTERS' },
    { code: 'FUEL-FILTERS', name: 'Fuel Filters', description: 'Diesel fuel filters', parentCode: 'FILTERS' },
    { code: 'AIR-FILTERS', name: 'Air Filters', description: 'Air intake filters', parentCode: 'FILTERS' },
    
    // Lubricants
    { code: 'LUBRICANTS', name: 'Lubricants & Fluids', description: 'Oils and fluids' },
    { code: 'ENGINE-OIL', name: 'Engine Oil', description: 'Diesel engine oils', parentCode: 'LUBRICANTS' },
    { code: 'HYDRAULIC-OIL', name: 'Hydraulic Oil', description: 'Hydraulic fluids', parentCode: 'LUBRICANTS' },
    { code: 'COOLANTS', name: 'Coolants', description: 'Engine coolants', parentCode: 'LUBRICANTS' },
    
    // Tools
    { code: 'TOOLS', name: 'Tools & Equipment', description: 'Service tools and equipment' },
    { code: 'DIAGNOSTIC', name: 'Diagnostic Tools', description: 'Engine diagnostic equipment', parentCode: 'TOOLS' },
    { code: 'HAND-TOOLS', name: 'Hand Tools', description: 'Manual service tools', parentCode: 'TOOLS' },
    
    // Services
    { code: 'SERVICES', name: 'Services', description: 'Maintenance and repair services' },
    { code: 'PREVENTIVE', name: 'Preventive Maintenance', description: 'Scheduled maintenance', parentCode: 'SERVICES' },
    { code: 'REPAIR', name: 'Repair Services', description: 'Engine repair services', parentCode: 'SERVICES' },
    { code: 'EMERGENCY', name: 'Emergency Services', description: '24/7 emergency repairs', parentCode: 'SERVICES' },
  ]
  
  // Create parent categories first
  for (const cat of categories.filter(c => !c.parentCode)) {
    await prisma.category.create({
      data: {
        code: cat.code,
        name: cat.name,
        description: cat.description,
      }
    })
  }
  
  // Create child categories
  for (const cat of categories.filter(c => c.parentCode)) {
    const parent = await prisma.category.findFirst({ where: { code: cat.parentCode } })
    if (parent) {
      await prisma.category.create({
        data: {
          code: cat.code,
          name: cat.name,
          description: cat.description,
          parentId: parent.id,
        }
      })
    }
  }
  
  console.log('✅ Categories created')
}

async function seedInventoryItems() {
  console.log('📦 Creating inventory items...')
  
  const unit = await prisma.unitOfMeasure.findFirst({ where: { code: 'PC' } })
  const taxRate = await prisma.taxRate.findFirst({ where: { name: 'UAE VAT 5%' } })
  const location = await prisma.location.findFirst({ where: { code: 'MAIN-WH' } })
  
  const items = [
    // Engine Parts - Pistons
    {
      code: 'PST-CAT-3406',
      name: 'Piston Assembly - CAT 3406',
      category: 'PISTONS',
      description: 'Complete piston assembly for Caterpillar 3406 engine',
      unitPrice: 850,
      costPrice: 600,
      reorderLevel: 10,
      reorderQuantity: 20,
    },
    {
      code: 'PST-CUM-N14',
      name: 'Piston Kit - Cummins N14',
      category: 'PISTONS',
      description: 'Piston kit with rings for Cummins N14 engine',
      unitPrice: 920,
      costPrice: 650,
      reorderLevel: 8,
      reorderQuantity: 15,
    },
    
    // Engine Parts - Valves
    {
      code: 'VLV-MTU-IN',
      name: 'Intake Valve - MTU Series',
      category: 'VALVES',
      description: 'Intake valve for MTU marine engines',
      unitPrice: 320,
      costPrice: 220,
      reorderLevel: 20,
      reorderQuantity: 40,
    },
    {
      code: 'VLV-MTU-EX',
      name: 'Exhaust Valve - MTU Series',
      category: 'VALVES',
      description: 'Exhaust valve for MTU marine engines',
      unitPrice: 380,
      costPrice: 260,
      reorderLevel: 20,
      reorderQuantity: 40,
    },
    
    // Filters
    {
      code: 'FLT-OIL-CAT',
      name: 'Oil Filter - CAT 1R-0716',
      category: 'OIL-FILTERS',
      description: 'Heavy duty oil filter for Caterpillar engines',
      unitPrice: 45,
      costPrice: 28,
      reorderLevel: 50,
      reorderQuantity: 100,
    },
    {
      code: 'FLT-FUEL-CUM',
      name: 'Fuel Filter - Cummins FF5052',
      category: 'FUEL-FILTERS',
      description: 'Primary fuel filter for Cummins engines',
      unitPrice: 38,
      costPrice: 22,
      reorderLevel: 60,
      reorderQuantity: 120,
    },
    {
      code: 'FLT-AIR-MAN',
      name: 'Air Filter - MAN 51.08401',
      category: 'AIR-FILTERS',
      description: 'Heavy duty air filter for MAN engines',
      unitPrice: 125,
      costPrice: 80,
      reorderLevel: 30,
      reorderQuantity: 50,
    },
    
    // Lubricants
    {
      code: 'OIL-15W40-20L',
      name: 'Diesel Engine Oil 15W-40 (20L)',
      category: 'ENGINE-OIL',
      description: 'Premium diesel engine oil, 20 liter drum',
      unitPrice: 280,
      costPrice: 200,
      reorderLevel: 20,
      reorderQuantity: 40,
    },
    {
      code: 'OIL-HYD-68-20L',
      name: 'Hydraulic Oil ISO 68 (20L)',
      category: 'HYDRAULIC-OIL',
      description: 'Hydraulic oil ISO VG 68, 20 liter drum',
      unitPrice: 240,
      costPrice: 170,
      reorderLevel: 15,
      reorderQuantity: 30,
    },
    {
      code: 'COOL-ELC-20L',
      name: 'Extended Life Coolant (20L)',
      category: 'COOLANTS',
      description: 'Extended life coolant for diesel engines',
      unitPrice: 180,
      costPrice: 120,
      reorderLevel: 25,
      reorderQuantity: 50,
    },
    
    // Gaskets
    {
      code: 'GSK-HEAD-CAT',
      name: 'Head Gasket - CAT 3406',
      category: 'GASKETS',
      description: 'Cylinder head gasket for Caterpillar 3406',
      unitPrice: 420,
      costPrice: 300,
      reorderLevel: 5,
      reorderQuantity: 10,
    },
    {
      code: 'GSK-SET-CUM',
      name: 'Gasket Set - Cummins ISX',
      category: 'GASKETS',
      description: 'Complete gasket set for Cummins ISX engine',
      unitPrice: 680,
      costPrice: 480,
      reorderLevel: 3,
      reorderQuantity: 8,
    },
    
    // Services
    {
      code: 'SRV-PM-500',
      name: '500 Hour Preventive Maintenance',
      category: 'PREVENTIVE',
      description: 'Complete 500-hour service package',
      unitPrice: 2500,
      costPrice: 1200,
      reorderLevel: 0,
      reorderQuantity: 0,
      isService: true,
    },
    {
      code: 'SRV-DIAG',
      name: 'Engine Diagnostic Service',
      category: 'REPAIR',
      description: 'Comprehensive engine diagnostics',
      unitPrice: 800,
      costPrice: 300,
      reorderLevel: 0,
      reorderQuantity: 0,
      isService: true,
    },
    {
      code: 'SRV-EMER-24',
      name: '24/7 Emergency Call-Out',
      category: 'EMERGENCY',
      description: 'Emergency service call-out charge',
      unitPrice: 1500,
      costPrice: 600,
      reorderLevel: 0,
      reorderQuantity: 0,
      isService: true,
    },
  ]
  
  // Get GL accounts
  const inventoryAccount = await prisma.account.findFirst({ where: { code: '1300' } })
  const cogsAccount = await prisma.account.findFirst({ where: { code: '5100' } })
  const revenueAccount = await prisma.account.findFirst({ where: { code: '4200' } })
  
  for (const itemData of items) {
    const category = await prisma.category.findFirst({ where: { code: itemData.category } })
    
    const item = await prisma.item.create({
      data: {
        code: itemData.code,
        name: itemData.name,
        description: itemData.description,
        categoryId: category?.id,
        unitOfMeasureId: unit!.id,
        unitPrice: itemData.unitPrice,
        costPrice: itemData.costPrice,
        currency: 'AED',
        reorderLevel: itemData.reorderLevel,
        reorderQuantity: itemData.reorderQuantity,
        isActive: true,
        isService: itemData.isService || false,
        inventoryAccountId: itemData.isService ? null : inventoryAccount?.id,
        cogsAccountId: cogsAccount?.id,
        revenueAccountId: revenueAccount?.id,
      }
    })
    
    // Add tax rate
    if (taxRate) {
      await prisma.itemTax.create({
        data: {
          itemId: item.id,
          taxRateId: taxRate.id,
        }
      })
    }
    
    // Add initial stock for non-service items
    if (!itemData.isService && location) {
      const initialStock = Math.floor(Math.random() * 50) + 20
      await prisma.stockMovement.create({
        data: {
          itemId: item.id,
          locationId: location.id,
          quantity: initialStock,
          type: MovementType.ADJUSTMENT,
          unitCost: itemData.costPrice,
          totalCost: initialStock * itemData.costPrice,
          currency: 'AED',
          referenceType: 'MANUAL',
          referenceNumber: 'OPENING-BALANCE',
          notes: 'Initial stock balance',
        }
      })
    }
  }
  
  console.log('✅ Inventory items created')
}

async function seedCustomers() {
  console.log('👥 Creating customers...')
  
  const customers = [
    {
      code: 'CUST-001',
      name: 'Abu Dhabi Ports Company',
      tradeName: 'AD Ports',
      taxNumber: 'TRN100123456789',
      customerType: 'BUSINESS',
      website: 'www.adports.ae',
      email: 'procurement@adports.ae',
      phone: '+971 2 695 2000',
      currency: 'AED',
      creditLimit: 500000,
      paymentTerms: 30,
      billingAddress: 'Zayed Port, Abu Dhabi, UAE',
      shippingAddress: 'Zayed Port, Abu Dhabi, UAE',
      contacts: {
        create: [
          {
            firstName: 'Mohammed',
            lastName: 'Al Hameli',
            email: 'mohammed.alhameli@adports.ae',
            phone: '+971 50 123 4567',
            position: 'Maintenance Manager',
            isPrimary: true,
          }
        ]
      }
    },
    {
      code: 'CUST-002',
      name: 'Emirates National Oil Company',
      tradeName: 'ENOC',
      taxNumber: 'TRN100234567890',
      customerType: 'BUSINESS',
      website: 'www.enoc.com',
      email: 'maintenance@enoc.com',
      phone: '+971 4 501 5555',
      currency: 'AED',
      creditLimit: 750000,
      paymentTerms: 45,
      billingAddress: 'ENOC House 1, Sheikh Zayed Road, Dubai',
      shippingAddress: 'Jebel Ali Refinery, Dubai',
      contacts: {
        create: [
          {
            firstName: 'Ahmed',
            lastName: 'Hassan',
            email: 'ahmed.hassan@enoc.com',
            phone: '+971 50 234 5678',
            position: 'Technical Services Head',
            isPrimary: true,
          }
        ]
      }
    },
    {
      code: 'CUST-003',
      name: 'Dubai Maritime City Authority',
      tradeName: 'DMCA',
      taxNumber: 'TRN100345678901',
      customerType: 'BUSINESS',
      website: 'www.dmca.ae',
      email: 'operations@dmca.ae',
      phone: '+971 4 345 5555',
      currency: 'AED',
      creditLimit: 300000,
      paymentTerms: 60,
      billingAddress: 'Dubai Maritime City, Dubai',
      shippingAddress: 'Dubai Maritime City, Dubai',
    },
    {
      code: 'CUST-004',
      name: 'Gulf Marine Services LLC',
      tradeName: 'GMS',
      taxNumber: 'TRN100456789012',
      customerType: 'BUSINESS',
      website: 'www.gmsuae.com',
      email: 'fleet@gmsuae.com',
      phone: '+971 2 678 9000',
      currency: 'AED',
      creditLimit: 200000,
      paymentTerms: 30,
      billingAddress: 'Mussafah Industrial Area, Abu Dhabi',
      shippingAddress: 'Mussafah Port, Abu Dhabi',
    },
    {
      code: 'CUST-005',
      name: 'Sharjah Electricity & Water Authority',
      tradeName: 'SEWA',
      taxNumber: 'TRN100567890123',
      customerType: 'BUSINESS',
      website: 'www.sewa.gov.ae',
      email: 'maintenance@sewa.gov.ae',
      phone: '+971 6 528 8888',
      currency: 'AED',
      creditLimit: 400000,
      paymentTerms: 45,
      billingAddress: 'Al Layyah Area, Sharjah',
      shippingAddress: 'Power Station, Sharjah',
    },
  ]
  
  for (const customerData of customers) {
    await prisma.customer.create({ data: customerData })
  }
  
  console.log('✅ Customers created')
}

async function seedSuppliers() {
  console.log('🏭 Creating suppliers...')
  
  const suppliers = [
    {
      code: 'SUPP-001',
      name: 'Caterpillar Emirates LLC',
      tradeName: 'CAT Emirates',
      taxNumber: 'TRN200123456789',
      email: 'sales@cat-emirates.ae',
      phone: '+971 4 885 3333',
      website: 'www.cat.com/emirates',
      currency: 'AED',
      paymentTerms: 30,
      address: 'Jebel Ali Free Zone, Dubai',
      city: 'Dubai',
      country: 'UAE',
      bankName: 'Emirates NBD',
      bankAccount: 'AE123456789012345678901',
      contactPerson: 'John Smith',
      contactEmail: 'john.smith@cat-emirates.ae',
      contactPhone: '+971 50 111 2222',
    },
    {
      code: 'SUPP-002',
      name: 'Cummins Middle East FZE',
      tradeName: 'Cummins ME',
      taxNumber: 'TRN200234567890',
      email: 'parts@cummins-me.com',
      phone: '+971 4 883 5200',
      website: 'www.cummins.com',
      currency: 'AED',
      paymentTerms: 45,
      address: 'Dubai Investment Park',
      city: 'Dubai',
      country: 'UAE',
      bankName: 'Standard Chartered',
      bankAccount: 'AE987654321098765432109',
    },
    {
      code: 'SUPP-003',
      name: 'Gulf Filters & Parts Trading',
      tradeName: 'Gulf Filters',
      taxNumber: 'TRN200345678901',
      email: 'sales@gulffilters.ae',
      phone: '+971 4 338 4444',
      currency: 'AED',
      paymentTerms: 30,
      address: 'Al Quoz Industrial Area',
      city: 'Dubai',
      country: 'UAE',
      bankName: 'Abu Dhabi Commercial Bank',
      bankAccount: 'AE112233445566778899001',
    },
    {
      code: 'SUPP-004',
      name: 'Shell Lubricants UAE',
      tradeName: 'Shell',
      taxNumber: 'TRN200456789012',
      email: 'lubricants@shell.ae',
      phone: '+971 4 332 1111',
      website: 'www.shell.ae',
      currency: 'AED',
      paymentTerms: 30,
      address: 'Sheikh Zayed Road',
      city: 'Dubai',
      country: 'UAE',
      bankName: 'HSBC',
      bankAccount: 'AE998877665544332211009',
    },
    {
      code: 'SUPP-005',
      name: 'Industrial Tools & Equipment LLC',
      tradeName: 'ITE',
      taxNumber: 'TRN200567890123',
      email: 'info@ite-uae.com',
      phone: '+971 2 555 6666',
      currency: 'AED',
      paymentTerms: 15,
      address: 'Mussafah Industrial Area',
      city: 'Abu Dhabi',
      country: 'UAE',
      bankName: 'First Abu Dhabi Bank',
      bankAccount: 'AE667788990011223344556',
    },
  ]
  
  for (const supplierData of suppliers) {
    await prisma.supplier.create({ data: supplierData })
  }
  
  console.log('✅ Suppliers created')
}

async function seedSampleTransactions() {
  console.log('💼 Creating sample transactions...')
  
  // Get users
  const salesUser = await prisma.user.findFirst({ where: { email: 'sales@elitediesel.ae' } })
  const serviceManager = await prisma.user.findFirst({ where: { email: 'service.manager@elitediesel.ae' } })
  
  // Get customers
  const adPorts = await prisma.customer.findFirst({ where: { code: 'CUST-001' } })
  const enoc = await prisma.customer.findFirst({ where: { code: 'CUST-002' } })
  
  // Create sales cases
  const salesCase1 = await prisma.salesCase.create({
    data: {
      caseNumber: 'SC-2024-001',
      title: 'Generator Engine Overhaul - AD Ports',
      customerId: adPorts!.id,
      assignedToId: salesUser!.id,
      status: SalesCaseStatus.ACTIVE,
      priority: Priority.HIGH,
      estimatedValue: 75000,
      currency: 'AED',
      probability: 80,
      expectedCloseDate: new Date('2024-02-15'),
      description: 'Complete overhaul of 3 generator engines at Zayed Port facility',
      stage: SalesCaseStage.PROPOSAL,
      source: SalesCaseSource.EXISTING_CUSTOMER,
      notes: 'Customer requires 24/7 support during overhaul period',
    }
  })
  
  // Add expenses to sales case
  const expenseAccounts = {
    parts: await prisma.account.findFirst({ where: { code: '6510' } }),
    labor: await prisma.account.findFirst({ where: { code: '6110' } }),
    travel: await prisma.account.findFirst({ where: { code: '6610' } }),
  }
  
  await prisma.caseExpense.createMany({
    data: [
      {
        salesCaseId: salesCase1.id,
        expenseDate: new Date('2024-01-10'),
        category: 'Engine Parts',
        description: 'CAT 3406 rebuild kit',
        amount: 12500,
        currency: 'AED',
        createdById: serviceManager!.id,
        accountId: expenseAccounts.parts!.id,
        status: ExpenseStatus.APPROVED,
        approvedById: salesUser!.id,
        approvedAt: new Date('2024-01-11'),
      },
      {
        salesCaseId: salesCase1.id,
        expenseDate: new Date('2024-01-12'),
        category: 'Labor - Specialist',
        description: 'Senior technician overtime (20 hours)',
        amount: 3000,
        currency: 'AED',
        createdById: serviceManager!.id,
        accountId: expenseAccounts.labor!.id,
        status: ExpenseStatus.APPROVED,
        approvedById: salesUser!.id,
        approvedAt: new Date('2024-01-12'),
      },
      {
        salesCaseId: salesCase1.id,
        expenseDate: new Date('2024-01-08'),
        category: 'Travel - Service Call',
        description: 'Site visit to Abu Dhabi (2 technicians)',
        amount: 850,
        currency: 'AED',
        createdById: serviceManager!.id,
        accountId: expenseAccounts.travel!.id,
        status: ExpenseStatus.PENDING,
      },
    ]
  })
  
  // Create quotation
  const items = await prisma.item.findMany({ take: 5 })
  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2024-001',
      customerId: adPorts!.id,
      salesCaseId: salesCase1.id,
      quotationDate: new Date('2024-01-15'),
      validUntil: new Date('2024-02-15'),
      status: QuotationStatus.SENT,
      currency: 'AED',
      exchangeRate: 1,
      paymentTerms: '30 days from invoice date',
      deliveryTerms: 'Service at customer site',
      totalAmount: 75000,
      taxAmount: 3750,
      grandTotal: 78750,
      notes: 'Price includes 24/7 support during overhaul period',
      createdById: salesUser!.id,
      items: {
        create: [
          {
            itemId: items[0].id,
            description: items[0].description || '',
            quantity: 3,
            unitPrice: 15000,
            discount: 0,
            taxAmount: 2250,
            totalAmount: 47250,
          },
          {
            itemId: items[13].id, // Service item
            description: 'Complete engine overhaul service',
            quantity: 3,
            unitPrice: 10000,
            discount: 0,
            taxAmount: 1500,
            totalAmount: 31500,
          }
        ]
      }
    }
  })
  
  // Create purchase order to supplier
  const supplier = await prisma.supplier.findFirst({ where: { code: 'SUPP-001' } })
  const purchaseOrder = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2024-001',
      supplierId: supplier!.id,
      orderDate: new Date('2024-01-05'),
      expectedDate: new Date('2024-01-12'),
      status: PurchaseOrderStatus.APPROVED,
      currency: 'AED',
      totalAmount: 12500,
      taxAmount: 625,
      grandTotal: 13125,
      paymentTerms: 30,
      shippingAddress: 'Main Warehouse, Dubai',
      notes: 'Urgent - Required for AD Ports project',
      createdById: serviceManager!.id,
      items: {
        create: [
          {
            itemId: items[0].id,
            quantity: 3,
            unitPrice: 4000,
            discount: 0,
            taxAmount: 600,
            totalAmount: 12600,
          }
        ]
      }
    }
  })
  
  console.log('✅ Sample transactions created')
}

async function main() {
  try {
    console.log('🚀 Starting comprehensive seed...')
    
    await clearDatabase()
    await seedCompanySettings()
    await seedExchangeRates()
    await seedUsers()
    await seedTaxConfiguration()
    await seedChartOfAccounts()
    await seedUnitsOfMeasure()
    await seedLocations()
    await seedCategories()
    await seedInventoryItems()
    await seedCustomers()
    await seedSuppliers()
    await seedSampleTransactions()
    
    console.log('✅ Comprehensive seed completed successfully!')
  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })