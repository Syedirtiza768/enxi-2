import { PrismaClient, LeadStatus, LeadSource, SalesCaseStatus, QuotationStatus, PaymentMethod } from '@/lib/generated/prisma'
import { CustomerService } from '@/lib/services/customer.service'
import { LeadService } from '@/lib/services/lead.service'
import { SalesCaseService } from '@/lib/services/sales-case.service'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting Customer & SalesCase demo seeding...')

  try {
    // Get admin user (assuming it exists)
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (!adminUser) {
      throw new Error('Admin user not found. Please run seed-admin.ts first.')
    }

    console.log('✅ Found admin user:', adminUser.email)

    // Initialize services
    const leadService = new LeadService()
    const customerService = new CustomerService()
    const salesCaseService = new SalesCaseService()

    // 1. Create a lead that will be converted to customer
    console.log('\n📊 Creating lead for conversion...')
    const lead = await leadService.createLead({
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@techcorp.com',
      phone: '+1-555-123-4567',
      company: 'TechCorp Solutions',
      jobTitle: 'VP of Engineering',
      source: LeadSource.WEBSITE,
      status: LeadStatus.CONTACTED,
      notes: 'Interested in our enterprise ERP solution. Looking to replace their current system by Q2.'
    }, adminUser.id)
    console.log('✅ Created lead:', lead.firstName, lead.lastName)

    // 2. Convert lead to customer
    console.log('\n🔄 Converting lead to customer...')
    const customerFromLead = await leadService.convertToCustomer({
      leadId: lead.id,
      customerData: {
        name: lead.company!,
        email: lead.email,
        phone: lead.phone || undefined,
        industry: 'Technology',
        website: 'https://techcorp.example.com',
        address: '123 Tech Street, Suite 400, San Francisco, CA 94105',
        taxId: 'US-TAX-12345',
        currency: 'USD',
        creditLimit: 100000,
        paymentTerms: 30
      },
      createSalesCase: true,
      salesCaseTitle: 'Enterprise ERP Implementation - Phase 1'
    })
    console.log('✅ Converted lead to customer:', customerFromLead.customer.customerNumber)
    console.log('✅ Created sales case:', customerFromLead.salesCase?.caseNumber)

    // 3. Create another customer directly (manual form)
    console.log('\n👤 Creating customer via manual form...')
    const manualCustomer = await customerService.createCustomer({
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
    })
    console.log('✅ Created manual customer:', manualCustomer.customerNumber)

    // 4. Create quotation for the sales case
    console.log('\n📄 Creating quotation...')
    const quotation = await prisma.$transaction(async (tx) => {
      const quote = await tx.quotation.create({
        data: {
          customerId: customerFromLead.customer.id,
          salesCaseId: customerFromLead.salesCase!.id,
          version: 1,
          status: QuotationStatus.DRAFT,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          currency: 'USD',
          subtotal: 135000,
          taxAmount: 13500,
          totalAmount: 148500,
          terms: 'Payment due within 30 days of invoice. 50% upfront, 50% on completion.',
          notes: 'This quotation includes all software licenses, implementation, training, and 1 year of support.',
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
        where: { id: customerFromLead.salesCase!.id },
        data: { status: SalesCaseStatus.QUOTING }
      })

      return quote
    })
    console.log('✅ Created quotation:', quotation.quotationNumber)

    // 5. Add expenses to sales case
    console.log('\n💰 Adding expenses...')
    const expense1 = await salesCaseService.addExpense(customerFromLead.salesCase!.id, {
      description: 'Travel to client site for initial assessment',
      amount: 1500,
      currency: 'USD',
      category: 'Travel',
      expenseDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      needsApproval: true
    }, adminUser.id)

    // Approve the first expense
    await salesCaseService.approveExpense(expense1.id, adminUser.id, 'Approved for client visit')

    const expense2 = await salesCaseService.addExpense(customerFromLead.salesCase!.id, {
      description: 'Demo environment setup on cloud',
      amount: 500,
      currency: 'USD',
      category: 'Software',
      expenseDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      needsApproval: false
    }, adminUser.id)

    const expense3 = await salesCaseService.addExpense(customerFromLead.salesCase!.id, {
      description: 'Client dinner meeting',
      amount: 350,
      currency: 'USD',
      category: 'Entertainment',
      expenseDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      needsApproval: true
    }, adminUser.id)

    console.log('✅ Added 3 expenses (1 approved, 1 auto-approved, 1 pending)')

    // 6. Create customer PO
    console.log('\n📑 Creating customer PO...')
    const customerPO = await prisma.customerPO.create({
      data: {
        customerId: customerFromLead.customer.id,
        salesCaseId: customerFromLead.salesCase!.id,
        quotationId: quotation.id,
        poNumber: 'PO-2024-001',
        poDate: new Date(),
        amount: quotation.totalAmount,
        currency: 'USD',
        description: 'Purchase order for ERP implementation',
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedBy: adminUser.id,
        createdBy: {
          connect: { id: adminUser.id }
        }
      }
    })
    console.log('✅ Created customer PO:', customerPO.poNumber)

    // Update sales case status
    await prisma.salesCase.update({
      where: { id: customerFromLead.salesCase!.id },
      data: { status: SalesCaseStatus.PO_RECEIVED }
    })

    // Display summary
    console.log('\n📊 Demo Data Summary:')
    console.log('====================')
    console.log('1. Lead created:', lead.firstName, lead.lastName, '(', lead.email, ')')
    console.log('2. Customer from lead:', customerFromLead.customer.name, '-', customerFromLead.customer.customerNumber)
    console.log('3. Manual customer:', manualCustomer.name, '-', manualCustomer.customerNumber)
    console.log('4. Sales case:', customerFromLead.salesCase?.caseNumber, '-', customerFromLead.salesCase?.title)
    console.log('5. Quotation:', quotation.quotationNumber, '- Amount:', quotation.totalAmount)
    console.log('6. Expenses: 3 expenses added (2 approved, 1 pending)')
    console.log('7. Customer PO:', customerPO.poNumber)
    console.log('8. Sales case status: PO_RECEIVED')
    
    console.log('\n✅ Demo seeding completed successfully!')
    console.log('\nYou can now:')
    console.log('- View customers at /customers')
    console.log('- See customer details with Payments, Ledger, and Open Invoices tabs')
    console.log('- View the sales case at /sales-cases')
    console.log('- See quotations, expenses, and profitability analysis')
    console.log('- Track the complete workflow from lead → customer → sales case → quotation → PO')

  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })