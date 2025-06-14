#!/usr/bin/env npx tsx

/**
 * Simple ERP Data Seeding Script
 * 
 * This script populates the database with basic test data
 * matching the actual schema structure.
 */

import { prisma } from '../lib/db/prisma'
import bcrypt from 'bcryptjs'

// Helper function to generate dates
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)
const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)

async function main(): Promise<void> {
  console.warn('🌱 Starting Simple ERP Data Seed...\n')

  try {
    // Clean database first
    await cleanDatabase()

    // Step 1: Create Users
    console.warn('👥 Creating users...')
    const hashedPassword = await bcrypt.hash('demo123', 10)
    
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@enxi-erp.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    })
    
    const sales = await prisma.user.create({
      data: {
        username: 'sarah',
        email: 'sarah@enxi-erp.com',
        password: hashedPassword,
        role: 'USER',
        isActive: true
      }
    })
    
    console.warn('✅ Users created')

    // Step 2: Create Chart of Accounts
    console.warn('\n💰 Creating chart of accounts...')
    const accountsReceivable = await prisma.account.create({
      data: {
        code: '1200',
        name: 'Accounts Receivable',
        type: 'ASSET',
        currency: 'USD',
        description: 'Customer receivables',
        createdBy: admin.id
      }
    })
    
    const salesRevenue = await prisma.account.create({
      data: {
        code: '4000',
        name: 'Sales Revenue',
        type: 'INCOME',
        currency: 'USD',
        description: 'Product sales revenue',
        createdBy: admin.id
      }
    })
    
    console.warn('✅ Chart of accounts created')

    // Step 3: Create Customers
    console.warn('\n🏢 Creating customers...')
    const customer1 = await prisma.customer.create({
      data: {
        customerNumber: 'CUST-0001',
        name: 'TechCorp Solutions',
        email: 'finance@techcorp.com',
        phone: '+1 (555) 123-4567',
        industry: 'Technology',
        website: 'https://techcorp.com',
        address: '123 Tech Street, San Francisco, CA 94105',
        currency: 'USD',
        creditLimit: 100000,
        paymentTerms: 30,
        createdBy: admin.id,
        account: {
          create: {
            code: '1200-0001',
            name: 'AR - TechCorp Solutions',
            type: 'ASSET',
            currency: 'USD',
            description: 'Accounts Receivable for TechCorp Solutions',
            parentId: accountsReceivable.id,
            createdBy: admin.id
          }
        }
      }
    })
    
    console.warn('✅ Customers created')

    // Step 4: Create Leads
    console.warn('\n📞 Creating leads...')
    const lead1 = await prisma.lead.create({
      data: {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@startupinc.com',
        phone: '+1 (555) 111-2222',
        company: 'Startup Inc',
        jobTitle: 'CTO',
        source: 'WEBSITE',
        status: 'NEW',
        notes: 'Interested in our enterprise solution - Est. value: $75,000',
        createdBy: sales.id
      }
    })
    
    console.warn('✅ Leads created')

    // Step 5: Create Inventory
    console.warn('\n📦 Creating inventory system...')
    
    // Units of Measure
    const pieces = await prisma.unitOfMeasure.create({
      data: {
        code: 'PCS',
        name: 'Pieces',
        symbol: 'pcs',
        isBaseUnit: true,
        createdBy: admin.id
      }
    })

    // Categories
    const electronics = await prisma.category.create({
      data: {
        code: 'ELEC',
        name: 'Electronics',
        description: 'Electronic products',
        createdBy: admin.id
      }
    })

    // Items
    const laptop = await prisma.item.create({
      data: {
        code: 'LAP-BUS-14',
        name: 'Business Laptop 14"',
        description: 'Standard business laptop with Intel i5, 8GB RAM, 256GB SSD',
        categoryId: electronics.id,
        type: 'PRODUCT',
        unitOfMeasureId: pieces.id,
        trackInventory: true,
        minStockLevel: 10,
        maxStockLevel: 100,
        reorderPoint: 20,
        standardCost: 500,
        listPrice: 899,
        salesAccountId: salesRevenue.id,
        isSaleable: true,
        isPurchaseable: true,
        createdBy: admin.id
      }
    })
    
    console.warn('✅ Inventory system created')

    // Step 6: Create Sales Case
    console.warn('\n💼 Creating sales cases...')
    const salesCase = await prisma.salesCase.create({
      data: {
        caseNumber: 'SC-2024-001',
        title: 'TechCorp Office Refresh 2024',
        description: 'Complete office technology refresh',
        customerId: customer1.id,
        estimatedValue: 50000,
        actualValue: 0,
        cost: 0,
        profitMargin: 0,
        status: 'OPEN',
        assignedTo: sales.id,
        createdBy: sales.id
      }
    })
    
    console.warn('✅ Sales cases created')

    // Step 7: Create Quotation
    console.warn('\n📋 Creating quotations...')
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber: 'QT-2024-001',
        salesCaseId: salesCase.id,
        status: 'SENT',
        validUntil: daysFromNow(30),
        subtotal: 8990,
        taxAmount: 764.15,
        discountAmount: 449.50,
        totalAmount: 9304.65,
        paymentTerms: 'Net 30',
        deliveryTerms: 'FOB Destination',
        notes: 'Volume discount applied.',
        createdBy: sales.id,
        items: {
          create: [
            {
              itemId: laptop.id,
              itemCode: laptop.code,
              description: laptop.description,
              quantity: 10,
              unitPrice: 899,
              discount: 5,
              taxRate: 8.5,
              subtotal: 8990,
              discountAmount: 449.50,
              taxAmount: 764.15,
              totalAmount: 9304.65,
              sortOrder: 1
            }
          ]
        }
      }
    })
    
    console.warn('✅ Quotations created')

    // Step 8: Create Sales Order
    console.warn('\n📝 Creating sales orders...')
    const salesOrder = await prisma.salesOrder.create({
      data: {
        orderNumber: 'SO-2024-001',
        quotationId: quotation.id,
        salesCaseId: salesCase.id,
        orderDate: new Date(),
        requestedDate: daysFromNow(14),
        status: 'APPROVED',
        subtotal: 8990,
        taxAmount: 764.15,
        discountAmount: 449.50,
        totalAmount: 9304.65,
        paymentTerms: 'Net 30',
        billingAddress: customer1.address || '',
        shippingAddress: customer1.address || '',
        approvedBy: admin.id,
        approvedAt: new Date(),
        createdBy: sales.id,
        items: {
          create: [
            {
              itemId: laptop.id,
              itemCode: laptop.code,
              description: laptop.description,
              quantity: 10,
              unitPrice: 899,
              discount: 5,
              taxRate: 8.5,
              quantityShipped: 0,
              sortOrder: 1
            }
          ]
        }
      }
    })
    
    console.warn('✅ Sales orders created')

    // Step 9: Create Invoice
    console.warn('\n🧾 Creating invoices...')
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2024-001',
        salesOrderId: salesOrder.id,
        customerId: customer1.id,
        type: 'SALES',
        status: 'SENT',
        invoiceDate: new Date(),
        dueDate: daysFromNow(30),
        subtotal: 8990,
        taxAmount: 764.15,
        discountAmount: 449.50,
        totalAmount: 9304.65,
        balanceAmount: 9304.65,
        paidAmount: 0,
        paymentTerms: 'Net 30',
        billingAddress: customer1.address || '',
        notes: 'Thank you for your business!',
        sentBy: admin.id,
        sentAt: new Date(),
        createdBy: admin.id,
        items: {
          create: [
            {
              itemId: laptop.id,
              itemCode: laptop.code,
              description: laptop.description,
              quantity: 10,
              unitPrice: 899,
              discount: 5,
              taxRate: 8.5,
              subtotal: 8990,
              discountAmount: 449.50,
              taxAmount: 764.15,
              totalAmount: 9304.65
            }
          ]
        }
      }
    })
    
    console.warn('✅ Invoices created')

    // Step 10: Create Payment
    console.warn('\n💳 Creating payments...')
    const payment = await prisma.payment.create({
      data: {
        paymentNumber: 'PAY-2024-001',
        invoiceId: invoice.id,
        customerId: customer1.id,
        amount: 5000,
        paymentDate: new Date(),
        paymentMethod: 'BANK_TRANSFER',
        reference: 'Wire Ref: TC-12345',
        notes: 'Partial payment',
        createdBy: admin.id
      }
    })
    
    // Update invoice to partial payment
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: 5000,
        balanceAmount: 4304.65,
        status: 'PARTIAL'
      }
    })
    
    console.warn('✅ Payments created')

    // Print Summary
    console.warn('\n' + '='.repeat(60))
    console.warn('📊 SEED DATA SUMMARY')
    console.warn('='.repeat(60))
    console.warn('\n✅ Simple test data seeded successfully!')
    console.warn('\n🔑 LOGIN CREDENTIALS:')
    console.warn('   Admin: admin / demo123')
    console.warn('   Sales: sarah / demo123')
    console.warn('\n📋 CREATED:')
    console.warn('   - 2 Users')
    console.warn('   - 2 GL Accounts')  
    console.warn('   - 1 Customer with AR account')
    console.warn('   - 1 Lead')
    console.warn('   - 1 Product Item')
    console.warn('   - 1 Sales Case')
    console.warn('   - 1 Quotation')
    console.warn('   - 1 Sales Order')
    console.warn('   - 1 Invoice')
    console.warn('   - 1 Partial Payment')

} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect()
    }
}

