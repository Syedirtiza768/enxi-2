import { PrismaClient, LeadStatus, LeadSource, SalesCaseStatus, QuotationStatus, PaymentMethod, ExpenseStatus } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

function generateCustomerNumber(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `CUST-${timestamp}-${random}`
}

function generateCaseNumber(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `CASE-${timestamp}-${random}`
}

function generateQuotationNumber(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `QUO-${timestamp}-${random}`
}

async function main() {
  console.warn('🌱 Starting Customer & SalesCase demo seeding...')

  try {
    // Clean up any existing demo data
    console.warn('🧹 Cleaning up existing demo data...')
    await prisma.caseExpense.deleteMany({
      where: { description: { contains: 'Travel to client site' } }
    })
    await prisma.quotationItem.deleteMany()
    await prisma.quotation.deleteMany({ where: { notes: { contains: 'software licenses' } } })
    await prisma.salesCase.deleteMany({ where: { title: { contains: 'Enterprise ERP' } } })
    await prisma.customer.deleteMany({ 
      where: { 
        OR: [
          { email: 'sarah.johnson@techcorp.com' },
          { email: 'contact@globalmanufacturing.com' }
        ]
      }
    })
    await prisma.lead.deleteMany({ where: { email: 'sarah.johnson@techcorp.com' } })
    console.warn('✅ Cleanup completed')
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
        jobTitle: 'VP of Engineering',
        source: LeadSource.WEBSITE,
        status: LeadStatus.CONTACTED,
        notes: 'Interested in our enterprise ERP solution. Looking to replace their current system by Q2.',
        createdBy: adminUser.id
      }
    })
    console.warn('✅ Created lead:', lead.firstName, lead.lastName)

    // 2. Convert lead to customer
    console.warn('\n🔄 Converting lead to customer...')
    const customerFromLead = await prisma.$transaction(async (tx) => {
      // Create customer from lead
      const customer = await tx.customer.create({
        data: {
          customerNumber: generateCustomerNumber(),
          name: lead.company!,
          email: lead.email,
          phone: lead.phone,
          industry: 'Technology',
          website: 'https://techcorp.example.com',
          address: '123 Tech Street, Suite 400, San Francisco, CA 94105',
          taxId: 'US-TAX-12345',
          currency: 'USD',
          creditLimit: 100000,
          paymentTerms: 30,
          leadId: lead.id,
          createdBy: adminUser.id
        }
      })

      // Create AR account for customer
      const arAccount = await tx.account.create({
        data: {
          code: `AR-${customer.customerNumber}`,
          name: `Accounts Receivable - ${customer.name}`,
          type: 'ASSET',
          currency: customer.currency,
          createdBy: adminUser.id
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
          status: LeadStatus.CONVERTED
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
          customerNumber: generateCustomerNumber(),
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
          createdBy: adminUser.id
        }
      })

      // Create AR account
      const arAccount = await tx.account.create({
        data: {
          code: `AR-${customer.customerNumber}`,
          name: `Accounts Receivable - ${customer.name}`,
          type: 'ASSET',
          currency: customer.currency,
          createdBy: adminUser.id
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
        caseNumber: generateCaseNumber(),
        customerId: customerFromLead.id,
        title: 'Enterprise ERP Implementation - Phase 1',
        description: 'Complete ERP system implementation including inventory, sales, and accounting modules. Timeline: 6 months.',
        status: SalesCaseStatus.NEW,
        estimatedValue: 150000,
        assignedTo: adminUser.id,
        createdBy: adminUser.id
      }
    })
    console.warn('✅ Created sales case:', salesCase.caseNumber)

    // 5. Create quotation
    console.warn('\n📄 Creating quotation...')
    const quotation = await prisma.$transaction(async (tx) => {
      const quote = await tx.quotation.create({
        data: {
          quotationNumber: generateQuotationNumber(),
          salesCaseId: salesCase.id,
          version: 1,
          status: QuotationStatus.DRAFT,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          subtotal: 135000,
          taxAmount: 13500,
          totalAmount: 148500,
          paymentTerms: 'Payment due within 30 days of invoice. 50% upfront, 50% on completion.',
          notes: 'This quotation includes all software licenses, implementation, training, and 1 year of support.',
          createdBy: adminUser.id
        }
      })

      // Add line items
      await tx.quotationItem.createMany({
        data: [
          {
            quotationId: quote.id,
            itemCode: 'ERP-ENT-001',
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
            itemCode: 'IMPL-SVC-001',
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
            itemCode: 'TRAIN-ONS-001',
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
          baseAmount: 1500,
          currency: 'USD',
          category: 'Travel',
          expenseDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          status: ExpenseStatus.APPROVED,
          createdBy: adminUser.id
        },
        {
          salesCaseId: salesCase.id,
          description: 'Demo environment setup on cloud',
          amount: 500,
          baseAmount: 500,
          currency: 'USD',
          category: 'Software',
          expenseDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          status: ExpenseStatus.APPROVED,
          createdBy: adminUser.id
        },
        {
          salesCaseId: salesCase.id,
          description: 'Client dinner meeting',
          amount: 350,
          baseAmount: 350,
          currency: 'USD',
          category: 'Entertainment',
          expenseDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          status: ExpenseStatus.PENDING,
          createdBy: adminUser.id
        }
      ]
    })
    console.warn('✅ Added', expenses.count, 'expenses')

    // Display summary
    console.warn('\n📊 Demo Data Summary:')
    console.warn('====================')
    console.warn('1. Lead created:', lead.firstName, lead.lastName, '(', lead.email, ')')
    console.warn('2. Customer from lead:', customerFromLead.name, '-', customerFromLead.customerNumber)
    console.warn('3. Manual customer:', manualCustomer.name, '-', manualCustomer.customerNumber)
    console.warn('4. Sales case:', salesCase.caseNumber, '-', salesCase.title)
    console.warn('5. Quotation:', quotation.quotationNumber, '- Amount:', quotation.totalAmount)
    console.warn('6. Expenses: 3 expenses added (1 pending approval)')
    
    console.warn('\n✅ Demo seeding completed successfully!')
    console.warn('\nYou can now:')
    console.warn('- View customers at /customers')
    console.warn('- View customer details with Payments, Ledger, and Open Invoices tabs')
    console.warn('- View the sales case at /sales-cases')
    console.warn('- See quotations, expenses, and profitability analysis')
    console.warn('- Track the complete workflow from lead → customer → sales case → quotation')

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