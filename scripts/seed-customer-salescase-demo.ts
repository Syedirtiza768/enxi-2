import { PrismaClient, LeadStatus, LeadSource, SalesCaseStatus, QuotationStatus, PaymentMethod } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.warn('🌱 Starting Customer & SalesCase demo seeding...')

  try {
    // Get admin user (assuming it exists)
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (!adminUser) {
      throw new Error('Admin user not found. Please run seed-admin.ts first.')
    }

    console.warn('✅ Found admin user:', adminUser.email)

    // 1. Create a lead that will be converted to customer
    console.warn('\n📊 Creating lead for conversion...')
    const lead = await prisma.lead.create({
      data: {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@techcorp.com',
        phone: '+1-555-123-4567',
        company: 'TechCorp Solutions',
        title: 'VP of Engineering',
        industry: 'Technology',
        website: 'https://techcorp.example.com',
        source: LeadSource.WEBSITE,
        status: LeadStatus.CONTACTED,
        score: 85,
        estimatedValue: 150000,
        notes: 'Interested in our enterprise ERP solution. Looking to replace their current system by Q2.',
        createdById: adminUser.id,
        creator: {
          connect: { id: adminUser.id }
        }
      }
    })
    console.warn('✅ Created lead:', lead.firstName, lead.lastName)

    // 2. Convert lead to customer
    console.warn('\n🔄 Converting lead to customer...')
    const customerFromLead = await prisma.$transaction(async (tx) => {
      // Create customer from lead
      const customer = await tx.customer.create({
        data: {
          name: lead.company!,
          email: lead.email,
          phone: lead.phone,
          industry: lead.industry,
          website: lead.website,
          address: '123 Tech Street, Suite 400, San Francisco, CA 94105',
          taxId: 'US-TAX-12345',
          currency: 'USD',
          creditLimit: 100000,
          paymentTerms: 30,
          leadId: lead.id,
          createdById: adminUser.id,
          createdBy: {
            connect: { id: adminUser.id }
          }
        }
      })

      // Create AR account for customer
      const arAccount = await tx.account.create({
        data: {
          code: `AR-${customer.customerNumber}`,
          name: `Accounts Receivable - ${customer.name}`,
          type: 'ASSET',
          subtype: 'CURRENT_ASSET',
          currency: customer.currency,
          isActive: true,
          customerId: customer.id
        }
      })

      // Update customer with account
      await tx.customer.update({
        where: { id: customer.id },
        data: { accountId: arAccount.id }
      })

      // Update lead status
      await tx.lead.update({
        where: { id: lead.id },
        data: { 
          status: LeadStatus.CONVERTED,
          customerId: customer.id
        }
      })

      return customer
    })
    console.warn('✅ Converted lead to customer:', customerFromLead.customerNumber)

    // 3. Create another customer directly (manual form)
    console.warn('\n👤 Creating customer via manual form...')
    const manualCustomer = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          name: 'Global Manufacturing Inc',
          email: 'contact@globalmanufacturing.com',
          phone: '+1-555-987-6543',
          industry: 'Manufacturing',
          website: 'https://globalmanufacturing.example.com',
          address: '789 Industrial Blvd, Detroit, MI 48201',
          taxId: 'US-TAX-67890',
          currency: 'USD',
          creditLimit: 250000,
          paymentTerms: 45,
          createdById: adminUser.id,
          createdBy: {
            connect: { id: adminUser.id }
          }
        }
      })

      // Create AR account
      const arAccount = await tx.account.create({
        data: {
          code: `AR-${customer.customerNumber}`,
          name: `Accounts Receivable - ${customer.name}`,
          type: 'ASSET',
          subtype: 'CURRENT_ASSET',
          currency: customer.currency,
          isActive: true,
          customerId: customer.id
        }
      })

      await tx.customer.update({
        where: { id: customer.id },
        data: { accountId: arAccount.id }
      })

      return customer
    })
    console.warn('✅ Created manual customer:', manualCustomer.customerNumber)

    // 4. Create sales case with full workflow
    console.warn('\n📋 Creating sales case...')
    const salesCase = await prisma.salesCase.create({
      data: {
        customerId: customerFromLead.id,
        title: 'Enterprise ERP Implementation - Phase 1',
        description: 'Complete ERP system implementation including inventory, sales, and accounting modules. Timeline: 6 months.',
        status: SalesCaseStatus.NEW,
        estimatedValue: 150000,
        assignedTo: adminUser.id,
        createdById: adminUser.id,
        createdBy: {
          connect: { id: adminUser.id }
        }
      }
    })
    console.warn('✅ Created sales case:', salesCase.caseNumber)

    // 5. Create quotation
    console.warn('\n📄 Creating quotation...')
    const quotation = await prisma.$transaction(async (tx) => {
      const quote = await tx.quotation.create({
        data: {
          customerId: customerFromLead.id,
          salesCaseId: salesCase.id,
          version: 1,
          status: QuotationStatus.DRAFT,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          currency: 'USD',
          subtotal: 135000,
          taxAmount: 13500,
          totalAmount: 148500,
          terms: 'Payment due within 30 days of invoice. 50% upfront, 50% on completion.',
          notes: 'This quotation includes all software licenses, implementation, training, and 1 year of support.',
          createdById: adminUser.id,
          createdBy: {
            connect: { id: adminUser.id }
          }
        }
      })

      // Add line items
      await tx.quotationItem.createMany({
        data: [
          {
            quotationId: quote.id,
            inventoryItemId: null,
            description: 'ERP Software License - Enterprise Edition',
            quantity: 1,
            unitPrice: 50000,
            taxRate: 10,
            taxAmount: 5000,
            totalAmount: 55000,
            sortOrder: 1
          },
          {
            quotationId: quote.id,
            inventoryItemId: null,
            description: 'Implementation Services - 500 hours',
            quantity: 500,
            unitPrice: 150,
            taxRate: 10,
            taxAmount: 7500,
            totalAmount: 82500,
            sortOrder: 2
          },
          {
            quotationId: quote.id,
            inventoryItemId: null,
            description: 'Training - 5 days onsite',
            quantity: 5,
            unitPrice: 2000,
            taxRate: 10,
            taxAmount: 1000,
            totalAmount: 11000,
            sortOrder: 3
          }
        ]
      })

      // Update sales case status
      await tx.salesCase.update({
        where: { id: salesCase.id },
        data: { status: SalesCaseStatus.QUOTING }
      })

      return quote
    })
    console.warn('✅ Created quotation:', quotation.quotationNumber)

    // 6. Add expenses to sales case
    console.warn('\n💰 Adding expenses...')
    const expenses = await prisma.caseExpense.createMany({
      data: [
        {
          salesCaseId: salesCase.id,
          description: 'Travel to client site for initial assessment',
          amount: 1500,
          currency: 'USD',
          category: 'Travel',
          expenseDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          needsApproval: true,
          approvalStatus: 'APPROVED',
          approvedBy: adminUser.id,
          approvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          createdById: adminUser.id
        },
        {
          salesCaseId: salesCase.id,
          description: 'Demo environment setup on cloud',
          amount: 500,
          currency: 'USD',
          category: 'Software',
          expenseDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          needsApproval: false,
          approvalStatus: 'APPROVED',
          createdById: adminUser.id
        },
        {
          salesCaseId: salesCase.id,
          description: 'Client dinner meeting',
          amount: 350,
          currency: 'USD',
          category: 'Entertainment',
          expenseDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          needsApproval: true,
          approvalStatus: 'PENDING',
          createdById: adminUser.id
        }
      ]
    })
    console.warn('✅ Added', expenses.count, 'expenses')

    // 7. Mark quotation as sent and accepted
    console.warn('\n✉️ Sending and accepting quotation...')
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: { 
        status: QuotationStatus.SENT,
        sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    })

    await new Promise(resolve => setTimeout(resolve, 100)) // Small delay

    await prisma.quotation.update({
      where: { id: quotation.id },
      data: { 
        status: QuotationStatus.ACCEPTED,
        acceptedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    })

    // 8. Create customer PO
    console.warn('\n📑 Creating customer PO...')
    const customerPO = await prisma.customerPO.create({
      data: {
        customerId: customerFromLead.id,
        salesCaseId: salesCase.id,
        quotationId: quotation.id,
        poNumber: 'PO-2024-001',
        poDate: new Date(),
        amount: quotation.totalAmount,
        currency: 'USD',
        description: 'Purchase order for ERP implementation',
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedBy: adminUser.id,
        createdById: adminUser.id
      }
    })
    console.warn('✅ Created customer PO:', customerPO.poNumber)

    // Update sales case status
    await prisma.salesCase.update({
      where: { id: salesCase.id },
      data: { status: SalesCaseStatus.PO_RECEIVED }
    })

    // 9. Create sales order from quotation
    console.warn('\n📦 Creating sales order...')
    const salesOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.create({
        data: {
          customerId: customerFromLead.id,
          quotationId: quotation.id,
          salesCaseId: salesCase.id,
          status: 'CONFIRMED',
          orderDate: new Date(),
          deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          currency: 'USD',
          subtotal: quotation.subtotal,
          taxAmount: quotation.taxAmount,
          totalAmount: quotation.totalAmount,
          shippingAddress: customerFromLead.address || '',
          billingAddress: customerFromLead.address || '',
          notes: 'Implementation to begin immediately upon confirmation',
          createdById: adminUser.id
        }
      })

      // Copy quotation items to order items
      const quoteItems = await tx.quotationItem.findMany({
        where: { quotationId: quotation.id }
      })

      for (const item of quoteItems) {
        await tx.salesOrderItem.create({
          data: {
            salesOrderId: order.id,
            inventoryItemId: item.inventoryItemId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            totalAmount: item.totalAmount,
            sortOrder: item.sortOrder
          }
        })
      }

      return order
    })
    console.warn('✅ Created sales order:', salesOrder.orderNumber)

    // 10. Mark as delivered and create invoice
    console.warn('\n🚚 Marking as delivered and creating invoice...')
    await prisma.salesOrder.update({
      where: { id: salesOrder.id },
      data: { 
        status: 'DELIVERED',
        deliveredAt: new Date()
      }
    })

    await prisma.salesCase.update({
      where: { id: salesCase.id },
      data: { status: SalesCaseStatus.DELIVERED }
    })

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          customerId: customerFromLead.id,
          salesOrderId: salesOrder.id,
          salesCaseId: salesCase.id,
          status: 'SENT',
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          currency: 'USD',
          subtotal: salesOrder.subtotal,
          taxAmount: salesOrder.taxAmount,
          totalAmount: salesOrder.totalAmount,
          paidAmount: 0,
          notes: '50% payment due upon receipt, remaining 50% due upon project completion',
          createdById: adminUser.id
        }
      })

      // Copy order items to invoice items
      const orderItems = await tx.salesOrderItem.findMany({
        where: { salesOrderId: salesOrder.id }
      })

      for (const item of orderItems) {
        await tx.invoiceItem.create({
          data: {
            invoiceId: inv.id,
            inventoryItemId: item.inventoryItemId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            totalAmount: item.totalAmount,
            sortOrder: item.sortOrder
          }
        })
      }

      return inv
    })
    console.warn('✅ Created invoice:', invoice.invoiceNumber)

    // 11. Record partial payment
    console.warn('\n💳 Recording partial payment...')
    const partialPayment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: invoice.totalAmount * 0.5, // 50% payment
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          paymentDate: new Date(),
          description: '50% upfront payment as per terms',
          referenceNumber: 'WIRE-2024-001',
          createdById: adminUser.id
        }
      })

      // Update invoice paid amount
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { 
          paidAmount: payment.amount,
          status: 'PARTIAL'
        }
      })

      // Create GL entries for the payment
      const journalEntry = await tx.journalEntry.create({
        data: {
          entryDate: new Date(),
          description: `Payment received - Invoice ${invoice.invoiceNumber}`,
          reference: payment.referenceNumber,
          status: 'POSTED',
          createdById: adminUser.id
        }
      })

      // Debit Cash, Credit AR
      await tx.journalEntryLine.createMany({
        data: [
          {
            journalEntryId: journalEntry.id,
            accountId: (await tx.account.findFirst({ where: { code: '1000' } }))?.id || '', // Cash account
            debit: payment.amount,
            credit: 0,
            description: 'Cash received from customer'
          },
          {
            journalEntryId: journalEntry.id,
            accountId: customerFromLead.accountId!,
            debit: 0,
            credit: payment.amount,
            description: 'Reduce AR balance'
          }
        ]
      })

      return payment
    })
    console.warn('✅ Recorded partial payment:', partialPayment.referenceNumber)

    // 12. Record full payment
    console.warn('\n💳 Recording final payment...')
    const finalPayment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: invoice.totalAmount * 0.5, // Remaining 50%
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          paymentDate: new Date(),
          description: 'Final 50% payment - project completed',
          referenceNumber: 'WIRE-2024-002',
          createdById: adminUser.id
        }
      })

      // Update invoice as fully paid
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { 
          paidAmount: invoice.totalAmount,
          status: 'PAID'
        }
      })

      // Create GL entries
      const journalEntry = await tx.journalEntry.create({
        data: {
          entryDate: new Date(),
          description: `Final payment received - Invoice ${invoice.invoiceNumber}`,
          reference: payment.referenceNumber,
          status: 'POSTED',
          createdById: adminUser.id
        }
      })

      await tx.journalEntryLine.createMany({
        data: [
          {
            journalEntryId: journalEntry.id,
            accountId: (await tx.account.findFirst({ where: { code: '1000' } }))?.id || '',
            debit: payment.amount,
            credit: 0,
            description: 'Cash received from customer'
          },
          {
            journalEntryId: journalEntry.id,
            accountId: customerFromLead.accountId!,
            debit: 0,
            credit: payment.amount,
            description: 'Clear remaining AR balance'
          }
        ]
      })

      return payment
    })
    console.warn('✅ Recorded final payment:', finalPayment.referenceNumber)

    // 13. Close the sales case
    console.warn('\n🎉 Closing sales case...')
    const closedCase = await prisma.salesCase.update({
      where: { id: salesCase.id },
      data: {
        status: SalesCaseStatus.CLOSED,
        result: 'WON',
        actualValue: invoice.totalAmount,
        cost: 80000, // Actual cost
        profitMargin: ((invoice.totalAmount - 80000) / invoice.totalAmount) * 100,
        closedAt: new Date()
      }
    })
    console.warn('✅ Closed sales case with result:', closedCase.result)

    // Display summary
    console.warn('\n📊 Demo Data Summary:')
    console.warn('====================')
    console.warn('1. Lead created:', lead.firstName, lead.lastName, '(', lead.email, ')')
    console.warn('2. Customer from lead:', customerFromLead.name, '-', customerFromLead.customerNumber)
    console.warn('3. Manual customer:', manualCustomer.name, '-', manualCustomer.customerNumber)
    console.warn('4. Sales case:', salesCase.caseNumber, '-', salesCase.title)
    console.warn('5. Quotation:', quotation.quotationNumber, '- Amount:', quotation.totalAmount)
    console.warn('6. Customer PO:', customerPO.poNumber)
    console.warn('7. Sales order:', salesOrder.orderNumber)
    console.warn('8. Invoice:', invoice.invoiceNumber, '- Status:', invoice.status)
    console.warn('9. Payments: 2 payments totaling', invoice.totalAmount)
    console.warn('10. Sales case closed as WON with profit margin:', closedCase.profitMargin.toFixed(2), '%')
    
    console.warn('\n✅ Demo seeding completed successfully!')

} catch (error) {
      console.error('Error:', error);
      await prisma.$disconnect()
    }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })