#!/usr/bin/env npx tsx

/**
 * Comprehensive Payment and Customer Ledger Seed Script
 * 
 * This script creates realistic payment transaction history
 * and customer business relationships for testing the payment module.
 */

import { prisma } from '../lib/db/prisma'
import bcrypt from 'bcryptjs'

// Helper function to generate dates
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)
const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)

// Helper to generate random amounts
const randomAmount = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 100) / 100

async function main() {
  console.log('🌱 Starting Comprehensive Payment & Customer Ledger Seed...\n')

  try {
    // Clean and recreate base data
    await cleanDatabase()
    const baseData = await createBaseData()
    
    // Create comprehensive customer transaction histories
    console.log('\n💰 Creating comprehensive payment transactions...')
    await createComprehensivePaymentHistory(baseData)
    console.log('✅ Payment transactions created')

    // Create customer business relationships
    console.log('\n🤝 Creating customer business relationships...')
    await createCustomerBusinessHistory(baseData)
    console.log('✅ Customer business history created')

    // Create aging analysis data
    console.log('\n📊 Creating aging analysis data...')
    await createAgingData(baseData)
    console.log('✅ Aging data created')

    // Print comprehensive summary
    await printComprehensiveSummary()

  } catch (error) {
    console.error('❌ Seed error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

async function cleanDatabase() {
  console.log('🧹 Cleaning database...')
  
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
}

async function createBaseData() {
  console.log('👥 Creating base users and accounts...')
  
  const hashedPassword = await bcrypt.hash('demo123', 10)
  
  // Create users
  const [admin, sales, accountant, manager] = await Promise.all([
    prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@enxi-erp.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        username: 'sarah',
        email: 'sarah@enxi-erp.com',
        password: hashedPassword,
        role: 'USER',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        username: 'michael',
        email: 'michael@enxi-erp.com',
        password: hashedPassword,
        role: 'USER',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        username: 'emma',
        email: 'emma@enxi-erp.com',
        password: hashedPassword,
        role: 'USER',
        isActive: true
      }
    })
  ])

  // Create chart of accounts
  const [cash, bank, accountsReceivable, salesRevenue, serviceRevenue] = await Promise.all([
    prisma.account.create({
      data: {
        code: '1000',
        name: 'Cash',
        type: 'ASSET',
        currency: 'USD',
        description: 'Cash on hand',
        createdBy: admin.id
      }
    }),
    prisma.account.create({
      data: {
        code: '1010',
        name: 'Bank Account',
        type: 'ASSET',
        currency: 'USD',
        description: 'Business checking account',
        createdBy: admin.id
      }
    }),
    prisma.account.create({
      data: {
        code: '1200',
        name: 'Accounts Receivable',
        type: 'ASSET',
        currency: 'USD',
        description: 'Customer receivables',
        createdBy: admin.id
      }
    }),
    prisma.account.create({
      data: {
        code: '4000',
        name: 'Sales Revenue',
        type: 'INCOME',
        currency: 'USD',
        description: 'Product sales revenue',
        createdBy: admin.id
      }
    }),
    prisma.account.create({
      data: {
        code: '4100',
        name: 'Service Revenue',
        type: 'INCOME',
        currency: 'USD',
        description: 'Service revenue',
        createdBy: admin.id
      }
    })
  ])

  // Create customers with AR accounts
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        customerNumber: 'CUST-0001',
        name: 'TechCorp Solutions',
        email: 'finance@techcorp.com',
        phone: '+1 (555) 123-4567',
        industry: 'Technology',
        website: 'https://techcorp.com',
        address: '123 Tech Street, San Francisco, CA 94105',
        currency: 'USD',
        creditLimit: 150000,
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
    }),
    prisma.customer.create({
      data: {
        customerNumber: 'CUST-0002',
        name: 'Global Manufacturing Inc',
        email: 'ap@globalmanuf.com',
        phone: '+1 (555) 987-6543',
        industry: 'Manufacturing',
        website: 'https://globalmanuf.com',
        address: '456 Industrial Ave, Detroit, MI 48201',
        currency: 'USD',
        creditLimit: 250000,
        paymentTerms: 45,
        createdBy: admin.id,
        account: {
          create: {
            code: '1200-0002',
            name: 'AR - Global Manufacturing Inc',
            type: 'ASSET',
            currency: 'USD',
            description: 'Accounts Receivable for Global Manufacturing Inc',
            parentId: accountsReceivable.id,
            createdBy: admin.id
          }
        }
      }
    }),
    prisma.customer.create({
      data: {
        customerNumber: 'CUST-0003',
        name: 'Healthcare Systems Ltd',
        email: 'procurement@healthsystems.com',
        phone: '+1 (555) 456-7890',
        industry: 'Healthcare',
        website: 'https://healthsystems.com',
        address: '789 Medical Center Dr, Boston, MA 02115',
        currency: 'USD',
        creditLimit: 200000,
        paymentTerms: 30,
        createdBy: admin.id,
        account: {
          create: {
            code: '1200-0003',
            name: 'AR - Healthcare Systems Ltd',
            type: 'ASSET',
            currency: 'USD',
            description: 'Accounts Receivable for Healthcare Systems Ltd',
            parentId: accountsReceivable.id,
            createdBy: admin.id
          }
        }
      }
    }),
    prisma.customer.create({
      data: {
        customerNumber: 'CUST-0004',
        name: 'Retail Chain Corp',
        email: 'finance@retailchain.com',
        phone: '+1 (555) 321-9876',
        industry: 'Retail',
        website: 'https://retailchain.com',
        address: '321 Commerce Blvd, Chicago, IL 60601',
        currency: 'USD',
        creditLimit: 100000,
        paymentTerms: 30,
        createdBy: admin.id,
        account: {
          create: {
            code: '1200-0004',
            name: 'AR - Retail Chain Corp',
            type: 'ASSET',
            currency: 'USD',
            description: 'Accounts Receivable for Retail Chain Corp',
            parentId: accountsReceivable.id,
            createdBy: admin.id
          }
        }
      }
    }),
    prisma.customer.create({
      data: {
        customerNumber: 'CUST-0005',
        name: 'Education District 425',
        email: 'purchasing@ed425.gov',
        phone: '+1 (555) 654-3210',
        industry: 'Education',
        website: 'https://ed425.gov',
        address: '555 Learning Lane, Seattle, WA 98101',
        currency: 'USD',
        creditLimit: 300000,
        paymentTerms: 60,
        createdBy: admin.id,
        account: {
          create: {
            code: '1200-0005',
            name: 'AR - Education District 425',
            type: 'ASSET',
            currency: 'USD',
            description: 'Accounts Receivable for Education District 425',
            parentId: accountsReceivable.id,
            createdBy: admin.id
          }
        }
      }
    })
  ])

  // Create inventory items
  const pieces = await prisma.unitOfMeasure.create({
    data: {
      code: 'PCS',
      name: 'Pieces',
      symbol: 'pcs',
      isBaseUnit: true,
      createdBy: admin.id
    }
  })

  const hours = await prisma.unitOfMeasure.create({
    data: {
      code: 'HR',
      name: 'Hours',
      symbol: 'hr',
      isBaseUnit: true,
      createdBy: admin.id
    }
  })

  const electronics = await prisma.category.create({
    data: {
      code: 'ELEC',
      name: 'Electronics',
      description: 'Electronic products',
      createdBy: admin.id
    }
  })

  const services = await prisma.category.create({
    data: {
      code: 'SRV',
      name: 'Services',
      description: 'Professional services',
      createdBy: admin.id
    }
  })

  const items = await Promise.all([
    prisma.item.create({
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
    }),
    prisma.item.create({
      data: {
        code: 'LAP-PRO-15',
        name: 'Professional Laptop 15"',
        description: 'High-performance laptop with Intel i7, 16GB RAM, 512GB SSD',
        categoryId: electronics.id,
        type: 'PRODUCT',
        unitOfMeasureId: pieces.id,
        trackInventory: true,
        minStockLevel: 5,
        maxStockLevel: 50,
        reorderPoint: 10,
        standardCost: 800,
        listPrice: 1299,
        salesAccountId: salesRevenue.id,
        isSaleable: true,
        isPurchaseable: true,
        createdBy: admin.id
      }
    }),
    prisma.item.create({
      data: {
        code: 'SRV-SUPPORT',
        name: 'Technical Support',
        description: 'Hourly technical support services',
        categoryId: services.id,
        type: 'SERVICE',
        unitOfMeasureId: hours.id,
        trackInventory: false,
        standardCost: 75,
        listPrice: 150,
        salesAccountId: serviceRevenue.id,
        isSaleable: true,
        isPurchaseable: false,
        createdBy: admin.id
      }
    }),
    prisma.item.create({
      data: {
        code: 'SRV-TRAINING',
        name: 'Training Services',
        description: 'Professional training and consultation',
        categoryId: services.id,
        type: 'SERVICE',
        unitOfMeasureId: hours.id,
        trackInventory: false,
        standardCost: 100,
        listPrice: 200,
        salesAccountId: serviceRevenue.id,
        isSaleable: true,
        isPurchaseable: false,
        createdBy: admin.id
      }
    })
  ])

  console.log('✅ Base data created')

  return {
    users: { admin, sales, accountant, manager },
    accounts: { cash, bank, accountsReceivable, salesRevenue, serviceRevenue },
    customers,
    items
  }
}

async function createComprehensivePaymentHistory(baseData: any) {
  const { users, customers, items, accounts } = baseData

  // Create invoices and payments for each customer over the past 12 months
  for (let customerIndex = 0; customerIndex < customers.length; customerIndex++) {
    const customer = customers[customerIndex]
    
    console.log(`  💳 Creating payment history for ${customer.name}...`)
    
    // Create 6-12 invoices per customer with varying payment patterns
    const invoiceCount = 6 + Math.floor(Math.random() * 7) // 6-12 invoices
    
    for (let i = 0; i < invoiceCount; i++) {
      const invoiceDate = daysAgo(Math.floor(Math.random() * 360) + 30) // 30-390 days ago
      const dueDate = new Date(invoiceDate)
      dueDate.setDate(dueDate.getDate() + customer.paymentTerms)
      
      // Random item and quantity
      const item = items[Math.floor(Math.random() * items.length)]
      const quantity = Math.floor(Math.random() * 20) + 1
      const unitPrice = item.listPrice * (0.8 + Math.random() * 0.4) // 80-120% of list price
      const subtotal = quantity * unitPrice
      const taxRate = 8.5
      const taxAmount = subtotal * (taxRate / 100)
      const totalAmount = subtotal + taxAmount
      
      // Create sales case and quotation first
      const salesCase = await prisma.salesCase.create({
        data: {
          caseNumber: `SC-2024-${String(customerIndex * 20 + i + 1).padStart(3, '0')}`,
          title: `${customer.name} - ${item.name} Order`,
          description: `Order for ${quantity} units of ${item.name}`,
          customerId: customer.id,
          estimatedValue: totalAmount,
          actualValue: totalAmount,
          cost: quantity * item.standardCost,
          profitMargin: ((totalAmount - (quantity * item.standardCost)) / totalAmount) * 100,
          status: 'WON',
          assignedTo: users.sales.id,
          createdBy: users.sales.id,
          closedAt: invoiceDate
        }
      })

      const quotation = await prisma.quotation.create({
        data: {
          quotationNumber: `QT-2024-${String(customerIndex * 20 + i + 1).padStart(3, '0')}`,
          salesCaseId: salesCase.id,
          status: 'ACCEPTED',
          validUntil: new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000),
          subtotal,
          taxAmount,
          discountAmount: 0,
          totalAmount,
          paymentTerms: `Net ${customer.paymentTerms}`,
          notes: `Order for ${customer.name}`,
          createdBy: users.sales.id,
          items: {
            create: [{
              itemId: item.id,
              itemCode: item.code,
              description: item.description,
              quantity,
              unitPrice,
              discount: 0,
              taxRate,
              subtotal,
              discountAmount: 0,
              taxAmount,
              totalAmount,
              sortOrder: 1
            }]
          }
        }
      })

      const salesOrder = await prisma.salesOrder.create({
        data: {
          orderNumber: `SO-2024-${String(customerIndex * 20 + i + 1).padStart(3, '0')}`,
          quotationId: quotation.id,
          salesCaseId: salesCase.id,
          orderDate: invoiceDate,
          requestedDate: new Date(invoiceDate.getTime() + 14 * 24 * 60 * 60 * 1000),
          status: 'DELIVERED',
          subtotal,
          taxAmount,
          discountAmount: 0,
          totalAmount,
          paymentTerms: `Net ${customer.paymentTerms}`,
          billingAddress: customer.address || '',
          shippingAddress: customer.address || '',
          approvedBy: users.manager.id,
          approvedAt: invoiceDate,
          createdBy: users.sales.id,
          items: {
            create: [{
              itemId: item.id,
              itemCode: item.code,
              description: item.description,
              quantity,
              unitPrice,
              discount: 0,
              taxRate,
              quantityShipped: quantity,
              sortOrder: 1
            }]
          }
        }
      })

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-2024-${String(customerIndex * 20 + i + 1).padStart(3, '0')}`,
          salesOrderId: salesOrder.id,
          customerId: customer.id,
          type: 'SALES',
          status: 'SENT',
          invoiceDate,
          dueDate,
          subtotal,
          taxAmount,
          discountAmount: 0,
          totalAmount,
          balanceAmount: totalAmount,
          paidAmount: 0,
          paymentTerms: `Net ${customer.paymentTerms}`,
          billingAddress: customer.address || '',
          notes: 'Thank you for your business!',
          sentBy: users.accountant.id,
          sentAt: invoiceDate,
          createdBy: users.accountant.id,
          items: {
            create: [{
              itemId: item.id,
              itemCode: item.code,
              description: item.description,
              quantity,
              unitPrice,
              discount: 0,
              taxRate,
              subtotal,
              discountAmount: 0,
              taxAmount,
              totalAmount
            }]
          }
        }
      })

      // Create payments based on different patterns
      await createPaymentPattern(invoice, customer, users.accountant.id, totalAmount)
    }
  }
}

async function createPaymentPattern(invoice: any, customer: any, accountantId: string, totalAmount: number) {
  const paymentPattern = Math.random()
  const isOverdue = new Date() > invoice.dueDate
  
  if (paymentPattern < 0.3) {
    // 30% - Full payment on time
    const paymentDate = new Date(invoice.dueDate.getTime() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000)
    
    await prisma.payment.create({
      data: {
        paymentNumber: `PAY-${invoice.invoiceNumber.replace('INV-', '')}`,
        invoiceId: invoice.id,
        customerId: customer.id,
        amount: totalAmount,
        paymentDate,
        paymentMethod: Math.random() > 0.5 ? 'BANK_TRANSFER' : 'CHECK',
        reference: Math.random() > 0.5 ? `Wire-${Math.floor(Math.random() * 100000)}` : `CHK-${Math.floor(Math.random() * 10000)}`,
        notes: 'Payment in full',
        createdBy: accountantId
      }
    })
    
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: totalAmount,
        balanceAmount: 0,
        status: 'PAID',
        paidAt: paymentDate
      }
    })
  } else if (paymentPattern < 0.5) {
    // 20% - Partial payments
    const firstPayment = Math.round(totalAmount * (0.4 + Math.random() * 0.3)) // 40-70%
    const firstPaymentDate = new Date(invoice.dueDate.getTime() - Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000)
    
    await prisma.payment.create({
      data: {
        paymentNumber: `PAY-${invoice.invoiceNumber.replace('INV-', '')}-1`,
        invoiceId: invoice.id,
        customerId: customer.id,
        amount: firstPayment,
        paymentDate: firstPaymentDate,
        paymentMethod: 'BANK_TRANSFER',
        reference: `Wire-${Math.floor(Math.random() * 100000)}`,
        notes: 'Partial payment',
        createdBy: accountantId
      }
    })
    
    if (Math.random() > 0.3) {
      // 70% chance of second payment
      const secondPayment = totalAmount - firstPayment
      const secondPaymentDate = new Date(firstPaymentDate.getTime() + Math.floor(Math.random() * 30 + 10) * 24 * 60 * 60 * 1000)
      
      await prisma.payment.create({
        data: {
          paymentNumber: `PAY-${invoice.invoiceNumber.replace('INV-', '')}-2`,
          invoiceId: invoice.id,
          customerId: customer.id,
          amount: secondPayment,
          paymentDate: secondPaymentDate,
          paymentMethod: Math.random() > 0.5 ? 'CHECK' : 'CREDIT_CARD',
          reference: Math.random() > 0.5 ? `CHK-${Math.floor(Math.random() * 10000)}` : `CC-${Math.floor(Math.random() * 10000)}`,
          notes: 'Final payment',
          createdBy: accountantId
        }
      })
      
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: totalAmount,
          balanceAmount: 0,
          status: 'PAID',
          paidAt: secondPaymentDate
        }
      })
    } else {
      // Still partial
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: firstPayment,
          balanceAmount: totalAmount - firstPayment,
          status: 'PARTIAL'
        }
      })
    }
  } else if (paymentPattern < 0.8) {
    // 30% - Late payments
    const lateDays = Math.floor(Math.random() * 45) + 5 // 5-50 days late
    const paymentDate = new Date(invoice.dueDate.getTime() + lateDays * 24 * 60 * 60 * 1000)
    
    if (paymentDate <= new Date()) {
      await prisma.payment.create({
        data: {
          paymentNumber: `PAY-${invoice.invoiceNumber.replace('INV-', '')}`,
          invoiceId: invoice.id,
          customerId: customer.id,
          amount: totalAmount,
          paymentDate,
          paymentMethod: Math.random() > 0.7 ? 'CASH' : 'CHECK',
          reference: Math.random() > 0.7 ? 'Cash Payment' : `CHK-${Math.floor(Math.random() * 10000)}`,
          notes: `Late payment - ${lateDays} days past due`,
          createdBy: accountantId
        }
      })
      
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: totalAmount,
          balanceAmount: 0,
          status: 'PAID',
          paidAt: paymentDate
        }
      })
    } else {
      // Still outstanding
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'OVERDUE'
        }
      })
    }
  } else {
    // 20% - Unpaid (outstanding)
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: isOverdue ? 'OVERDUE' : 'SENT'
      }
    })
  }
}

async function createCustomerBusinessHistory(baseData: any) {
  const { users, customers } = baseData
  
  // Create leads and business development history for each customer
  for (const customer of customers) {
    // Create original lead that was converted
    await prisma.lead.create({
      data: {
        firstName: customer.name.split(' ')[0],
        lastName: 'Contact',
        email: customer.email,
        phone: customer.phone,
        company: customer.name,
        jobTitle: 'Procurement Manager',
        source: ['WEBSITE', 'REFERRAL', 'TRADE_SHOW', 'PHONE_CALL'][Math.floor(Math.random() * 4)] as any,
        status: 'CONVERTED',
        notes: `Original lead converted to customer. Initial interest in our product line. Customer has been active for ${Math.floor(Math.random() * 24) + 6} months.`,
        createdBy: users.sales.id
      }
    })
  }
}

async function createAgingData(baseData: any) {
  const { users, customers, items, accounts } = baseData
  
  // Create specific aging scenarios for the first two customers
  const [customer1, customer2] = customers
  
  // Customer 1: Mixed aging buckets
  const agingInvoices = [
    { days: 5, amount: 15000 },    // Current
    { days: 35, amount: 8500 },    // 1-30 days
    { days: 45, amount: 12000 },   // 31-60 days
    { days: 75, amount: 6500 },    // 61-90 days
    { days: 120, amount: 3200 }    // 90+ days
  ]
  
  for (let i = 0; i < agingInvoices.length; i++) {
    const { days, amount } = agingInvoices[i]
    const invoiceDate = daysAgo(days + customer1.paymentTerms)
    const dueDate = daysAgo(days)
    
    const salesCase = await prisma.salesCase.create({
      data: {
        caseNumber: `SC-AGE-${i + 1}`,
        title: `Aging Test Case ${i + 1}`,
        description: `Test case for aging bucket ${i + 1}`,
        customerId: customer1.id,
        estimatedValue: amount,
        actualValue: amount,
        cost: amount * 0.6,
        profitMargin: 40,
        status: 'WON',
        assignedTo: users.sales.id,
        createdBy: users.sales.id,
        closedAt: invoiceDate
      }
    })

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber: `QT-AGE-${i + 1}`,
        salesCaseId: salesCase.id,
        status: 'ACCEPTED',
        validUntil: dueDate,
        subtotal: amount,
        taxAmount: amount * 0.085,
        discountAmount: 0,
        totalAmount: amount * 1.085,
        paymentTerms: `Net ${customer1.paymentTerms}`,
        createdBy: users.sales.id,
        items: {
          create: [{
            itemId: items[0].id,
            itemCode: items[0].code,
            description: `Aging test item ${i + 1}`,
            quantity: Math.ceil(amount / items[0].listPrice),
            unitPrice: items[0].listPrice,
            discount: 0,
            taxRate: 8.5,
            subtotal: amount,
            discountAmount: 0,
            taxAmount: amount * 0.085,
            totalAmount: amount * 1.085,
            sortOrder: 1
          }]
        }
      }
    })

    const salesOrder = await prisma.salesOrder.create({
      data: {
        orderNumber: `SO-AGE-${i + 1}`,
        quotationId: quotation.id,
        salesCaseId: salesCase.id,
        orderDate: invoiceDate,
        status: 'DELIVERED',
        subtotal: amount,
        taxAmount: amount * 0.085,
        discountAmount: 0,
        totalAmount: amount * 1.085,
        paymentTerms: `Net ${customer1.paymentTerms}`,
        billingAddress: customer1.address || '',
        shippingAddress: customer1.address || '',
        approvedBy: users.manager.id,
        approvedAt: invoiceDate,
        createdBy: users.sales.id,
        items: {
          create: [{
            itemId: items[0].id,
            itemCode: items[0].code,
            description: `Aging test item ${i + 1}`,
            quantity: Math.ceil(amount / items[0].listPrice),
            unitPrice: items[0].listPrice,
            discount: 0,
            taxRate: 8.5,
            quantityShipped: Math.ceil(amount / items[0].listPrice),
            sortOrder: 1
          }]
        }
      }
    })

    await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-AGE-${i + 1}`,
        salesOrderId: salesOrder.id,
        customerId: customer1.id,
        type: 'SALES',
        status: days <= 30 ? 'SENT' : 'OVERDUE',
        invoiceDate,
        dueDate,
        subtotal: amount,
        taxAmount: amount * 0.085,
        discountAmount: 0,
        totalAmount: amount * 1.085,
        balanceAmount: amount * 1.085,
        paidAmount: 0,
        paymentTerms: `Net ${customer1.paymentTerms}`,
        billingAddress: customer1.address || '',
        notes: `Aging test invoice - ${days} days past due`,
        sentBy: users.accountant.id,
        sentAt: invoiceDate,
        createdBy: users.accountant.id,
        items: {
          create: [{
            itemId: items[0].id,
            itemCode: items[0].code,
            description: `Aging test item ${i + 1}`,
            quantity: Math.ceil(amount / items[0].listPrice),
            unitPrice: items[0].listPrice,
            discount: 0,
            taxRate: 8.5,
            subtotal: amount,
            discountAmount: 0,
            taxAmount: amount * 0.085,
            totalAmount: amount * 1.085
          }]
        }
      }
    })
  }
}

