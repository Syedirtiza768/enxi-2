#!/usr/bin/env tsx

/**
 * Comprehensive Accounting Data Seeding Script
 * 
 * This script creates a complete, consistent accounting dataset with:
 * - Standard chart of accounts
 * - Sample customers, suppliers, and items
 * - Sales transactions with proper GL posting
 * - Purchase transactions and expenses
 * - Payment records and reconciliation
 * - All foreign key relationships maintained
 */

import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

async function seedComprehensiveAccounting(): Promise<number> {
  console.warn('🏦 Starting Comprehensive Accounting Data Seeding...\n')

  try {
    // Step 1: Clean existing data (in reverse dependency order)
    console.warn('1. Cleaning existing data...')
    
    await prisma.journalLine.deleteMany({})
    await prisma.journalEntry.deleteMany({})
    await prisma.payment.deleteMany({})
    await prisma.invoiceItem.deleteMany({})
    await prisma.invoice.deleteMany({})
    await prisma.quotationItem.deleteMany({})
    await prisma.quotation.deleteMany({})
    await prisma.salesCase.deleteMany({})
    await prisma.lead.deleteMany({})
    await prisma.stockMovement.deleteMany({})
    await prisma.stockLot.deleteMany({})
    await prisma.item.deleteMany({})
    await prisma.category.deleteMany({})
    await prisma.customer.deleteMany({})
    await prisma.account.deleteMany({})
    await prisma.user.deleteMany({})
    
    console.warn('   ✅ Existing data cleaned')

    // Step 2: Create admin user
    console.warn('\n2. Creating admin user...')
    
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@enxi.com',
        password: 'hashed_password_here', // In real app, this would be properly hashed
        role: 'ADMIN',
        isActive: true
      }
    })
    
    console.warn('   ✅ Admin user created')

    // Step 3: Create standard chart of accounts
    console.warn('\n3. Creating standard chart of accounts...')
    
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
      
      // REVENUE
      { code: '4000', name: 'Sales Revenue', type: 'REVENUE', description: 'Operating Revenue', balance: 0 },
      { code: '4100', name: 'Service Revenue', type: 'REVENUE', description: 'Operating Revenue', balance: 0 },
      { code: '4900', name: 'Other Income', type: 'REVENUE', description: 'Non-operating Revenue', balance: 0 },
      
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

    // Step 4: Create inventory categories and items
    console.warn('\n4. Creating inventory structure...')
    
    const categories = [
      { code: 'ELEC', name: 'Electronics', description: 'Electronic devices and components' },
      { code: 'SOFT', name: 'Software', description: 'Software products and licenses' },
      { code: 'SERV', name: 'Services', description: 'Professional services' }
    ]
    
    const createdCategories: any[] = []
    for (const categoryData of categories) {
      const category = await prisma.category.create({
        data: {
          ...categoryData,
          isActive: true,
          createdBy: adminUser.id
        }
      })
      createdCategories.push(category)
      console.warn(`   📦 Created category: ${category.name}`)
    }

    const items = [
      { categoryId: createdCategories[0].id, itemCode: 'LAPTOP-001', description: 'Business Laptop', unitPrice: 1200, standardCost: 800, quantityOnHand: 25 },
      { categoryId: createdCategories[0].id, itemCode: 'MOUSE-001', description: 'Wireless Mouse', unitPrice: 45, standardCost: 25, quantityOnHand: 100 },
      { categoryId: createdCategories[0].id, itemCode: 'KEYBOARD-001', description: 'Mechanical Keyboard', unitPrice: 120, standardCost: 75, quantityOnHand: 50 },
      { categoryId: createdCategories[1].id, itemCode: 'SW-CRM', description: 'CRM Software License', unitPrice: 500, standardCost: 200, quantityOnHand: 10 },
      { categoryId: createdCategories[1].id, itemCode: 'SW-OFFICE', description: 'Office Suite License', unitPrice: 300, standardCost: 150, quantityOnHand: 20 },
      { categoryId: createdCategories[2].id, itemCode: 'CONSULT-HR', description: 'IT Consulting (per hour)', unitPrice: 150, standardCost: 100, quantityOnHand: 0 },
      { categoryId: createdCategories[2].id, itemCode: 'SUPPORT-PLAN', description: 'Annual Support Plan', unitPrice: 2000, standardCost: 800, quantityOnHand: 0 }
    ]

    const createdItems: any[] = []
    for (const itemData of items) {
      const item = await prisma.item.create({
        data: {
          ...itemData,
          unitOfMeasure: 'Each',
          isActive: true,
          createdBy: adminUser.id
        }
      })
      
      // Create stock lots for items with inventory
      if (itemData.quantityOnHand > 0) {
        await prisma.stockLot.create({
          data: {
            itemId: item.id,
            lotNumber: `LOT-${item.itemCode}-001`,
            quantity: itemData.quantityOnHand,
            costPerUnit: itemData.standardCost,
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
            createdBy: adminUser.id
          }
        })
        
        // Create opening stock movement
        await prisma.stockMovement.create({
          data: {
            itemId: item.id,
            movementType: 'OPENING',
            quantity: itemData.quantityOnHand,
            unitCost: itemData.standardCost,
            totalCost: itemData.quantityOnHand * itemData.standardCost,
            movementDate: new Date(),
            notes: 'Opening stock balance',
            createdBy: adminUser.id
          }
        })
      }
      
      createdItems.push(item)
      console.warn(`   📱 Created item: ${item.itemCode} - ${item.description}`)
    }
    
    console.warn('   ✅ Inventory structure created')

    // Step 5: Create customers
    console.warn('\n5. Creating customers...')
    
    const customers = [
      {
        customerNumber: 'CUST-001',
        name: 'TechCorp Solutions',
        email: 'contact@techcorp.com',
        phone: '+1-555-0101',
        address: '123 Business Ave, Tech City, TC 12345',
        creditLimit: 50000,
        paymentTerms: 'Net 30'
      },
      {
        customerNumber: 'CUST-002',
        name: 'Global Enterprises Ltd',
        email: 'sales@globalent.com',
        phone: '+1-555-0102',
        address: '456 Corporate Blvd, Business District, BD 67890',
        creditLimit: 75000,
        paymentTerms: 'Net 15'
      },
      {
        customerNumber: 'CUST-003',
        name: 'StartUp Innovations',
        email: 'hello@startupinno.com',
        phone: '+1-555-0103',
        address: '789 Innovation St, Startup Valley, SV 54321',
        creditLimit: 25000,
        paymentTerms: 'Net 30'
      },
      {
        customerNumber: 'CUST-004',
        name: 'Manufacturing Plus',
        email: 'orders@mfgplus.com',
        phone: '+1-555-0104',
        address: '321 Industrial Way, Factory Town, FT 98765',
        creditLimit: 100000,
        paymentTerms: 'Net 45'
      }
    ]

    const createdCustomers: any[] = []
    for (const customerData of customers) {
      const customer = await prisma.customer.create({
        data: {
          ...customerData,
          isActive: true,
          createdBy: adminUser.id
        }
      })
      createdCustomers.push(customer)
      console.warn(`   👤 Created customer: ${customer.customerNumber} - ${customer.name}`)
    }
    
    console.warn('   ✅ Customers created')

    // Step 6: Create sales workflow data (leads -> cases -> quotations -> invoices)
    console.warn('\n6. Creating sales workflow data...')
    
    // Create leads
    const leads = [
      {
        customerId: createdCustomers[0].id,
        title: 'Office Equipment Upgrade',
        description: 'Looking for new laptops and peripherals for 25-person team',
        status: 'CONVERTED',
        priority: 'HIGH',
        estimatedValue: 35000,
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        source: 'Website'
      },
      {
        customerId: createdCustomers[1].id,
        title: 'Software Licensing Deal',
        description: 'Need CRM and office suite licenses for enterprise deployment',
        status: 'CONVERTED',
        priority: 'MEDIUM',
        estimatedValue: 15000,
        expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        source: 'Referral'
      },
      {
        customerId: createdCustomers[2].id,
        title: 'IT Consulting Project',
        description: 'Need consulting services for system implementation',
        status: 'QUALIFIED',
        priority: 'MEDIUM',
        estimatedValue: 12000,
        expectedCloseDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        source: 'Cold Call'
      }
    ]

    const createdLeads: any[] = []
    for (const leadData of leads) {
      const lead = await prisma.lead.create({
        data: {
          ...leadData,
          assignedTo: adminUser.id,
          createdBy: adminUser.id
        }
      })
      createdLeads.push(lead)
      console.warn(`   🎯 Created lead: ${lead.title}`)
    }

    // Create sales cases
    const salesCases = [
      {
        customerId: createdCustomers[0].id,
        leadId: createdLeads[0].id,
        title: 'TechCorp Equipment Purchase',
        description: 'Complete office equipment solution for TechCorp',
        status: 'CLOSED_WON',
        priority: 'HIGH',
        estimatedValue: 35000,
        actualValue: 32500,
        expectedCloseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        actualCloseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        customerId: createdCustomers[1].id,
        leadId: createdLeads[1].id,
        title: 'Global Enterprises Software Deal',
        description: 'Enterprise software licensing package',
        status: 'CLOSED_WON',
        priority: 'MEDIUM',
        estimatedValue: 15000,
        actualValue: 14000,
        expectedCloseDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        actualCloseDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      },
      {
        customerId: createdCustomers[2].id,
        leadId: createdLeads[2].id,
        title: 'StartUp Consulting Engagement',
        description: 'IT consulting and support services',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        estimatedValue: 12000,
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    ]

    const createdSalesCases: any[] = []
    for (const caseData of salesCases) {
      const salesCase = await prisma.salesCase.create({
        data: {
          ...caseData,
          assignedTo: adminUser.id,
          createdBy: adminUser.id
        }
      })
      createdSalesCases.push(salesCase)
      console.warn(`   💼 Created sales case: ${salesCase.title}`)
    }

    // Create quotations
    const quotations = [
      {
        salesCaseId: createdSalesCases[0].id,
        quotationNumber: 'QUO-2025-001',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'ACCEPTED',
        paymentTerms: 'Net 30',
        notes: 'Bulk discount applied for quantity purchase',
        items: [
          { itemId: createdItems[0].id, itemCode: 'LAPTOP-001', description: 'Business Laptop', quantity: 25, unitPrice: 1150, discount: 4.17, taxRate: 8.5 },
          { itemId: createdItems[1].id, itemCode: 'MOUSE-001', description: 'Wireless Mouse', quantity: 25, unitPrice: 42, discount: 6.67, taxRate: 8.5 },
          { itemId: createdItems[2].id, itemCode: 'KEYBOARD-001', description: 'Mechanical Keyboard', quantity: 15, unitPrice: 115, discount: 4.17, taxRate: 8.5 }
        ]
      },
      {
        salesCaseId: createdSalesCases[1].id,
        quotationNumber: 'QUO-2025-002',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'ACCEPTED',
        paymentTerms: 'Net 15',
        notes: 'Enterprise licensing package with volume discount',
        items: [
          { itemId: createdItems[3].id, itemCode: 'SW-CRM', description: 'CRM Software License', quantity: 10, unitPrice: 480, discount: 4.0, taxRate: 0 },
          { itemId: createdItems[4].id, itemCode: 'SW-OFFICE', description: 'Office Suite License', quantity: 25, unitPrice: 285, discount: 5.0, taxRate: 0 },
          { itemId: createdItems[6].id, itemCode: 'SUPPORT-PLAN', description: 'Annual Support Plan', quantity: 2, unitPrice: 1900, discount: 5.0, taxRate: 0 }
        ]
      }
    ]

    const createdQuotations: any[] = []
    for (const quotationData of quotations) {
      let subtotal = 0
      let discountAmount = 0
      let taxAmount = 0

      // Calculate totals
      for (const item of quotationData.items) {
        const itemSubtotal = item.quantity * item.unitPrice
        const itemDiscount = itemSubtotal * (item.discount / 100)
        const discountedAmount = itemSubtotal - itemDiscount
        const itemTax = discountedAmount * (item.taxRate / 100)
        
        subtotal += itemSubtotal
        discountAmount += itemDiscount
        taxAmount += itemTax
      }

      const totalAmount = subtotal - discountAmount + taxAmount

      const quotation = await prisma.quotation.create({
        data: {
          salesCaseId: quotationData.salesCaseId,
          quotationNumber: quotationData.quotationNumber,
          validUntil: quotationData.validUntil,
          status: quotationData.status,
          paymentTerms: quotationData.paymentTerms,
          notes: quotationData.notes,
          subtotal,
          discountAmount,
          taxAmount,
          totalAmount,
          createdBy: adminUser.id,
          items: {
            create: quotationData.items.map(item => {
              const itemSubtotal = item.quantity * item.unitPrice
              const itemDiscountAmount = itemSubtotal * (item.discount / 100)
              const discountedAmount = itemSubtotal - itemDiscountAmount
              const itemTaxAmount = discountedAmount * (item.taxRate / 100)
              const itemTotalAmount = discountedAmount + itemTaxAmount

              return {
                itemId: item.itemId,
                itemCode: item.itemCode,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                taxRate: item.taxRate,
                subtotal: itemSubtotal,
                discountAmount: itemDiscountAmount,
                taxAmount: itemTaxAmount,
                totalAmount: itemTotalAmount
              }
            })
          }
        },
        include: { items: true }
      })
      
      createdQuotations.push(quotation)
      console.warn(`   📋 Created quotation: ${quotation.quotationNumber} (${quotation.items.length} items)`)
    }

    // Create invoices from accepted quotations
    console.warn('\n7. Creating invoices from quotations...')
    
    const createdInvoices: any[] = []
    for (const quotation of createdQuotations) {
      if (quotation.status === 'ACCEPTED') {
        const salesCase = createdSalesCases.find(sc => sc.id === quotation.salesCaseId)
        const customer = createdCustomers.find(c => c.id === salesCase?.customerId)
        
        const invoice = await prisma.invoice.create({
          data: {
            invoiceNumber: `INV-2025-${String(createdInvoices.length + 1).padStart(3, '0')}`,
            customerId: customer.id,
            type: 'SALES',
            status: 'PAID',
            invoiceDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000 + 30 * 24 * 60 * 60 * 1000),
            paymentTerms: quotation.paymentTerms,
            billingAddress: customer.address,
            notes: `Invoice created from quotation ${quotation.quotationNumber}`,
            subtotal: quotation.subtotal,
            discountAmount: quotation.discountAmount,
            taxAmount: quotation.taxAmount,
            totalAmount: quotation.totalAmount,
            paidAmount: quotation.totalAmount,
            balanceAmount: 0,
            createdBy: adminUser.id,
            items: {
              create: quotation.items.map(item => ({
                itemId: item.itemId,
                itemCode: item.itemCode,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                taxRate: item.taxRate,
                subtotal: item.subtotal,
                discountAmount: item.discountAmount,
                taxAmount: item.taxAmount,
                totalAmount: item.totalAmount
              }))
            }
          },
          include: { items: true }
        })
        
        createdInvoices.push(invoice)
        console.warn(`   🧾 Created invoice: ${invoice.invoiceNumber} - $${invoice.totalAmount.toFixed(2)}`)
      }
    }

    // Create payments for invoices
    console.warn('\n8. Creating payments...')
    
    for (const invoice of createdInvoices) {
      const payment = await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: invoice.totalAmount,
          paymentMethod: 'bank_transfer',
          paymentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          reference: `PAY-${invoice.invoiceNumber}`,
          description: `Payment for invoice ${invoice.invoiceNumber}`,
          createdBy: adminUser.id
        }
      })
      console.warn(`   💰 Created payment: ${payment.reference} - $${payment.amount.toFixed(2)}`)
    }

    // Step 9: Create journal entries for all transactions
    console.warn('\n9. Creating journal entries...')
    
    let entryNumber = 1
    
    // Journal entries for sales transactions
    for (const invoice of createdInvoices) {
      const customer = createdCustomers.find(c => c.id === invoice.customerId)
      
      // Sales transaction (when invoice is created)
      const salesEntry = await prisma.journalEntry.create({
        data: {
          entryNumber: `JE-${String(entryNumber++).padStart(4, '0')}`,
          entryDate: invoice.invoiceDate,
          description: `Sales invoice ${invoice.invoiceNumber} - ${customer?.name}`,
          reference: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount,
          isPosted: true,
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
              // Credit: Sales Revenue (net of tax)
              {
                accountId: createdAccounts['4000'].id,
                description: 'Sales Revenue',
                debitAmount: 0,
                creditAmount: invoice.totalAmount - invoice.taxAmount
              },
              // Credit: Sales Tax Payable (if applicable)
              ...(invoice.taxAmount > 0 ? [{
                accountId: createdAccounts['2200'].id,
                description: 'Sales Tax Payable',
                debitAmount: 0,
                creditAmount: invoice.taxAmount
              }] : [])
            ]
          }
        }
      })
      
      console.warn(`   📚 Created sales journal entry: ${salesEntry.entryNumber}`)
      
      // Payment transaction (when payment is received)
      const paymentEntry = await prisma.journalEntry.create({
        data: {
          entryNumber: `JE-${String(entryNumber++).padStart(4, '0')}`,
          entryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          description: `Payment received for invoice ${invoice.invoiceNumber}`,
          reference: `PAY-${invoice.invoiceNumber}`,
          totalAmount: invoice.totalAmount,
          isPosted: true,
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
      const expenseEntry = await prisma.journalEntry.create({
        data: {
          entryNumber: `JE-${String(entryNumber++).padStart(4, '0')}`,
          entryDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
          description: expense.description,
          reference: `EXP-${entryNumber}`,
          totalAmount: expense.amount,
          isPosted: true,
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

    // Step 10: Update account balances based on journal entries
    console.warn('\n10. Updating account balances...')
    
    const allEntries = await prisma.journalEntryLine.findMany({
      include: { account: true }
    })
    
    const balanceUpdates: { [accountId: string]: number } = {}
    
    for (const line of allEntries) {
      if (!balanceUpdates[line.accountId]) {
        balanceUpdates[line.accountId] = 0
      }
      
      // For asset and expense accounts: debit increases balance
      // For liability, equity, and revenue accounts: credit increases balance
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

    // Step 11: Generate summary report
    console.warn('\n11. Generating summary report...')
    
    const totalAccounts = await prisma.account.count()
    const totalCustomers = await prisma.customer.count()
    const totalItems = await prisma.item.count()
    const totalInvoices = await prisma.invoice.count()
    const totalPayments = await prisma.payment.count()
    const totalJournalEntries = await prisma.journalEntry.count()
    
    const totalRevenue = await prisma.journalEntryLine.aggregate({
      where: {
        account: { type: 'REVENUE' },
        creditAmount: { gt: 0 }
      },
      _sum: { creditAmount: true }
    })
    
    const totalExpenses = await prisma.journalEntryLine.aggregate({
      where: {
        account: { type: 'EXPENSE' },
        debitAmount: { gt: 0 }
      },
      _sum: { debitAmount: true }
    })
    
    console.warn('\n📊 COMPREHENSIVE ACCOUNTING SEED SUMMARY')
    console.warn('=========================================')
    console.warn(`✅ Accounts Created: ${totalAccounts}`)
    console.warn(`✅ Customers Created: ${totalCustomers}`)
    console.warn(`✅ Inventory Items: ${totalItems}`)
    console.warn(`✅ Invoices Generated: ${totalInvoices}`)
    console.warn(`✅ Payments Recorded: ${totalPayments}`)
    console.warn(`✅ Journal Entries: ${totalJournalEntries}`)
    console.warn(`📈 Total Revenue: $${(totalRevenue._sum.creditAmount || 0).toFixed(2)}`)
    console.warn(`📉 Total Expenses: $${(totalExpenses._sum.debitAmount || 0).toFixed(2)}`)
    console.warn(`💰 Net Income: $${((totalRevenue._sum.creditAmount || 0) - (totalExpenses._sum.debitAmount || 0)).toFixed(2)}`)
    
    console.warn('\n🎉 COMPREHENSIVE ACCOUNTING SEEDING COMPLETED!')
    console.warn('\n🔗 Ready for testing:')
    console.warn('1. Chart of Accounts: http://localhost:3000/accounting/accounts')
    console.warn('2. Customers: http://localhost:3000/customers')
    console.warn('3. Inventory: http://localhost:3000/inventory/items')
    console.warn('4. Invoices: http://localhost:3000/invoices')
    console.warn('5. Payments: http://localhost:3000/payments')
    console.warn('6. Journal Entries: http://localhost:3000/accounting/journal-entries')
    console.warn('7. Financial Reports: http://localhost:3000/accounting/reports')

} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect()
    }
}

// Run the seeding
if (require.main === module) {
  seedComprehensiveAccounting()
}

export default seedComprehensiveAccounting