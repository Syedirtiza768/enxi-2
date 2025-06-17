#!/usr/bin/env tsx

import { PrismaClient } from '@/lib/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface SeedOptions {
  includeDemo?: boolean;
  clearDatabase?: boolean;
  verbose?: boolean;
}

async function seedCompanySettings() {
  console.log('🏢 Seeding company settings...');
  
  const existingSettings = await prisma.companySettings.findFirst();
  
  if (!existingSettings) {
    await prisma.companySettings.create({
      data: {
        companyName: process.env.COMPANY_NAME || 'Enxi ERP Demo Company',
        email: process.env.COMPANY_EMAIL || 'info@enxierp.com',
        phone: process.env.COMPANY_PHONE || '+1234567890',
        website: process.env.COMPANY_WEBSITE || 'https://enxierp.com',
        address: process.env.COMPANY_ADDRESS || '123 Business Street, Dubai, UAE 00000',
        logoUrl: process.env.COMPANY_LOGO_URL || '/logo.png',
        defaultCurrency: process.env.DEFAULT_CURRENCY || 'AED',
        taxRegistrationNumber: process.env.COMPANY_TAX_NUMBER || 'TRN123456789',
        
        // Quotation settings
        quotationPrefix: 'QT',
        quotationNumberFormat: 'PREFIX-YYYY-NNNN',
        quotationTermsAndConditions: 'Payment due within 30 days. Prices are subject to change.',
        quotationFooterNotes: 'Thank you for your business!',
        quotationValidityDays: 30,
        
        // Sales order settings
        orderPrefix: 'SO',
        orderNumberFormat: 'PREFIX-YYYY-NNNN',
        defaultOrderPaymentTerms: 'Payment due upon delivery.',
        defaultOrderShippingTerms: 'FOB Destination',
        
        // Other settings from schema
        showCompanyLogoOnQuotations: true,
        showCompanyLogoOnOrders: true,
        showTaxBreakdown: true,
        autoReserveInventory: true,
        requireCustomerPO: false,
        isActive: true,
        
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('✅ Company settings created');
  } else {
    console.log('ℹ️  Company settings already exist');
  }
}

async function seedPermissions() {
  console.log('🔐 Seeding permissions...');
  
  const modules = [
    'dashboard', 'leads', 'customers', 'quotations', 'sales_orders', 
    'invoices', 'payments', 'inventory', 'items', 'categories',
    'suppliers', 'purchase_orders', 'shipments', 'accounting', 
    'reports', 'settings', 'users', 'permissions', 'audit_logs'
  ];
  
  const actions = ['view', 'create', 'update', 'delete', 'export', 'import'];
  
  for (const module of modules) {
    for (const action of actions) {
      const code = `${module}.${action}`;
      await prisma.permission.upsert({
        where: { code },
        update: {},
        create: {
          code,
          name: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module.replace('_', ' ')}`,
          description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module.replace('_', ' ')}`,
          module,
          action
        }
      });
    }
  }
  
  console.log('✅ Permissions seeded');
}

async function seedRolePermissions() {
  console.log('👥 Assigning permissions to roles...');
  
  // Assign all permissions to ADMIN role
  const allPermissions = await prisma.permission.findMany();
  
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role: 'ADMIN',
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        role: 'ADMIN',
        permissionId: permission.id
      }
    });
  }
  
  // Assign specific permissions to other roles
  const salesPermissions = await prisma.permission.findMany({
    where: {
      module: {
        in: ['leads', 'customers', 'quotations', 'sales_orders', 'invoices']
      }
    }
  });
  
  for (const permission of salesPermissions) {
    // Manager gets all sales permissions
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role: 'MANAGER',
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        role: 'MANAGER',
        permissionId: permission.id
      }
    });
    
    // Sales Rep gets limited permissions (no delete)
    if (permission.action !== 'delete') {
      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role: 'SALES_REP',
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          role: 'SALES_REP',
          permissionId: permission.id
        }
      });
    }
  }
  
  console.log('✅ Role permissions assigned');
}

async function seedUsers() {
  console.log('👤 Seeding users...');
  
  const hashedPassword = await bcrypt.hash(process.env.DEFAULT_PASSWORD || 'demo123', 10);
  
  const users = [
    {
      username: 'admin',
      email: 'admin@enxierp.com',
      fullName: 'System Administrator',
      role: 'ADMIN'
    },
    {
      username: 'sales.manager',
      email: 'sales.manager@enxierp.com',
      fullName: 'John Smith',
      role: 'MANAGER'
    },
    {
      username: 'sales.rep',
      email: 'sales.rep@enxierp.com',
      fullName: 'Jane Doe',
      role: 'SALES_REP'
    },
    {
      username: 'accountant',
      email: 'accountant@enxierp.com',
      fullName: 'Robert Johnson',
      role: 'ACCOUNTANT'
    },
    {
      username: 'warehouse',
      email: 'warehouse@enxierp.com',
      fullName: 'Mike Wilson',
      role: 'WAREHOUSE'
    }
  ];
  
  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: {},
      create: {
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        isActive: true,
        role: userData.role as any,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
      
    // Create user profile
    const nameParts = userData.fullName.split(' ');
    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' ') || nameParts[0],
        language: 'en',
        timezone: 'UTC'
      }
    });
  }
  
  console.log('✅ Users seeded');
}

async function seedChartOfAccounts() {
  console.log('📊 Seeding chart of accounts...');
  
  const accounts = [
    // Assets (1000-1999)
    { code: '1000', name: 'Cash', type: 'ASSET' as const },
    { code: '1010', name: 'Petty Cash', type: 'ASSET' as const },
    { code: '1100', name: 'Bank Accounts', type: 'ASSET' as const },
    { code: '1200', name: 'Accounts Receivable', type: 'ASSET' as const },
    { code: '1300', name: 'Inventory', type: 'ASSET' as const },
    { code: '1400', name: 'Prepaid Expenses', type: 'ASSET' as const },
    { code: '1500', name: 'Property, Plant & Equipment', type: 'ASSET' as const },
    { code: '1600', name: 'Accumulated Depreciation', type: 'ASSET' as const },
    
    // Liabilities (2000-2999)
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' as const },
    { code: '2100', name: 'Accrued Expenses', type: 'LIABILITY' as const },
    { code: '2200', name: 'Sales Tax Payable', type: 'LIABILITY' as const },
    { code: '2300', name: 'Wages Payable', type: 'LIABILITY' as const },
    { code: '2500', name: 'Long-term Loans', type: 'LIABILITY' as const },
    
    // Equity (3000-3999)
    { code: '3000', name: 'Owner\'s Capital', type: 'EQUITY' as const },
    { code: '3100', name: 'Owner\'s Drawings', type: 'EQUITY' as const },
    { code: '3200', name: 'Retained Earnings', type: 'EQUITY' as const },
    
    // Income (4000-4999)
    { code: '4000', name: 'Sales Revenue', type: 'INCOME' as const },
    { code: '4100', name: 'Service Revenue', type: 'INCOME' as const },
    { code: '4200', name: 'Interest Income', type: 'INCOME' as const },
    { code: '4300', name: 'Discount Received', type: 'INCOME' as const },
    
    // Expenses (5000-5999)
    { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' as const },
    { code: '5100', name: 'Salaries & Wages', type: 'EXPENSE' as const },
    { code: '5200', name: 'Rent Expense', type: 'EXPENSE' as const },
    { code: '5300', name: 'Utilities Expense', type: 'EXPENSE' as const },
    { code: '5400', name: 'Office Supplies', type: 'EXPENSE' as const },
    { code: '5500', name: 'Depreciation Expense', type: 'EXPENSE' as const },
    { code: '5600', name: 'Insurance Expense', type: 'EXPENSE' as const },
    { code: '5700', name: 'Marketing & Advertising', type: 'EXPENSE' as const },
    { code: '5800', name: 'Professional Fees', type: 'EXPENSE' as const },
    { code: '5900', name: 'Bank Charges', type: 'EXPENSE' as const }
  ];
  
  for (const account of accounts) {
    await prisma.account.upsert({
      where: { code: account.code },
      update: {},
      create: {
        ...account,
        balance: 0,
        createdBy: 'system',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }
  
  console.log('✅ Chart of accounts seeded');
}

async function seedTaxConfiguration() {
  console.log('💰 Seeding tax configuration...');
  
  // Create tax categories
  const taxCategories = [
    { code: 'STANDARD', name: 'Standard Rate', description: 'Standard tax rate' },
    { code: 'REDUCED', name: 'Reduced Rate', description: 'Reduced tax rate' },
    { code: 'ZERO', name: 'Zero Rate', description: 'Zero-rated items' },
    { code: 'EXEMPT', name: 'Tax Exempt', description: 'Tax exempt items' }
  ];
  
  for (const category of taxCategories) {
    await prisma.taxCategory.upsert({
      where: { code: category.code },
      update: {},
      create: {
        ...category,
        createdBy: 'system'
      }
    });
  }
  
  // Create tax rates
  const salesTaxAccount = await prisma.account.findFirst({ where: { code: '2200' } });
  
  if (salesTaxAccount) {
    const taxRates = [
      { 
        name: 'Standard VAT', 
        rate: 5, 
        categoryCode: 'STANDARD',
        accountId: salesTaxAccount.id,
        isDefault: true
      },
      { 
        name: 'Zero VAT', 
        rate: 0, 
        categoryCode: 'ZERO',
        accountId: salesTaxAccount.id,
        isDefault: false
      }
    ];
    
    for (const taxRate of taxRates) {
      const category = await prisma.taxCategory.findUnique({ 
        where: { code: taxRate.categoryCode } 
      });
      
      if (category) {
        await prisma.taxRate.upsert({
          where: { 
            code: taxRate.name.toLowerCase().replace(/\s+/g, '_')
          },
          update: {},
          create: {
            code: taxRate.name.toLowerCase().replace(/\s+/g, '_'),
            name: taxRate.name,
            rate: taxRate.rate,
            categoryId: category.id,
            collectedAccountId: taxRate.accountId,
            paidAccountId: taxRate.accountId,
            isActive: true,
            isDefault: taxRate.isDefault,
            effectiveFrom: new Date(),
            createdBy: 'system',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
    }
  }
  
  console.log('✅ Tax configuration seeded');
}

async function seedLocations() {
  console.log('📍 Seeding locations...');
  
  const locations = [
    {
      locationCode: 'MAIN',
      name: 'Main Warehouse',
      type: 'WAREHOUSE',
      address: '123 Warehouse Street',
      city: 'Dubai',
      country: 'UAE',
      isActive: true,
      isDefault: true
    },
    {
      locationCode: 'SHOWROOM',
      name: 'Showroom',
      type: 'STORE',
      address: '456 Retail Avenue',
      city: 'Dubai',
      country: 'UAE',
      isActive: true,
      isDefault: false
    }
  ];
  
  for (const location of locations) {
    await prisma.location.upsert({
      where: { locationCode: location.locationCode },
      update: {},
      create: {
        ...location,
        createdBy: 'system'
      }
    });
  }
  
  console.log('✅ Locations seeded');
}

async function seedCategoriesAndUOM() {
  console.log('📦 Seeding categories and units of measure...');
  
  // Create units of measure
  const uoms = [
    { code: 'PCS', name: 'Pieces', symbol: 'pcs', isBaseUnit: true },
    { code: 'KG', name: 'Kilogram', symbol: 'kg', isBaseUnit: true },
    { code: 'G', name: 'Gram', symbol: 'g', baseUnitCode: 'KG', conversionFactor: 0.001 },
    { code: 'L', name: 'Liter', symbol: 'L', isBaseUnit: true },
    { code: 'ML', name: 'Milliliter', symbol: 'mL', baseUnitCode: 'L', conversionFactor: 0.001 },
    { code: 'M', name: 'Meter', symbol: 'm', isBaseUnit: true },
    { code: 'CM', name: 'Centimeter', symbol: 'cm', baseUnitCode: 'M', conversionFactor: 0.01 },
    { code: 'BOX', name: 'Box', symbol: 'box', isBaseUnit: true },
    { code: 'PACK', name: 'Pack', symbol: 'pack', isBaseUnit: true },
    { code: 'HR', name: 'Hour', symbol: 'hr', isBaseUnit: true },
    { code: 'DAY', name: 'Day', symbol: 'day', isBaseUnit: true }
  ];
  
  // First create base units
  for (const uom of uoms.filter(u => u.isBaseUnit)) {
    await prisma.unitOfMeasure.upsert({
      where: { code: uom.code },
      update: {},
      create: {
        code: uom.code,
        name: uom.name,
        symbol: uom.symbol,
        isBaseUnit: true,
        conversionFactor: 1,
        isActive: true,
        createdBy: 'system'
      }
    });
  }
  
  // Then create derived units
  for (const uom of uoms.filter(u => !u.isBaseUnit)) {
    const baseUnit = await prisma.unitOfMeasure.findUnique({
      where: { code: uom.baseUnitCode }
    });
    
    if (baseUnit) {
      await prisma.unitOfMeasure.upsert({
        where: { code: uom.code },
        update: {},
        create: {
          code: uom.code,
          name: uom.name,
          symbol: uom.symbol,
          baseUnitId: baseUnit.id,
          conversionFactor: uom.conversionFactor || 1,
          isActive: true,
          createdBy: 'system'
        }
      });
    }
  }
  
  // Create categories
  const categories = [
    { code: 'ELECTRONICS', name: 'Electronics', description: 'Electronic items and components' },
    { code: 'OFFICE', name: 'Office Supplies', description: 'Office and stationery items' },
    { code: 'HARDWARE', name: 'Hardware', description: 'Tools and hardware items' },
    { code: 'SOFTWARE', name: 'Software', description: 'Software licenses and subscriptions' },
    { code: 'SERVICES', name: 'Services', description: 'Professional and consulting services' },
    { code: 'RAW', name: 'Raw Materials', description: 'Raw materials and components' },
    { code: 'FINISHED', name: 'Finished Goods', description: 'Completed products ready for sale' }
  ];
  
  for (const category of categories) {
    await prisma.category.upsert({
      where: { code: category.code },
      update: {},
      create: {
        code: category.code,
        name: category.name,
        description: category.description,
        isActive: true,
        createdBy: 'system'
      }
    });
  }
  
  // Create subcategories
  const electronicsCategory = await prisma.category.findUnique({ 
    where: { code: 'ELECTRONICS' } 
  });
  
  if (electronicsCategory) {
    const subcategories = [
      { code: 'COMPUTERS', name: 'Computers & Laptops', parentId: electronicsCategory.id },
      { code: 'MOBILES', name: 'Mobile Devices', parentId: electronicsCategory.id },
      { code: 'ACCESSORIES', name: 'Accessories', parentId: electronicsCategory.id }
    ];
    
    for (const subcategory of subcategories) {
      await prisma.category.upsert({
        where: { code: subcategory.code },
        update: {},
        create: {
          code: subcategory.code,
          name: subcategory.name,
          parentId: subcategory.parentId,
          isActive: true,
          createdBy: 'system'
        }
      });
    }
  }
  
  console.log('✅ Categories and units of measure seeded');
}

async function seedBasicItems() {
  console.log('🛍️ Seeding basic items...');
  
  const inventoryAccount = await prisma.account.findFirst({ where: { code: '1300' } });
  const cogsAccount = await prisma.account.findFirst({ where: { code: '5000' } });
  const salesAccount = await prisma.account.findFirst({ where: { code: '4000' } });
  const serviceAccount = await prisma.account.findFirst({ where: { code: '4100' } });
  
  const electronicsCategory = await prisma.category.findUnique({ where: { code: 'ELECTRONICS' } });
  const officeCategory = await prisma.category.findUnique({ where: { code: 'OFFICE' } });
  const servicesCategory = await prisma.category.findUnique({ where: { code: 'SERVICES' } });
  
  const pcsUom = await prisma.unitOfMeasure.findUnique({ where: { code: 'PCS' } });
  const hrUom = await prisma.unitOfMeasure.findUnique({ where: { code: 'HR' } });
  
  const standardTax = await prisma.taxRate.findFirst({ where: { name: 'Standard VAT' } });
  const zeroTax = await prisma.taxRate.findFirst({ where: { name: 'Zero VAT' } });
  
  if (inventoryAccount && cogsAccount && salesAccount && serviceAccount && 
      electronicsCategory && officeCategory && servicesCategory && 
      pcsUom && hrUom && standardTax && zeroTax) {
    
    const items = [
      {
        code: 'LAPTOP-001',
        name: 'Business Laptop Pro',
        description: 'High-performance business laptop with 16GB RAM and 512GB SSD',
        type: 'PRODUCT' as const,
        categoryId: electronicsCategory.id,
        unitOfMeasureId: pcsUom.id,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        salesAccountId: salesAccount.id,
        standardCost: 800,
        listPrice: 1200,
        minStockLevel: 10,
        reorderPoint: 15,
        isActive: true,
        trackInventory: true
      },
      {
        code: 'MOUSE-001',
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse with USB receiver',
        type: 'PRODUCT' as const,
        categoryId: electronicsCategory.id,
        unitOfMeasureId: pcsUom.id,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        salesAccountId: salesAccount.id,
        standardCost: 15,
        listPrice: 25,
        minStockLevel: 50,
        reorderPoint: 75,
        isActive: true,
        trackInventory: true
      },
      {
        code: 'PAPER-A4',
        name: 'A4 Paper (500 sheets)',
        description: 'Premium quality A4 paper, 80gsm',
        type: 'PRODUCT' as const,
        categoryId: officeCategory.id,
        unitOfMeasureId: pcsUom.id,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        salesAccountId: salesAccount.id,
        standardCost: 5,
        listPrice: 8,
        minStockLevel: 100,
        reorderPoint: 150,
        isActive: true,
        trackInventory: true
      },
      {
        code: 'CONSULT-001',
        name: 'IT Consultation',
        description: 'Professional IT consultation services',
        type: 'SERVICE' as const,
        categoryId: servicesCategory.id,
        unitOfMeasureId: hrUom.id,
        salesAccountId: serviceAccount.id,
        listPrice: 150,
        isActive: true,
        trackInventory: false
      },
      {
        code: 'SUPPORT-001',
        name: 'Technical Support',
        description: 'On-site technical support services',
        type: 'SERVICE' as const,
        categoryId: servicesCategory.id,
        unitOfMeasureId: hrUom.id,
        salesAccountId: serviceAccount.id,
        listPrice: 100,
        isActive: true,
        trackInventory: false
      }
    ];
    
    for (const item of items) {
      await prisma.item.upsert({
        where: { code: item.code },
        update: {},
        create: {
          ...item,
          createdBy: 'system'
        }
      });
    }
  }
  
  console.log('✅ Basic items seeded');
}

async function seedDemoCustomersAndSuppliers() {
  console.log('👥 Seeding demo customers and suppliers...');
  
  const arAccount = await prisma.account.findFirst({ where: { code: '1200' } });
  const apAccount = await prisma.account.findFirst({ where: { code: '2000' } });
  
  if (arAccount && apAccount) {
    // Create customers
    const customers = [
      {
        customerNumber: 'CUST-001',
        name: 'ABC Corporation',
        email: 'contact@abccorp.com',
        phone: '+971501234567',
        address: '123 Business Bay, Dubai, UAE',
        taxId: 'TRN100234567890',
        creditLimit: 50000,
        paymentTerms: 30,
        currency: 'AED'
      },
      {
        customerNumber: 'CUST-002',
        name: 'XYZ Industries',
        email: 'info@xyzind.com',
        phone: '+971502345678',
        address: '456 Sheikh Zayed Road, Dubai, UAE',
        taxId: 'TRN100345678901',
        creditLimit: 75000,
        paymentTerms: 45,
        currency: 'AED'
      },
      {
        customerNumber: 'CUST-003',
        name: 'Global Tech Solutions',
        email: 'sales@globaltech.com',
        phone: '+971503456789',
        address: '789 DIFC, Dubai, UAE',
        taxId: 'TRN100456789012',
        creditLimit: 100000,
        paymentTerms: 60,
        currency: 'AED'
      }
    ];
    
    for (const customer of customers) {
      await prisma.customer.upsert({
        where: { customerNumber: customer.customerNumber },
        update: {},
        create: {
          ...customer,
          createdBy: 'system'
        }
      });
    }
    
    // Create suppliers
    const suppliers = [
      {
        supplierNumber: 'SUPP-001',
        name: 'Tech Distributors LLC',
        email: 'sales@techdist.com',
        phone: '+971504567890',
        address: '321 Al Quoz, Dubai, UAE',
        taxId: 'TRN200123456789',
        paymentTerms: 30,
        currency: 'AED'
      },
      {
        supplierNumber: 'SUPP-002',
        name: 'Office Supplies Co',
        email: 'orders@officesupplies.ae',
        phone: '+971505678901',
        address: '654 Deira, Dubai, UAE',
        taxId: 'TRN200234567890',
        paymentTerms: 45,
        currency: 'AED'
      }
    ];
    
    for (const supplier of suppliers) {
      await prisma.supplier.upsert({
        where: { supplierNumber: supplier.supplierNumber },
        update: {},
        create: {
          ...supplier,
          createdBy: 'system'
        }
      });
    }
  }
  
  console.log('✅ Demo customers and suppliers seeded');
}

async function seedInitialInventory() {
  console.log('📦 Seeding initial inventory...');
  
  const mainLocation = await prisma.location.findUnique({ where: { locationCode: 'MAIN' } });
  const items = await prisma.item.findMany({ where: { type: 'PRODUCT' } });
  
  if (mainLocation && items.length > 0) {
    for (const item of items) {
      // Check if lot already exists
      const existingLot = await prisma.stockLot.findUnique({
        where: { lotNumber: `OPENING-${item.code}` }
      });
      
      if (!existingLot) {
        // Create opening stock lot
        const lot = await prisma.stockLot.create({
        data: {
          lotNumber: `OPENING-${item.code}`,
          itemId: item.id,
          receivedDate: new Date(),
          expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
          receivedQty: 100,
          availableQty: 100,
          reservedQty: 0,
          unitCost: item.standardCost || 0,
          totalCost: (item.standardCost || 0) * 100,
          isActive: true,
          createdBy: 'system'
        }
      });
      
        // Create stock movement
        const existingMovement = await prisma.stockMovement.findUnique({
          where: { movementNumber: `MOV-OPENING-${item.code}` }
        });
        
        if (!existingMovement) {
          await prisma.stockMovement.create({
            data: {
              movementNumber: `MOV-OPENING-${item.code}`,
              movementType: 'OPENING',
              movementDate: new Date(),
              itemId: item.id,
              locationId: mainLocation.id,
              unitOfMeasureId: item.unitOfMeasureId,
              quantity: 100,
              unitCost: item.standardCost || 0,
              totalCost: (item.standardCost || 0) * 100,
              referenceType: 'OPENING',
              referenceNumber: 'OPENING-BALANCE',
              stockLotId: lot.id,
              createdBy: 'system',
              notes: 'Opening balance'
            }
          });
        }
      
        // Item quantity is maintained through inventory balance records
      }
    }
  }
  
  console.log('✅ Initial inventory seeded');
}

async function seedDemoTransactions(options: SeedOptions) {
  if (!options.includeDemo) return;
  
  console.log('💼 Seeding demo transactions...');
  
  // Get necessary data
  const salesUser = await prisma.user.findUnique({ where: { username: 'sales.rep' } });
  const customer = await prisma.customer.findFirst({ where: { customerNumber: 'CUST-001' } });
  const items = await prisma.item.findMany({ take: 3 });
  const mainLocation = await prisma.location.findUnique({ where: { locationCode: 'MAIN' } });
  const standardTax = await prisma.taxRate.findFirst({ where: { code: 'standard_vat' } });
  
  if (salesUser && customer && items.length > 0 && mainLocation && standardTax) {
    // Create a lead
    const lead = await prisma.lead.create({
      data: {
        firstName: 'Demo',
        lastName: 'Lead',
        company: customer.name,
        email: 'lead@' + customer.email.split('@')[1], // Different email from customer
        phone: customer.phone,
        status: 'CONVERTED',
        source: 'REFERRAL',
        createdBy: salesUser.id
      }
    });
    
    // Create a sales case
    const salesCase = await prisma.salesCase.create({
      data: {
        caseNumber: 'CASE-DEMO-001',
        title: 'Demo Sales Opportunity',
        description: 'Initial sales opportunity for demo',
        customerId: customer.id,
        status: 'OPEN',
        createdBy: salesUser.id
      }
    });
    
    // Create a quotation
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber: 'QT-2024-00001',
        salesCaseId: salesCase.id,
        status: 'ACCEPTED',
        validUntil: new Date(new Date().setDate(new Date().getDate() + 30)),
        paymentTerms: customer.paymentTerms.toString(),
        notes: 'Demo quotation',
        internalNotes: 'Created as demo data',
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
        createdBy: salesUser.id
      }
    });
    
    // Add quotation items
    let subTotal = 0;
    for (const item of items.slice(0, 2)) {
      await prisma.quotationItem.create({
        data: {
          quotationId: quotation.id,
          itemId: item.id,
          itemCode: item.code,
          description: item.name + ' - ' + (item.description || ''),
          quantity: 5,
          unitPrice: item.listPrice || 0,
          discount: 10,  // This is the discount percentage or amount
          discountAmount: 10,
          taxRateId: standardTax.id,
          taxRate: standardTax.rate,
          taxAmount: ((item.listPrice || 0) * 5 - 10) * 0.05,
          subtotal: (item.listPrice || 0) * 5,
          totalAmount: ((item.listPrice || 0) * 5 - 10) * 1.05
        }
      });
      subTotal += (item.listPrice || 0) * 5;
    }
    
    // Update quotation totals
    const discountAmount = subTotal * 0.1;
    const taxAmount = (subTotal - discountAmount) * 0.05;
    const totalAmount = subTotal - discountAmount + taxAmount + 50;
    
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        subtotal: subTotal,
        discountAmount,
        taxAmount,
        totalAmount
      }
    });
    
    // Create sales order from quotation
    const salesOrder = await prisma.salesOrder.create({
      data: {
        orderNumber: 'SO-2024-00001',
        quotationId: quotation.id,
        salesCaseId: salesCase.id,
        status: 'PENDING',
        orderDate: new Date(),
        requestedDate: new Date(new Date().setDate(new Date().getDate() + 7)),
        paymentTerms: customer.paymentTerms.toString(),
        customerPO: 'PO-123456',
        notes: 'Demo sales order',
        subtotal: quotation.subtotal,
        discountAmount: quotation.discountAmount,
        taxAmount: quotation.taxAmount,
        shippingAmount: 50,  // Adding shipping amount directly
        totalAmount: quotation.totalAmount,
        createdBy: salesUser.id
      }
    });
    
    // Copy quotation items to sales order
    const quotationItems = await prisma.quotationItem.findMany({
      where: { quotationId: quotation.id }
    });
    
    for (const qItem of quotationItems) {
      await prisma.salesOrderItem.create({
        data: {
          salesOrderId: salesOrder.id,
          itemId: qItem.itemId,
          itemCode: qItem.itemCode,
          description: qItem.description,
          quantity: qItem.quantity,
          unitPrice: qItem.unitPrice,
          discount: qItem.discount,
          discountAmount: qItem.discountAmount,
          taxRateId: qItem.taxRateId,
          taxRate: qItem.taxRate,
          taxAmount: qItem.taxAmount,
          subtotal: qItem.subtotal,
          totalAmount: qItem.totalAmount,
          quantityShipped: 0
        }
      });
    }
    
    // Update sales case status
    await prisma.salesCase.update({
      where: { id: salesCase.id },
      data: { status: 'WON' }
    });
  }
  
  console.log('✅ Demo transactions seeded');
}

async function main() {
  console.log('🚀 Starting production seed...\n');
  
  const options: SeedOptions = {
    includeDemo: process.env.INCLUDE_DEMO === 'true' || false, // Disabled for now
    clearDatabase: process.env.CLEAR_DATABASE === 'true' || false,
    verbose: process.env.VERBOSE === 'true' || true
  };
  
  try {
    // Core setup (always required)
    await seedCompanySettings();
    await seedPermissions();
    await seedRolePermissions();
    await seedUsers();
    await seedChartOfAccounts();
    await seedTaxConfiguration();
    await seedLocations();
    await seedCategoriesAndUOM();
    
    // Master data
    await seedBasicItems();
    await seedDemoCustomersAndSuppliers();
    await seedInitialInventory();
    
    // Demo transactions (optional)
    await seedDemoTransactions(options);
    
    console.log('\n✅ Production seed completed successfully!');
    console.log('\n📝 Default login credentials:');
    console.log('   Username: admin');
    console.log('   Password:', process.env.DEFAULT_PASSWORD || 'demo123');
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the seed
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });