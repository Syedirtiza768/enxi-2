import { PrismaClient } from '@prisma/client'
import { InvoiceService } from '../lib/services/invoice.service'

const prisma = new PrismaClient()

async function createSampleInvoice() {
  try {
    console.log('🔍 Finding customers...')
    
    // Get the first available customer
    const customers = await prisma.customer.findMany({
      take: 1,
      include: {
        salesCases: {
          where: {
            status: 'OPEN'
          },
          take: 1
        }
      }
    })

    if (!customers.length) {
      console.error('❌ No customers found in the database')
      return
    }

    const customer = customers[0]
    console.log(`✅ Found customer: ${customer.name}`)

    // Check if customer has a sales case
    let salesCase = customer.salesCases[0]
    if (!salesCase) {
      console.log('📋 Creating sales case for customer...')
      salesCase = await prisma.salesCase.create({
        data: {
          customerId: customer.id,
          caseNumber: `SC-${Date.now()}`,
          description: 'Sample sales case for invoice',
          status: 'OPEN',
          priority: 'MEDIUM',
          assignedToId: 'system',
          createdById: 'system'
        }
      })
    }

    // Get tax rates
    const taxRate = await prisma.taxRate.findFirst({
      where: {
        isDefault: true,
        isActive: true
      }
    })

    console.log('📄 Creating invoice...')
    
    const invoiceService = new InvoiceService()
    
    // Calculate dates
    const today = new Date()
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30) // Net 30

    const invoiceData = {
      customerId: customer.id,
      salesCaseId: salesCase.id,
      type: 'SALES' as const,
      invoiceDate: today.toISOString(),
      dueDate: dueDate.toISOString(),
      paymentTerms: 'Net 30',
      billingAddress: customer.billingAddress || customer.address || '123 Main Street',
      notes: 'Sample invoice created for testing',
      items: [
        {
          itemCode: 'ITEM-001',
          description: 'Professional Services - Consulting',
          quantity: 10,
          unitPrice: 150,
          discount: 0,
          taxRate: taxRate?.rate || 5,
          taxRateId: taxRate?.id
        },
        {
          itemCode: 'ITEM-002',
          description: 'Software License - Annual Subscription',
          quantity: 1,
          unitPrice: 1200,
          discount: 10, // 10% discount
          taxRate: taxRate?.rate || 5,
          taxRateId: taxRate?.id
        },
        {
          itemCode: 'ITEM-003',
          description: 'Training Services - 2 Day Workshop',
          quantity: 2,
          unitPrice: 500,
          discount: 0,
          taxRate: taxRate?.rate || 5,
          taxRateId: taxRate?.id
        }
      ]
    }

    const invoice = await invoiceService.createInvoice(invoiceData, 'system')

    console.log('✅ Invoice created successfully!')
    console.log(`📋 Invoice Number: ${invoice.invoiceNumber}`)
    console.log(`💰 Total Amount: ${invoice.currency} ${invoice.totalAmount.toFixed(2)}`)
    console.log(`📅 Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`)
    console.log(`🔗 View at: http://localhost:3000/invoices/${invoice.id}`)

    // Display invoice summary
    console.log('\n📊 Invoice Summary:')
    console.log('─'.repeat(50))
    invoice.items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.description}`)
      console.log(`   Qty: ${item.quantity} × ${invoice.currency} ${item.unitPrice.toFixed(2)} = ${invoice.currency} ${item.subtotal.toFixed(2)}`)
      if (item.discount > 0) {
        console.log(`   Discount: ${item.discount}% (-${invoice.currency} ${item.discountAmount.toFixed(2)})`)
      }
      console.log(`   Tax: ${item.taxRate}% (+${invoice.currency} ${item.taxAmount.toFixed(2)})`)
      console.log(`   Line Total: ${invoice.currency} ${item.totalAmount.toFixed(2)}`)
      console.log('')
    })
    console.log('─'.repeat(50))
    console.log(`Subtotal: ${invoice.currency} ${invoice.subtotal.toFixed(2)}`)
    console.log(`Discount: -${invoice.currency} ${invoice.discountAmount.toFixed(2)}`)
    console.log(`Tax: +${invoice.currency} ${invoice.taxAmount.toFixed(2)}`)
    console.log(`Total: ${invoice.currency} ${invoice.totalAmount.toFixed(2)}`)

  } catch (error) {
    console.error('❌ Error creating invoice:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
createSampleInvoice()