async function cleanDatabase(): Promise<void> {
  console.warn('🧹 Cleaning database...')
  
  try {
    // Clean tables in the correct order
    const cleanupOperations = [
      { name: 'AuditLog', fn: () => prisma.auditLog.deleteMany() },
      { name: 'Payment', fn: () => prisma.payment.deleteMany() },
      { name: 'InvoiceItem', fn: () => prisma.invoiceItem.deleteMany() },
      { name: 'Invoice', fn: () => prisma.invoice.deleteMany() },
      { name: 'SalesOrderItem', fn: () => prisma.salesOrderItem.deleteMany() },
      { name: 'SalesOrder', fn: () => prisma.salesOrder.deleteMany() },
      { name: 'CustomerPO', fn: () => prisma.customerPO.deleteMany() },
      { name: 'QuotationItem', fn: () => prisma.quotationItem.deleteMany() },
      { name: 'Quotation', fn: () => prisma.quotation.deleteMany() },
      { name: 'CaseExpense', fn: () => prisma.caseExpense.deleteMany() },
      { name: 'SalesCase', fn: () => prisma.salesCase.deleteMany() },
      { name: 'StockLot', fn: () => prisma.stockLot.deleteMany() },
      { name: 'StockMovement', fn: () => prisma.stockMovement.deleteMany() },
      { name: 'JournalLine', fn: () => prisma.journalLine.deleteMany() },
      { name: 'JournalEntry', fn: () => prisma.journalEntry.deleteMany() },
      { name: 'ExchangeRate', fn: () => prisma.exchangeRate.deleteMany() },
      { name: 'Item', fn: () => prisma.item.deleteMany() },
      { name: 'Category', fn: () => prisma.category.deleteMany() },
      { name: 'UnitOfMeasure', fn: () => prisma.unitOfMeasure.deleteMany() },
      { name: 'Lead', fn: () => prisma.lead.deleteMany() },
      { name: 'Customer', fn: () => prisma.customer.deleteMany() },
      { name: 'Account', fn: () => prisma.account.deleteMany() },
      { name: 'User', fn: () => prisma.user.deleteMany() },
    ]
    
    for (const operation of cleanupOperations) {
      try {
        await operation.fn()
        console.warn(`  ✓ Cleaned ${operation.name}`)
} catch {      }
    }
    
    console.warn('✅ Database cleaned')
} catch {}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })