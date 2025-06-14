#!/usr/bin/env tsx

/**
 * Basic Accounting Data Seeding Script
 * 
 * Creates essential accounting data:
 * - Standard chart of accounts
 * - Basic customers
 * - Sample journal entries
 * - Proper GL structure
 */

import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

async function seedBasicAccounting(): Promise<number> {
  console.warn('🏦 Starting Basic Accounting Data Seeding...\n')

  try {
    // Step 1: Clean existing accounting data
    console.warn('1. Cleaning existing accounting data...')
    
    // Disable foreign key checks temporarily for SQLite
    await prisma.$executeRaw`PRAGMA foreign_keys = OFF;`
    
    try {
      // Delete all data
      await prisma.journalLine.deleteMany({})
      await prisma.journalEntry.deleteMany({})
      await prisma.payment.deleteMany({})
      await prisma.invoiceItem.deleteMany({})
      await prisma.invoice.deleteMany({})
      await prisma.quotationItem.deleteMany({})
      await prisma.quotation.deleteMany({})
      await prisma.salesCase.deleteMany({})
      await prisma.lead.deleteMany({})
      await prisma.customer.deleteMany({})
      await prisma.account.deleteMany({})
    } finally {
      // Re-enable foreign key checks
      await prisma.$executeRaw`PRAGMA foreign_keys = ON;`
    }
    
    // Create or get admin user
    let adminUser = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: 'admin@enxi.com' },
          { username: 'admin' }
        ]
      }
    })
    
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@enxi.com',
          password: 'hashed_password_here',
          role: 'ADMIN',
          isActive: true
        }
      })
    }
    
    console.warn('   ✅ Data cleaned and admin user ready')

    // Step 2: Create standard chart of accounts
    console.warn('\n2. Creating standard chart of accounts...')
    
    const accounts = [
      // ASSETS
      { code: '1000', name: 'Cash and Cash Equivalents', type: 'ASSET', description: 'Current Assets', balance: 50000 },
      { code: '1100', name: 'Accounts Receivable', type: 'ASSET', description: 'Current Assets', balance: 25000 },
      { code: '1200', name: 'Inventory', type: 'ASSET', description: 'Current Assets', balance: 75000 },
      { code: '1300', name: 'Prepaid Expenses', type: 'ASSET', description: 'Current Assets', balance: 5000 },
      { code: '1500', name: 'Equipment', type: 'ASSET', description: 'Fixed Assets', balance: 100000 },
      { code: '1600', name: 'Accumulated Depreciation - Equipment', type: 'ASSET', description: 'Fixed Assets', balance: -20000 },
      
      // LIABILITIES
      { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', description: 'Current Liabilities', balance: 15000 },
      { code: '2100', name: 'Accrued Expenses', type: 'LIABILITY', description: 'Current Liabilities', balance: 8000 },
      { code: '2200', name: 'Sales Tax Payable', type: 'LIABILITY', description: 'Current Liabilities', balance: 3000 },
      { code: '2500', name: 'Long-term Debt', type: 'LIABILITY', description: 'Long-term Liabilities', balance: 50000 },
      
      // EQUITY
      { code: '3000', name: 'Common Stock', type: 'EQUITY', description: 'Paid-in Capital', balance: 100000 },
      { code: '3100', name: 'Retained Earnings', type: 'EQUITY', description: 'Retained Earnings', balance: 62000 },
      
      // INCOME
      { code: '4000', name: 'Sales Revenue', type: 'INCOME', description: 'Operating Revenue', balance: 0 },
      { code: '4100', name: 'Service Revenue', type: 'INCOME', description: 'Operating Revenue', balance: 0 },
      { code: '4900', name: 'Other Income', type: 'INCOME', description: 'Non-operating Revenue', balance: 0 },
      
      // EXPENSES
      { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', description: 'Direct Costs', balance: 0 },
      { code: '6000', name: 'Salaries and Wages', type: 'EXPENSE', description: 'Operating Expenses', balance: 0 },
      { code: '6100', name: 'Rent Expense', type: 'EXPENSE', description: 'Operating Expenses', balance: 0 },
      { code: '6200', name: 'Utilities Expense', type: 'EXPENSE', description: 'Operating Expenses', balance: 0 },
      { code: '6300', name: 'Marketing Expense', type: 'EXPENSE', description: 'Operating Expenses', balance: 0 },
      { code: '6400', name: 'Office Supplies', type: 'EXPENSE', description: 'Operating Expenses', balance: 0 },
      { code: '6500', name: 'Depreciation Expense', type: 'EXPENSE', description: 'Operating Expenses', balance: 0 },
      { code: '7000', name: 'Interest Expense', type: 'EXPENSE', description: 'Non-operating Expenses', balance: 0 }
    ]

    const createdAccounts: { [key: string]: any } = {}
    
    for (const accountData of accounts) {
      const account = await prisma.account.create({
        data: {
          ...accountData,
          currency: 'USD',
          status: 'ACTIVE',
          createdBy: adminUser.id
        }
      })
      createdAccounts[accountData.code] = account
      console.warn(`   📊 Created account: ${accountData.code} - ${accountData.name}`)
    }
    
    console.warn('   ✅ Chart of accounts created')

    // Step 3: Create basic customers
    console.warn('\n3. Creating customers...')
    
    const customers = [
      {
        customerNumber: 'CUST-001',
        name: 'TechCorp Solutions',
        email: 'contact@techcorp.com',
        phone: '+1-555-0101',
        address: '123 Business Ave, Tech City, TC 12345',
        creditLimit: 50000,
        paymentTerms: 30
      },
      {
        customerNumber: 'CUST-002',
        name: 'Global Enterprises Ltd',
        email: 'sales@globalent.com',
        phone: '+1-555-0102',
        address: '456 Corporate Blvd, Business District, BD 67890',
        creditLimit: 75000,
        paymentTerms: 15
      },
      {
        customerNumber: 'CUST-003',
        name: 'StartUp Innovations',
        email: 'hello@startupinno.com',
        phone: '+1-555-0103',
        address: '789 Innovation St, Startup Valley, SV 54321',
        creditLimit: 25000,
        paymentTerms: 30
      }
    ]

    const createdCustomers: any[] = []
    for (const customerData of customers) {
      const customer = await prisma.customer.create({
        data: {
          ...customerData,
          createdBy: adminUser.id
        }
      })
      createdCustomers.push(customer)
      console.warn(`   👤 Created customer: ${customer.customerNumber} - ${customer.name}`)
    }
    
    console.warn('   ✅ Customers created')

    // Step 4: Create sample invoices
    console.warn('\n4. Creating sample invoices...')
    
    const invoices = [
      {
        customerId: createdCustomers[0].id,
        invoiceNumber: 'INV-2025-001',
        totalAmount: 15000,
        description: 'Professional services - Q1 2025'
      },
      {
        customerId: createdCustomers[1].id,
        invoiceNumber: 'INV-2025-002',
        totalAmount: 8500,
        description: 'Software licensing and support'
      },
      {
        customerId: createdCustomers[2].id,
        invoiceNumber: 'INV-2025-003',
        totalAmount: 12000,
        description: 'Hardware and equipment'
      }
    ]

    const createdInvoices: any[] = []
    for (const invoiceData of invoices) {
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: invoiceData.invoiceNumber,
          customerId: invoiceData.customerId,
          type: 'SALES',
          status: 'PAID',
          invoiceDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000 + 30 * 24 * 60 * 60 * 1000),
          paymentTerms: 'Net 30',
          billingAddress: 'Customer Address',
          notes: invoiceData.description,
          subtotal: invoiceData.totalAmount,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: invoiceData.totalAmount,
          paidAmount: invoiceData.totalAmount,
          balanceAmount: 0,
          createdBy: adminUser.id
        }
      })
      
      createdInvoices.push(invoice)
      console.warn(`   🧾 Created invoice: ${invoice.invoiceNumber} - $${invoice.totalAmount.toFixed(2)}`)
    }

    // Step 5: Create payments for invoices
    console.warn('\n5. Creating payments...')
    
    let paymentCounter = 1
    for (const invoice of createdInvoices) {
      const paymentNumber = `PAY-${String(paymentCounter++).padStart(4, '0')}`
      const payment = await prisma.payment.create({
        data: {
          paymentNumber,
          amount: invoice.totalAmount,
          paymentMethod: 'BANK_TRANSFER',
          paymentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          reference: `PAY-${invoice.invoiceNumber}`,
          notes: `Payment for invoice ${invoice.invoiceNumber}`,
          createdBy: adminUser.id,
          invoice: {
            connect: { id: invoice.id }
          },
          customer: {
            connect: { id: invoice.customerId }
          }
        }
      })
      console.warn(`   💰 Created payment: ${payment.paymentNumber} - $${payment.amount.toFixed(2)}`)
    }

    // Step 6: Create journal entries
    console.warn('\n6. Creating journal entries...')
    
    let entryNumber = 1
    
    // Journal entries for sales transactions
    for (const invoice of createdInvoices) {
      const customer = createdCustomers.find(c => c.id === invoice.customerId)
      
      // Sales transaction (when invoice is created)
      const salesEntry = await prisma.journalEntry.create({
        data: {
          entryNumber: `JE-${String(entryNumber++).padStart(4, '0')}`,
          date: invoice.invoiceDate,
          description: `Sales invoice ${invoice.invoiceNumber} - ${customer?.name}`,
          reference: invoice.invoiceNumber,
          createdBy: adminUser.id,
          lines: {
            create: [
              // Debit: Accounts Receivable
              {
                accountId: createdAccounts['1100'].id,
                description: `A/R - ${customer?.name}`,
                debitAmount: invoice.totalAmount,
                creditAmount: 0
              },
              // Credit: Sales Revenue
              {
                accountId: createdAccounts['4000'].id,
                description: 'Sales Revenue',
                debitAmount: 0,
                creditAmount: invoice.totalAmount
              }
            ]
          }
        }
      })
      
      console.warn(`   📚 Created sales journal entry: ${salesEntry.entryNumber}`)
      
      // Payment transaction (when payment is received)
      const paymentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      const paymentEntry = await prisma.journalEntry.create({
        data: {
          entryNumber: `JE-${String(entryNumber++).padStart(4, '0')}`,
          date: paymentDate,
          description: `Payment received for invoice ${invoice.invoiceNumber}`,
          reference: `PAY-${invoice.invoiceNumber}`,
          createdBy: adminUser.id,
          lines: {
            create: [
              // Debit: Cash
              {
                accountId: createdAccounts['1000'].id,
                description: 'Cash received',
                debitAmount: invoice.totalAmount,
                creditAmount: 0
              },
              // Credit: Accounts Receivable
              {
                accountId: createdAccounts['1100'].id,
                description: `A/R payment - ${customer?.name}`,
                debitAmount: 0,
                creditAmount: invoice.totalAmount
              }
            ]
          }
        }
      })
      
      console.warn(`   📚 Created payment journal entry: ${paymentEntry.entryNumber}`)
    }
    
    // Create some expense entries
    const expenses = [
      { account: '6100', description: 'Monthly office rent', amount: 5000 },
      { account: '6200', description: 'Utilities - electricity and internet', amount: 800 },
      { account: '6000', description: 'Employee salaries', amount: 25000 },
      { account: '6300', description: 'Marketing campaign', amount: 3000 },
      { account: '6400', description: 'Office supplies purchase', amount: 500 }
    ]
    
    for (const expense of expenses) {
      const expenseDate = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
      const expenseEntry = await prisma.journalEntry.create({
        data: {
          entryNumber: `JE-${String(entryNumber++).padStart(4, '0')}`,
          date: expenseDate,
          description: expense.description,
          reference: `EXP-${entryNumber}`,
          createdBy: adminUser.id,
          lines: {
            create: [
              // Debit: Expense Account
              {
                accountId: createdAccounts[expense.account].id,
                description: expense.description,
                debitAmount: expense.amount,
                creditAmount: 0
              },
              // Credit: Cash or Accounts Payable
              {
                accountId: Math.random() > 0.5 ? createdAccounts['1000'].id : createdAccounts['2000'].id,
                description: Math.random() > 0.5 ? 'Cash payment' : 'Accrued expense',
                debitAmount: 0,
                creditAmount: expense.amount
              }
            ]
          }
        }
      })
      
      console.warn(`   📚 Created expense journal entry: ${expenseEntry.entryNumber}`)
    }

    // Step 7: Update account balances based on journal entries
    console.warn('\n7. Updating account balances...')
    
    const allEntries = await prisma.journalLine.findMany({
      include: { account: true }
    })
    
    const balanceUpdates: { [accountId: string]: number } = {}
    
    for (const line of allEntries) {
      if (!balanceUpdates[line.accountId]) {
        balanceUpdates[line.accountId] = 0
      }
      
      // For asset and expense accounts: debit increases balance
      // For liability, equity, and income accounts: credit increases balance
      if (['ASSET', 'EXPENSE'].includes(line.account.type)) {
        balanceUpdates[line.accountId] += line.debitAmount - line.creditAmount
      } else {
        balanceUpdates[line.accountId] += line.creditAmount - line.debitAmount
      }
    }
    
    for (const [accountId, balanceChange] of Object.entries(balanceUpdates)) {
      const account = await prisma.account.findUnique({ where: { id: accountId } })
      if (account) {
        await prisma.account.update({
          where: { id: accountId },
          data: { balance: account.balance + balanceChange }
        })
        console.warn(`   💰 Updated ${account.code} balance: $${(account.balance + balanceChange).toFixed(2)}`)
      }
    }

    // Step 8: Generate summary report
    console.warn('\n8. Generating summary report...')
    
    const totalAccounts = await prisma.account.count()
    const totalCustomers = await prisma.customer.count()
    const totalInvoices = await prisma.invoice.count()
    const totalPayments = await prisma.payment.count()
    const totalJournalEntries = await prisma.journalEntry.count()
    
    const totalRevenue = await prisma.journalLine.aggregate({
      where: {
        account: { type: 'INCOME' },
        creditAmount: { gt: 0 }
      },
      _sum: { creditAmount: true }
    })
    
    const totalExpenses = await prisma.journalLine.aggregate({
      where: {
        account: { type: 'EXPENSE' },
        debitAmount: { gt: 0 }
      },
      _sum: { debitAmount: true }
    })
    
    console.warn('\n📊 BASIC ACCOUNTING SEED SUMMARY')
    console.warn('=================================')
    console.warn(`✅ Accounts Created: ${totalAccounts}`)
    console.warn(`✅ Customers Created: ${totalCustomers}`)
    console.warn(`✅ Invoices Generated: ${totalInvoices}`)
    console.warn(`✅ Payments Recorded: ${totalPayments}`)
    console.warn(`✅ Journal Entries: ${totalJournalEntries}`)
    console.warn(`📈 Total Revenue: $${(totalRevenue._sum.creditAmount || 0).toFixed(2)}`)
    console.warn(`📉 Total Expenses: $${(totalExpenses._sum.debitAmount || 0).toFixed(2)}`)
    console.warn(`💰 Net Income: $${((totalRevenue._sum.creditAmount || 0) - (totalExpenses._sum.debitAmount || 0)).toFixed(2)}`)
    
    console.warn('\n🎉 BASIC ACCOUNTING SEEDING COMPLETED!')
    console.warn('\n🔗 Ready for testing:')
    console.warn('1. Chart of Accounts: http://localhost:3000/accounting/accounts')
    console.warn('2. Customers: http://localhost:3000/customers')
    console.warn('3. Invoices: http://localhost:3000/invoices')
    console.warn('4. Payments: http://localhost:3000/payments')
    console.warn('5. Journal Entries: http://localhost:3000/accounting/journal-entries')
    console.warn('6. Financial Reports: http://localhost:3000/accounting/reports')

} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect()
    }
}

// Run the seeding
if (require.main === module) {
  seedBasicAccounting()
}

export default seedBasicAccounting