async function printComprehensiveSummary() {
  console.log('\n' + '='.repeat(70))
  console.log('📊 COMPREHENSIVE PAYMENT & CUSTOMER LEDGER SEED SUMMARY')
  console.log('='.repeat(70))

  const [
    users,
    customers,
    invoices,
    payments,
    salesCases,
    quotations,
    salesOrders
  ] = await Promise.all([
    prisma.user.count(),
    prisma.customer.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.salesCase.count(),
    prisma.quotation.count(),
    prisma.salesOrder.count()
  ])

  // Get payment statistics
  const paymentStats = await prisma.payment.aggregate({
    _sum: { amount: true },
    _avg: { amount: true },
    _count: true
  })

  const invoiceStats = await prisma.invoice.aggregate({
    _sum: { 
      totalAmount: true,
      paidAmount: true,
      balanceAmount: true
    }
  })

  // Get status breakdowns
  const invoiceStatusBreakdown = await prisma.invoice.groupBy({
    by: ['status'],
    _count: { status: true },
    _sum: { balanceAmount: true }
  })

  console.log('\n📈 DATA CREATED:')
  console.log(`   👥 Users: ${users}`)
  console.log(`   🏢 Customers: ${customers} (with full transaction history)`)
  console.log(`   💼 Sales Cases: ${salesCases}`)
  console.log(`   📋 Quotations: ${quotations}`)
  console.log(`   📝 Sales Orders: ${salesOrders}`)
  console.log(`   🧾 Invoices: ${invoices}`)
  console.log(`   💳 Payments: ${payments}`)

  console.log('\n💰 FINANCIAL SUMMARY:')
  console.log(`   Total Invoiced: $${invoiceStats._sum.totalAmount?.toLocaleString() || '0'}`)
  console.log(`   Total Paid: $${invoiceStats._sum.paidAmount?.toLocaleString() || '0'}`)
  console.log(`   Outstanding AR: $${invoiceStats._sum.balanceAmount?.toLocaleString() || '0'}`)
  console.log(`   Average Payment: $${paymentStats._avg.amount?.toLocaleString() || '0'}`)

  console.log('\n📊 INVOICE STATUS BREAKDOWN:')
  for (const status of invoiceStatusBreakdown) {
    console.log(`   ${status.status}: ${status._count.status} invoices, $${status._sum.balanceAmount?.toLocaleString() || '0'} outstanding`)
  }

  console.log('\n🔑 LOGIN CREDENTIALS:')
  console.log('   Admin: admin / demo123')
  console.log('   Sales: sarah / demo123')
  console.log('   Accountant: michael / demo123')
  console.log('   Manager: emma / demo123')

  console.log('\n🎯 PAYMENT TESTING SCENARIOS:')
  console.log('   ✅ Multiple payment methods (Bank Transfer, Check, Cash, Credit Card)')
  console.log('   ✅ Various payment patterns (Full, Partial, Late, Outstanding)')
  console.log('   ✅ Aging analysis data (Current, 1-30, 31-60, 61-90, 90+ days)')
  console.log('   ✅ Customer payment history spanning 12 months')
  console.log('   ✅ Mixed customer credit statuses and payment behaviors')
  console.log('   ✅ Comprehensive customer ledger data')

  console.log('\n📋 READY FOR TESTING:')
  console.log('   • Payment recording forms')
  console.log('   • Customer ledger views')
  console.log('   • Aging reports')
  console.log('   • Payment allocation workflows')
  console.log('   • Customer credit management')
  console.log('   • Payment reconciliation')

  console.log('\n✅ COMPREHENSIVE PAYMENT MODULE DATA SEEDED SUCCESSFULLY!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })