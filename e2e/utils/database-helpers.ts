import { PrismaClient } from '@prisma/client';

/**
 * Database helpers for E2E tests
 * Provides utilities for test data management and cleanup
 */
export class DatabaseHelpers {
  private static prisma: PrismaClient;

  static async getPrismaClient(): Promise<PrismaClient> {
    if (!this.prisma) {
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL || 'file:./e2e-test.db'
          }
        }
      });
    }
    return this.prisma;
  }

  static async cleanup() {
    const prisma = await this.getPrismaClient();
    
    try {
      // Clean up test data in reverse dependency order
      await prisma.auditLog.deleteMany({ where: { entityId: { contains: 'test-' } } });
      await prisma.stockMovement.deleteMany({ where: { reference: { contains: 'TEST-' } } });
      await prisma.shipment.deleteMany({ where: { shipmentNumber: { contains: 'TEST-' } } });
      await prisma.supplierPayment.deleteMany({ where: { paymentNumber: { contains: 'TEST-' } } });
      await prisma.supplierInvoice.deleteMany({ where: { invoiceNumber: { contains: 'TEST-' } } });
      await prisma.goodsReceipt.deleteMany({ where: { receiptNumber: { contains: 'TEST-' } } });
      await prisma.payment.deleteMany({ where: { paymentNumber: { contains: 'TEST-' } } });
      await prisma.invoice.deleteMany({ where: { invoiceNumber: { contains: 'TEST-' } } });
      await prisma.purchaseOrder.deleteMany({ where: { orderNumber: { contains: 'TEST-' } } });
      await prisma.salesOrder.deleteMany({ where: { orderNumber: { contains: 'TEST-' } } });
      await prisma.quotation.deleteMany({ where: { quotationNumber: { contains: 'TEST-' } } });
      await prisma.lead.deleteMany({ where: { companyName: { contains: 'Test' } } });
      await prisma.inventoryItem.deleteMany({ where: { sku: { contains: 'TEST-' } } });
      await prisma.inventoryCategory.deleteMany({ where: { code: { contains: 'TEST-' } } });
      await prisma.supplier.deleteMany({ where: { name: { contains: 'Test' } } });
      await prisma.customer.deleteMany({ where: { name: { contains: 'Test' } } });
      await prisma.user.deleteMany({ where: { username: { contains: 'test-' } } });
      
      console.log('✅ Test data cleanup completed');
    } catch (error) {
      console.error('❌ Test data cleanup failed:', error);
      throw error;
    }
  }

  static async createTestCustomer(data?: Partial<any>) {
    const prisma = await this.getPrismaClient();
    
    const defaultData = {
      name: `Test Customer ${Math.random().toString(36).substr(2, 8)}`,
      email: `test-customer-${Math.random().toString(36).substr(2, 8)}@enxi-test.com`,
      phone: '+971-50-123-9999',
      address: '123 Test Street, Dubai, UAE',
      city: 'Dubai',
      country: 'UAE',
      industry: 'Testing',
      creditLimit: 50000.00,
      paymentTerms: 'NET_30',
      isActive: true,
      customerType: 'BUSINESS',
      leadSource: 'WEBSITE',
      ...data
    };

    return await prisma.customer.create({ data: defaultData });
  }

  static async createTestSupplier(data?: Partial<any>) {
    const prisma = await this.getPrismaClient();
    
    const defaultData = {
      name: `Test Supplier ${Math.random().toString(36).substr(2, 8)}`,
      email: `test-supplier-${Math.random().toString(36).substr(2, 8)}@enxi-test.com`,
      phone: '+971-50-555-8888',
      address: '456 Supplier Avenue, Dubai, UAE',
      city: 'Dubai',
      country: 'UAE',
      category: 'Test Supplies',
      paymentTerms: 'NET_30',
      isActive: true,
      ...data
    };

    return await prisma.supplier.create({ data: defaultData });
  }

  static async createTestInventoryCategory(data?: Partial<any>) {
    const prisma = await this.getPrismaClient();
    
    const defaultData = {
      name: `Test Category ${Math.random().toString(36).substr(2, 8)}`,
      description: 'Test category for E2E testing',
      code: `TEST-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      isActive: true,
      ...data
    };

    return await prisma.inventoryCategory.create({ data: defaultData });
  }

  static async createTestInventoryItem(categoryId: string, data?: Partial<any>) {
    const prisma = await this.getPrismaClient();
    
    const defaultData = {
      name: `Test Item ${Math.random().toString(36).substr(2, 8)}`,
      description: 'Test inventory item for E2E testing',
      sku: `TEST-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      categoryId,
      unitPrice: 100.00,
      costPrice: 75.00,
      quantityOnHand: 10,
      reorderLevel: 5,
      unitOfMeasure: 'EACH',
      isActive: true,
      weight: 1.0,
      dimensions: '10x10x10 cm',
      ...data
    };

    return await prisma.inventoryItem.create({ data: defaultData });
  }

  static async createTestLead(data?: Partial<any>) {
    const prisma = await this.getPrismaClient();
    
    const defaultData = {
      companyName: `Test Lead Company ${Math.random().toString(36).substr(2, 8)}`,
      contactName: `Test Contact ${Math.random().toString(36).substr(2, 6)}`,
      email: `test-lead-${Math.random().toString(36).substr(2, 8)}@enxi-test.com`,
      phone: '+971-50-777-6666',
      source: 'WEBSITE',
      status: 'NEW',
      industry: 'Testing',
      estimatedValue: 25000.00,
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: 'Test lead for E2E testing',
      priority: 'MEDIUM',
      ...data
    };

    return await prisma.lead.create({ data: defaultData });
  }

  static async createTestQuotation(customerId: string, items: any[], data?: Partial<any>) {
    const prisma = await this.getPrismaClient();
    
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * 0.05; // 5% VAT
    const totalAmount = subtotal + taxAmount;
    
    const defaultData = {
      quotationNumber: `TEST-QUO-${Date.now()}`,
      customerId,
      status: 'DRAFT',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal,
      taxAmount,
      totalAmount,
      currency: 'AED',
      notes: 'Test quotation for E2E testing',
      terms: 'Standard test terms and conditions',
      ...data
    };

    const quotation = await prisma.quotation.create({
      data: {
        ...defaultData,
        items: {
          create: items.map((item, index) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            description: item.description || `Test item ${index + 1}`,
            sortOrder: index
          }))
        }
      },
      include: {
        items: true,
        customer: true
      }
    });

    return quotation;
  }

  static async createTestSalesOrder(customerId: string, items: any[], data?: Partial<any>) {
    const prisma = await this.getPrismaClient();
    
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * 0.05; // 5% VAT
    const totalAmount = subtotal + taxAmount;
    
    const defaultData = {
      orderNumber: `TEST-SO-${Date.now()}`,
      customerId,
      status: 'PENDING_APPROVAL',
      orderDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      subtotal,
      taxAmount,
      totalAmount,
      currency: 'AED',
      notes: 'Test sales order for E2E testing',
      paymentTerms: 'NET_30',
      ...data
    };

    const salesOrder = await prisma.salesOrder.create({
      data: {
        ...defaultData,
        items: {
          create: items.map((item, index) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            description: item.description || `Test item ${index + 1}`,
            sortOrder: index
          }))
        }
      },
      include: {
        items: true,
        customer: true
      }
    });

    return salesOrder;
  }

  static async createTestInvoice(customerId: string, items: any[], data?: Partial<any>) {
    const prisma = await this.getPrismaClient();
    
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * 0.05; // 5% VAT
    const totalAmount = subtotal + taxAmount;
    
    const defaultData = {
      invoiceNumber: `TEST-INV-${Date.now()}`,
      customerId,
      status: 'PENDING',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal,
      taxAmount,
      totalAmount,
      paidAmount: 0.00,
      currency: 'AED',
      notes: 'Test invoice for E2E testing',
      paymentTerms: 'NET_30',
      ...data
    };

    const invoice = await prisma.invoice.create({
      data: {
        ...defaultData,
        items: {
          create: items.map((item, index) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            description: item.description || `Test item ${index + 1}`,
            sortOrder: index
          }))
        }
      },
      include: {
        items: true,
        customer: true
      }
    });

    return invoice;
  }

  static async createTestPurchaseOrder(supplierId: string, items: any[], data?: Partial<any>) {
    const prisma = await this.getPrismaClient();
    
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * 0.05; // 5% VAT
    const totalAmount = subtotal + taxAmount;
    
    const defaultData = {
      orderNumber: `TEST-PO-${Date.now()}`,
      supplierId,
      status: 'DRAFT',
      orderDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      subtotal,
      taxAmount,
      totalAmount,
      currency: 'AED',
      notes: 'Test purchase order for E2E testing',
      paymentTerms: 'NET_30',
      ...data
    };

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        ...defaultData,
        items: {
          create: items.map((item, index) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            description: item.description || `Test item ${index + 1}`,
            sortOrder: index
          }))
        }
      },
      include: {
        items: true,
        supplier: true
      }
    });

    return purchaseOrder;
  }

  static async findTestEntities() {
    const prisma = await this.getPrismaClient();
    
    return {
      customers: await prisma.customer.findMany({ where: { name: { contains: 'Test' } } }),
      suppliers: await prisma.supplier.findMany({ where: { name: { contains: 'Test' } } }),
      leads: await prisma.lead.findMany({ where: { companyName: { contains: 'Test' } } }),
      items: await prisma.inventoryItem.findMany({ where: { sku: { contains: 'TEST-' } } }),
      categories: await prisma.inventoryCategory.findMany({ where: { code: { contains: 'TEST-' } } }),
      quotations: await prisma.quotation.findMany({ where: { quotationNumber: { contains: 'TEST-' } } }),
      salesOrders: await prisma.salesOrder.findMany({ where: { orderNumber: { contains: 'TEST-' } } }),
      purchaseOrders: await prisma.purchaseOrder.findMany({ where: { orderNumber: { contains: 'TEST-' } } }),
      invoices: await prisma.invoice.findMany({ where: { invoiceNumber: { contains: 'TEST-' } } })
    };
  }

  static async closeConnection() {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }
}