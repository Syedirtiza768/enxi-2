import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Comprehensive E2E test data seeding
 * Creates all necessary data for end-to-end testing
 */
async function seedE2EData(): Promise<void> {
  console.log('🌱 Starting E2E data seeding...');

  try {
    // Clean existing data
    await cleanExistingData();
    
    // Seed data in order
    const users = await seedUsers();
    const company = await seedCompanySettings();
    const accounts = await seedChartOfAccounts();
    const taxRates = await seedTaxConfiguration();
    const categories = await seedInventoryCategories();
    const items = await seedInventoryItems(categories);
    const customers = await seedCustomers();
    const suppliers = await seedSuppliers();
    const leads = await seedLeads(customers);
    const quotations = await seedQuotations(customers, items);
    const salesOrders = await seedSalesOrders(customers, items);
    const purchaseOrders = await seedPurchaseOrders(suppliers, items);
    const invoices = await seedInvoices(customers, items);
    const payments = await seedPayments(customers, invoices);
    const goodsReceipts = await seedGoodsReceipts(purchaseOrders, items);
    const supplierInvoices = await seedSupplierInvoices(suppliers, items);
    const supplierPayments = await seedSupplierPayments(suppliers, supplierInvoices);
    const stockMovements = await seedStockMovements(items);
    const shipments = await seedShipments(salesOrders);
    
    console.log('✅ E2E data seeding completed successfully');
    
    // Log summary
    console.log('📊 Seeded data summary:', {
      users: users.length,
      customers: customers.length,
      suppliers: suppliers.length,
      leads: leads.length,
      quotations: quotations.length,
      salesOrders: salesOrders.length,
      purchaseOrders: purchaseOrders.length,
      invoices: invoices.length,
      items: items.length,
      categories: categories.length
    });
    
  } catch (error) {
    console.error('❌ E2E data seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanExistingData(): Promise<void> {
  console.log('🧹 Cleaning existing data...');
  
  // Delete in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.supplierPayment.deleteMany();
  await prisma.supplierInvoice.deleteMany();
  await prisma.goodsReceipt.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.inventoryCategory.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.taxRate.deleteMany();
  await prisma.account.deleteMany();
  await prisma.companySettings.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUsers(): Promise<unknown> {
  console.log('👥 Seeding users...');
  
  const users = [
    {
      username: 'admin',
      email: 'admin@enxi.com',
      password: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
      firstName: 'System',
      lastName: 'Administrator',
      permissions: ['*'] // All permissions
    },
    {
      username: 'manager',
      email: 'manager@enxi.com',
      password: await bcrypt.hash('manager123', 10),
      role: 'MANAGER',
      firstName: 'Sales',
      lastName: 'Manager',
      permissions: ['sales:read', 'sales:write', 'sales:approve', 'inventory:read', 'customers:read', 'customers:write']
    },
    {
      username: 'sales',
      email: 'sales@enxi.com',
      password: await bcrypt.hash('sales123', 10),
      role: 'SALES',
      firstName: 'Sales',
      lastName: 'Representative',
      permissions: ['sales:read', 'sales:write', 'customers:read', 'customers:write', 'leads:read', 'leads:write']
    },
    {
      username: 'inventory',
      email: 'inventory@enxi.com',
      password: await bcrypt.hash('inventory123', 10),
      role: 'INVENTORY',
      firstName: 'Inventory',
      lastName: 'Manager',
      permissions: ['inventory:read', 'inventory:write', 'inventory:adjust', 'purchase:read']
    }
  ];

  const createdUsers = [];
  for (const userData of users) {
    const user = await prisma.user.create({
      data: userData
    });
    createdUsers.push(user);
  }

  return createdUsers;
}

async function seedCompanySettings(): Promise<CompanySettings> {
  console.log('🏢 Seeding company settings...');
  
  return await prisma.companySettings.create({
    data: {
      companyName: 'Enxi ERP Test Company',
      currency: 'AED',
      timezone: 'Asia/Dubai',
      dateFormat: 'DD/MM/YYYY',
      fiscalYearStart: '01/01',
      address: '123 Test Street, Dubai, UAE',
      phone: '+971-4-123-4567',
      email: 'test@enxi.com',
      website: 'https://test.enxi.com',
      taxNumber: 'TRN123456789',
      logoUrl: null
    }
  });
}

async function seedChartOfAccounts(): Promise<number> {
  console.log('📊 Seeding chart of accounts...');
  
  const accounts = [
    // Assets
    { code: '1000', name: 'Cash', type: 'ASSET', parentCode: null },
    { code: '1100', name: 'Accounts Receivable', type: 'ASSET', parentCode: null },
    { code: '1200', name: 'Inventory', type: 'ASSET', parentCode: null },
    { code: '1300', name: 'Equipment', type: 'ASSET', parentCode: null },
    
    // Liabilities
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', parentCode: null },
    { code: '2100', name: 'VAT Payable', type: 'LIABILITY', parentCode: null },
    
    // Equity
    { code: '3000', name: 'Owner\'s Equity', type: 'EQUITY', parentCode: null },
    
    // Revenue
    { code: '4000', name: 'Sales Revenue', type: 'REVENUE', parentCode: null },
    
    // Expenses
    { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', parentCode: null },
    { code: '5100', name: 'Operating Expenses', type: 'EXPENSE', parentCode: null }
  ];

  const createdAccounts = [];
  for (const accountData of accounts) {
    const account = await prisma.account.create({
      data: accountData
    });
    createdAccounts.push(account);
  }

  return createdAccounts;
}

async function seedTaxConfiguration(): Promise<unknown> {
  console.log('💰 Seeding tax configuration...');
  
  const taxRates = [
    {
      name: 'VAT 5%',
      rate: 5.0,
      type: 'VAT',
      isDefault: true,
      isActive: true,
      description: 'Standard VAT rate for UAE'
    },
    {
      name: 'VAT 0%',
      rate: 0.0,
      type: 'VAT',
      isDefault: false,
      isActive: true,
      description: 'Zero-rated VAT'
    }
  ];

  const createdTaxRates = [];
  for (const taxData of taxRates) {
    const taxRate = await prisma.taxRate.create({
      data: taxData
    });
    createdTaxRates.push(taxRate);
  }

  return createdTaxRates;
}

async function seedInventoryCategories(): Promise<unknown> {
  console.log('📦 Seeding inventory categories...');
  
  const categories = [
    {
      name: 'Marine Engines',
      description: 'Marine diesel engines and components',
      code: 'ME',
      isActive: true
    },
    {
      name: 'Engine Parts',
      description: 'Spare parts for marine engines',
      code: 'EP',
      isActive: true
    },
    {
      name: 'Maintenance Supplies',
      description: 'Oils, filters, and maintenance supplies',
      code: 'MS',
      isActive: true
    },
    {
      name: 'Electronics',
      description: 'Marine electronics and navigation',
      code: 'EL',
      isActive: true
    }
  ];

  const createdCategories = [];
  for (const categoryData of categories) {
    const category = await prisma.inventoryCategory.create({
      data: categoryData
    });
    createdCategories.push(category);
  }

  return createdCategories;
}

async function seedInventoryItems(categories: any[]) {
  console.log('🏪 Seeding inventory items...');
  
  const items = [
    {
      name: 'Marine Diesel Engine 150HP',
      description: 'High-performance marine diesel engine',
      sku: 'MDE-150',
      categoryId: categories[0].id,
      unitPrice: 25000.00,
      costPrice: 18000.00,
      quantityOnHand: 5,
      reorderLevel: 2,
      unitOfMeasure: 'EACH',
      isActive: true,
      weight: 500.0,
      dimensions: '120x80x90 cm'
    },
    {
      name: 'Engine Oil Filter',
      description: 'Premium oil filter for marine engines',
      sku: 'EOF-001',
      categoryId: categories[1].id,
      unitPrice: 45.00,
      costPrice: 30.00,
      quantityOnHand: 100,
      reorderLevel: 20,
      unitOfMeasure: 'EACH',
      isActive: true,
      weight: 2.0,
      dimensions: '15x15x20 cm'
    },
    {
      name: 'Marine Engine Oil 20W-50',
      description: 'High-quality marine engine oil',
      sku: 'MEO-2050',
      categoryId: categories[2].id,
      unitPrice: 85.00,
      costPrice: 65.00,
      quantityOnHand: 50,
      reorderLevel: 10,
      unitOfMeasure: 'LITER',
      isActive: true,
      weight: 1.0,
      dimensions: '25x15x30 cm'
    },
    {
      name: 'GPS Navigation System',
      description: 'Advanced marine GPS navigation',
      sku: 'GPS-NAV-001',
      categoryId: categories[3].id,
      unitPrice: 1200.00,
      costPrice: 900.00,
      quantityOnHand: 8,
      reorderLevel: 3,
      unitOfMeasure: 'EACH',
      isActive: true,
      weight: 3.5,
      dimensions: '30x20x15 cm'
    }
  ];

  const createdItems = [];
  for (const itemData of items) {
    const item = await prisma.inventoryItem.create({
      data: itemData
    });
    createdItems.push(item);
  }

  return createdItems;
}

async function seedCustomers(): Promise<unknown> {
  console.log('👥 Seeding customers...');
  
  const customers = [
    {
      name: 'Dubai Marina Services',
      email: 'info@dubaimarina.ae',
      phone: '+971-4-567-8901',
      address: 'Dubai Marina, Dubai, UAE',
      city: 'Dubai',
      country: 'UAE',
      industry: 'Marine Services',
      creditLimit: 100000.00,
      paymentTerms: 'NET_30',
      isActive: true,
      customerType: 'BUSINESS',
      leadSource: 'REFERRAL'
    },
    {
      name: 'Abu Dhabi Fishing Fleet',
      email: 'fleet@abudhabi.ae',
      phone: '+971-2-345-6789',
      address: 'Abu Dhabi Corniche, Abu Dhabi, UAE',
      city: 'Abu Dhabi',
      country: 'UAE',
      industry: 'Fishing',
      creditLimit: 50000.00,
      paymentTerms: 'NET_15',
      isActive: true,
      customerType: 'BUSINESS',
      leadSource: 'WEBSITE'
    },
    {
      name: 'Sharjah Boat Repairs',
      email: 'repairs@sharjah.ae',
      phone: '+971-6-789-0123',
      address: 'Sharjah Creek, Sharjah, UAE',
      city: 'Sharjah',
      country: 'UAE',
      industry: 'Boat Repair',
      creditLimit: 75000.00,
      paymentTerms: 'NET_30',
      isActive: true,
      customerType: 'BUSINESS',
      leadSource: 'TRADE_SHOW'
    }
  ];

  const createdCustomers = [];
  for (const customerData of customers) {
    const customer = await prisma.customer.create({
      data: customerData
    });
    createdCustomers.push(customer);
  }

  return createdCustomers;
}

async function seedSuppliers(): Promise<unknown> {
  console.log('🏭 Seeding suppliers...');
  
  const suppliers = [
    {
      name: 'Global Marine Engines Ltd',
      email: 'sales@globalmarineengines.com',
      phone: '+44-20-1234-5678',
      address: 'London, UK',
      city: 'London',
      country: 'UK',
      category: 'Engine Manufacturer',
      paymentTerms: 'NET_30',
      isActive: true
    },
    {
      name: 'European Marine Parts',
      email: 'info@europeanmarineparts.com',
      phone: '+49-40-9876-5432',
      address: 'Hamburg, Germany',
      city: 'Hamburg',
      country: 'Germany',
      category: 'Parts Supplier',
      paymentTerms: 'NET_45',
      isActive: true
    },
    {
      name: 'Middle East Oil Supplies',
      email: 'orders@meoilsupplies.ae',
      phone: '+971-4-111-2222',
      address: 'JAFZA, Dubai, UAE',
      city: 'Dubai',
      country: 'UAE',
      category: 'Oil & Lubricants',
      paymentTerms: 'NET_15',
      isActive: true
    }
  ];

  const createdSuppliers = [];
  for (const supplierData of suppliers) {
    const supplier = await prisma.supplier.create({
      data: supplierData
    });
    createdSuppliers.push(supplier);
  }

  return createdSuppliers;
}

async function seedLeads(customers: any[]) {
  console.log('🎯 Seeding leads...');
  
  const leads = [
    {
      companyName: 'Future Marine Solutions',
      contactName: 'Ahmed Al-Mansouri',
      email: 'ahmed@futuremarine.ae',
      phone: '+971-50-123-4567',
      source: 'WEBSITE',
      status: 'NEW',
      industry: 'Marine Services',
      estimatedValue: 85000.00,
      expectedCloseDate: new Date('2024-07-15'),
      notes: 'Interested in marine engine overhaul services',
      priority: 'HIGH'
    },
    {
      companyName: 'Coastal Shipping LLC',
      contactName: 'Sara Al-Zahra',
      email: 'sara@coastalshipping.ae',
      phone: '+971-50-987-6543',
      source: 'REFERRAL',
      status: 'QUALIFIED',
      industry: 'Shipping',
      estimatedValue: 150000.00,
      expectedCloseDate: new Date('2024-08-30'),
      notes: 'Fleet upgrade project - multiple engines needed',
      priority: 'HIGH'
    },
    {
      companyName: 'Red Sea Fishing Co',
      contactName: 'Omar Hassan',
      email: 'omar@redseafishing.com',
      phone: '+971-50-555-7777',
      source: 'TRADE_SHOW',
      status: 'CONVERTED',
      industry: 'Fishing',
      estimatedValue: 45000.00,
      expectedCloseDate: new Date('2024-06-01'),
      notes: 'Converted to customer - regular maintenance contract',
      priority: 'MEDIUM',
      convertedCustomerId: customers[1].id,
      convertedAt: new Date('2024-06-01')
    }
  ];

  const createdLeads = [];
  for (const leadData of leads) {
    const lead = await prisma.lead.create({
      data: leadData
    });
    createdLeads.push(lead);
  }

  return createdLeads;
}

async function seedQuotations(customers: any[], items: any[]) {
  console.log('📋 Seeding quotations...');
  
  const quotations = [
    {
      quotationNumber: 'QUO-2024-001',
      customerId: customers[0].id,
      status: 'DRAFT',
      validUntil: new Date('2024-07-31'),
      subtotal: 25000.00,
      taxAmount: 1250.00,
      totalAmount: 26250.00,
      currency: 'AED',
      notes: 'Marine engine replacement quote',
      terms: 'Standard terms and conditions apply',
      items: {
        create: [
          {
            itemId: items[0].id,
            quantity: 1,
            unitPrice: 25000.00,
            totalPrice: 25000.00,
            description: 'Marine Diesel Engine 150HP installation'
          }
        ]
      }
    },
    {
      quotationNumber: 'QUO-2024-002',
      customerId: customers[1].id,
      status: 'SENT',
      validUntil: new Date('2024-08-15'),
      subtotal: 1370.00,
      taxAmount: 68.50,
      totalAmount: 1438.50,
      currency: 'AED',
      notes: 'Maintenance supplies for fishing fleet',
      terms: 'Net 15 payment terms',
      items: {
        create: [
          {
            itemId: items[1].id,
            quantity: 10,
            unitPrice: 45.00,
            totalPrice: 450.00,
            description: 'Engine Oil Filters - bulk order'
          },
          {
            itemId: items[2].id,
            quantity: 20,
            unitPrice: 85.00,
            totalPrice: 1700.00,
            description: 'Marine Engine Oil 20W-50 - fleet supply'
          }
        ]
      }
    }
  ];

  const createdQuotations = [];
  for (const quotationData of quotations) {
    const quotation = await prisma.quotation.create({
      data: quotationData
    });
    createdQuotations.push(quotation);
  }

  return createdQuotations;
}

async function seedSalesOrders(customers: any[], items: any[]) {
  console.log('📝 Seeding sales orders...');
  
  const salesOrders = [
    {
      orderNumber: 'SO-2024-001',
      customerId: customers[0].id,
      status: 'APPROVED',
      orderDate: new Date('2024-06-01'),
      expectedDeliveryDate: new Date('2024-06-15'),
      subtotal: 25000.00,
      taxAmount: 1250.00,
      totalAmount: 26250.00,
      currency: 'AED',
      notes: 'Urgent marine engine replacement',
      paymentTerms: 'NET_30',
      items: {
        create: [
          {
            itemId: items[0].id,
            quantity: 1,
            unitPrice: 25000.00,
            totalPrice: 25000.00,
            description: 'Marine Diesel Engine 150HP'
          }
        ]
      }
    },
    {
      orderNumber: 'SO-2024-002',
      customerId: customers[2].id,
      status: 'PENDING_APPROVAL',
      orderDate: new Date('2024-06-10'),
      expectedDeliveryDate: new Date('2024-06-20'),
      subtotal: 1200.00,
      taxAmount: 60.00,
      totalAmount: 1260.00,
      currency: 'AED',
      notes: 'Navigation system upgrade',
      paymentTerms: 'NET_30',
      items: {
        create: [
          {
            itemId: items[3].id,
            quantity: 1,
            unitPrice: 1200.00,
            totalPrice: 1200.00,
            description: 'GPS Navigation System'
          }
        ]
      }
    }
  ];

  const createdSalesOrders = [];
  for (const orderData of salesOrders) {
    const salesOrder = await prisma.salesOrder.create({
      data: orderData
    });
    createdSalesOrders.push(salesOrder);
  }

  return createdSalesOrders;
}

async function seedPurchaseOrders(suppliers: any[], items: any[]) {
  console.log('🛒 Seeding purchase orders...');
  
  const purchaseOrders = [
    {
      orderNumber: 'PO-2024-001',
      supplierId: suppliers[0].id,
      status: 'APPROVED',
      orderDate: new Date('2024-05-15'),
      expectedDeliveryDate: new Date('2024-06-01'),
      subtotal: 18000.00,
      taxAmount: 900.00,
      totalAmount: 18900.00,
      currency: 'AED',
      notes: 'Marine engine procurement',
      paymentTerms: 'NET_30',
      items: {
        create: [
          {
            itemId: items[0].id,
            quantity: 1,
            unitPrice: 18000.00,
            totalPrice: 18000.00,
            description: 'Marine Diesel Engine 150HP - wholesale'
          }
        ]
      }
    },
    {
      orderNumber: 'PO-2024-002',
      supplierId: suppliers[1].id,
      status: 'SENT',
      orderDate: new Date('2024-06-05'),
      expectedDeliveryDate: new Date('2024-06-15'),
      subtotal: 1500.00,
      taxAmount: 75.00,
      totalAmount: 1575.00,
      currency: 'AED',
      notes: 'Parts restocking order',
      paymentTerms: 'NET_45',
      items: {
        create: [
          {
            itemId: items[1].id,
            quantity: 50,
            unitPrice: 30.00,
            totalPrice: 1500.00,
            description: 'Engine Oil Filters - bulk purchase'
          }
        ]
      }
    }
  ];

  const createdPurchaseOrders = [];
  for (const orderData of purchaseOrders) {
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: orderData
    });
    createdPurchaseOrders.push(purchaseOrder);
  }

  return createdPurchaseOrders;
}

async function seedInvoices(customers: any[], items: any[]) {
  console.log('🧾 Seeding invoices...');
  
  const invoices = [
    {
      invoiceNumber: 'INV-2024-001',
      customerId: customers[0].id,
      status: 'PAID',
      issueDate: new Date('2024-06-01'),
      dueDate: new Date('2024-07-01'),
      subtotal: 25000.00,
      taxAmount: 1250.00,
      totalAmount: 26250.00,
      paidAmount: 26250.00,
      currency: 'AED',
      notes: 'Marine engine replacement invoice',
      paymentTerms: 'NET_30',
      items: {
        create: [
          {
            itemId: items[0].id,
            quantity: 1,
            unitPrice: 25000.00,
            totalPrice: 25000.00,
            description: 'Marine Diesel Engine 150HP'
          }
        ]
      }
    },
    {
      invoiceNumber: 'INV-2024-002',
      customerId: customers[1].id,
      status: 'PENDING',
      issueDate: new Date('2024-06-10'),
      dueDate: new Date('2024-06-25'),
      subtotal: 1700.00,
      taxAmount: 85.00,
      totalAmount: 1785.00,
      paidAmount: 0.00,
      currency: 'AED',
      notes: 'Oil and filters invoice',
      paymentTerms: 'NET_15',
      items: {
        create: [
          {
            itemId: items[2].id,
            quantity: 20,
            unitPrice: 85.00,
            totalPrice: 1700.00,
            description: 'Marine Engine Oil 20W-50'
          }
        ]
      }
    }
  ];

  const createdInvoices = [];
  for (const invoiceData of invoices) {
    const invoice = await prisma.invoice.create({
      data: invoiceData
    });
    createdInvoices.push(invoice);
  }

  return createdInvoices;
}

async function seedPayments(customers: any[], invoices: any[]) {
  console.log('💳 Seeding payments...');
  
  const payments = [
    {
      paymentNumber: 'PAY-2024-001',
      customerId: customers[0].id,
      invoiceId: invoices[0].id,
      amount: 26250.00,
      paymentDate: new Date('2024-06-15'),
      paymentMethod: 'BANK_TRANSFER',
      reference: 'TXN-ABC123456',
      notes: 'Full payment for marine engine',
      status: 'CONFIRMED'
    }
  ];

  const createdPayments = [];
  for (const paymentData of payments) {
    const payment = await prisma.payment.create({
      data: paymentData
    });
    createdPayments.push(payment);
  }

  return createdPayments;
}

async function seedGoodsReceipts(purchaseOrders: any[], items: any[]) {
  console.log('📦 Seeding goods receipts...');
  
  const goodsReceipts = [
    {
      receiptNumber: 'GR-2024-001',
      purchaseOrderId: purchaseOrders[0].id,
      receivedDate: new Date('2024-05-30'),
      status: 'RECEIVED',
      notes: 'Marine engine received in good condition',
      items: {
        create: [
          {
            itemId: items[0].id,
            quantityReceived: 1,
            quantityOrdered: 1,
            unitPrice: 18000.00,
            totalPrice: 18000.00,
            condition: 'GOOD',
            notes: 'Engine inspected and approved'
          }
        ]
      }
    }
  ];

  const createdGoodsReceipts = [];
  for (const receiptData of goodsReceipts) {
    const receipt = await prisma.goodsReceipt.create({
      data: receiptData
    });
    createdGoodsReceipts.push(receipt);
  }

  return createdGoodsReceipts;
}

async function seedSupplierInvoices(suppliers: any[], items: any[]) {
  console.log('📄 Seeding supplier invoices...');
  
  const supplierInvoices = [
    {
      invoiceNumber: 'SINV-2024-001',
      supplierId: suppliers[0].id,
      status: 'PENDING',
      issueDate: new Date('2024-06-01'),
      dueDate: new Date('2024-07-01'),
      subtotal: 18000.00,
      taxAmount: 900.00,
      totalAmount: 18900.00,
      paidAmount: 0.00,
      currency: 'AED',
      notes: 'Marine engine supplier invoice',
      paymentTerms: 'NET_30',
      items: {
        create: [
          {
            itemId: items[0].id,
            quantity: 1,
            unitPrice: 18000.00,
            totalPrice: 18000.00,
            description: 'Marine Diesel Engine 150HP'
          }
        ]
      }
    }
  ];

  const createdSupplierInvoices = [];
  for (const invoiceData of supplierInvoices) {
    const invoice = await prisma.supplierInvoice.create({
      data: invoiceData
    });
    createdSupplierInvoices.push(invoice);
  }

  return createdSupplierInvoices;
}

async function seedSupplierPayments(suppliers: any[], supplierInvoices: any[]) {
  console.log('💰 Seeding supplier payments...');
  
  // For now, create a pending payment
  const supplierPayments = [
    {
      paymentNumber: 'SP-2024-001',
      supplierId: suppliers[0].id,
      supplierInvoiceId: supplierInvoices[0].id,
      amount: 18900.00,
      paymentDate: new Date('2024-06-20'),
      paymentMethod: 'BANK_TRANSFER',
      reference: 'PENDING',
      notes: 'Scheduled payment for marine engine',
      status: 'PENDING'
    }
  ];

  const createdSupplierPayments = [];
  for (const paymentData of supplierPayments) {
    const payment = await prisma.supplierPayment.create({
      data: paymentData
    });
    createdSupplierPayments.push(payment);
  }

  return createdSupplierPayments;
}

async function seedStockMovements(items: any[]) {
  console.log('📊 Seeding stock movements...');
  
  const stockMovements = [
    {
      itemId: items[0].id,
      movementType: 'IN',
      quantity: 1,
      unitCost: 18000.00,
      totalCost: 18000.00,
      movementDate: new Date('2024-05-30'),
      reference: 'GR-2024-001',
      notes: 'Goods receipt - marine engine',
      balanceAfter: 5
    },
    {
      itemId: items[0].id,
      movementType: 'OUT',
      quantity: 1,
      unitCost: 18000.00,
      totalCost: 18000.00,
      movementDate: new Date('2024-06-15'),
      reference: 'SO-2024-001',
      notes: 'Sales order fulfillment',
      balanceAfter: 4
    },
    {
      itemId: items[1].id,
      movementType: 'ADJUSTMENT',
      quantity: 5,
      unitCost: 30.00,
      totalCost: 150.00,
      movementDate: new Date('2024-06-01'),
      reference: 'ADJ-001',
      notes: 'Stock count adjustment',
      balanceAfter: 100
    }
  ];

  const createdStockMovements = [];
  for (const movementData of stockMovements) {
    const movement = await prisma.stockMovement.create({
      data: movementData
    });
    createdStockMovements.push(movement);
  }

  return createdStockMovements;
}

async function seedShipments(salesOrders: any[]) {
  console.log('🚚 Seeding shipments...');
  
  const shipments = [
    {
      shipmentNumber: 'SH-2024-001',
      salesOrderId: salesOrders[0].id,
      status: 'DELIVERED',
      shipmentDate: new Date('2024-06-12'),
      deliveryDate: new Date('2024-06-14'),
      carrier: 'Dubai Express Logistics',
      trackingNumber: 'DEL123456789',
      shippingAddress: 'Dubai Marina, Dubai, UAE',
      notes: 'Marine engine delivered successfully',
      shippingCost: 500.00
    }
  ];

  const createdShipments = [];
  for (const shipmentData of shipments) {
    const shipment = await prisma.shipment.create({
      data: shipmentData
    });
    createdShipments.push(shipment);
  }

  return createdShipments;
}

// Run the seed function
seedE2EData().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});