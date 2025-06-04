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

async function main() {
  console.log('🌱 Starting Simple ERP Data Seed...\n')

  try {
    // Clean database first
    await cleanDatabase()

    // Step 1: Create Users
    console.log('👥 Creating users...')
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
    
    console.log('✅ Users created')

    // Step 2: Create Chart of Accounts
    console.log('\n💰 Creating chart of accounts...')
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
    
    console.log('✅ Chart of accounts created')

    // Step 3: Create Customers
    console.log('\n🏢 Creating customers...')
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
    
    console.log('✅ Customers created')

    // Step 4: Create Leads
    console.log('\n📞 Creating leads...')
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
    
    console.log('✅ Leads created')

    // Step 5: Create Inventory
    console.log('\n📦 Creating inventory system...')
    
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
    
    console.log('✅ Inventory system created')

    // Step 6: Create Sales Case
    console.log('\n💼 Creating sales cases...')
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
    
    console.log('✅ Sales cases created')

    // Step 7: Create Quotation
    console.log('\n📋 Creating quotations...')
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
    
    console.log('✅ Quotations created')

    // Step 8: Create Sales Order
    console.log('\n📝 Creating sales orders...')
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
    
    console.log('✅ Sales orders created')

    // Step 9: Create Invoice
    console.log('\n🧾 Creating invoices...')
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
    
    console.log('✅ Invoices created')

    // Step 10: Create Payment
    console.log('\n💳 Creating payments...')
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
    
    console.log('✅ Payments created')

    // Print Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 SEED DATA SUMMARY')
    console.log('='.repeat(60))
    console.log('\n✅ Simple test data seeded successfully!')
    console.log('\n🔑 LOGIN CREDENTIALS:')
    console.log('   Admin: admin / demo123')
    console.log('   Sales: sarah / demo123')
    console.log('\n📋 CREATED:')
    console.log('   - 2 Users')
    console.log('   - 2 GL Accounts')  
    console.log('   - 1 Customer with AR account')
    console.log('   - 1 Lead')
    console.log('   - 1 Product Item')
    console.log('   - 1 Sales Case')
    console.log('   - 1 Quotation')
    console.log('   - 1 Sales Order')
    console.log('   - 1 Invoice')
    console.log('   - 1 Partial Payment')

  } catch (error) {
    console.error('❌ Seed error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

async function cleanDatabase() {
  console.log('🧹 Cleaning database...')
  
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
        console.log(`  ✓ Cleaned ${operation.name}`)
      } catch (error) {
        console.log(`  ⚠️ Skipped ${operation.name}`)
      }
    }
    
    console.log('✅ Database cleaned')
  } catch (error) {
    console.error('⚠️ Error during cleanup:', error)
    console.log('Continuing with seeding...')
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })