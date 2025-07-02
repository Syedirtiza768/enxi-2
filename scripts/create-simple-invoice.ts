import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createSimpleInvoice() {
  try {
    console.log('🔍 Finding customers...')
    
    // Get the first available customer
    const customer = await prisma.customer.findFirst({
      include: {
        salesCases: {
          where: {
            status: 'OPEN'
          },
          take: 1
        }
      }
    })

    if (!customer) {
      console.error('❌ No customers found in the database')
      return
    }

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

    console.log('📄 Creating invoice directly...')
    
    // Calculate dates
    const today = new Date()
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30) // Net 30

    // Generate invoice number
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`

    // Create invoice with items
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: customer.id,
        type: 'SALES',
        status: 'DRAFT',
        invoiceDate: today,
        dueDate: dueDate,
        paymentTerms: 'Net 30',
        billingAddress: customer.billingAddress || customer.address || '123 Main Street',
        notes: 'Sample invoice created for testing',
        subtotal: 3580.00,
        discountAmount: 120.00,
        taxAmount: 173.00,
        totalAmount: 3633.00,
        paidAmount: 0,
        balanceAmount: 3633.00,
        createdBy: 'system',
        items: {
          create: [
            {
              itemCode: 'ITEM-001',
              description: 'Professional Services - Consulting',
              quantity: 10,
              unitPrice: 150,
              discount: 0,
              taxRate: 5,
              subtotal: 1500.00,
              discountAmount: 0,
              taxAmount: 75.00,
              totalAmount: 1575.00
            },
            {
              itemCode: 'ITEM-002',
              description: 'Software License - Annual Subscription',
              quantity: 1,
              unitPrice: 1200,
              discount: 10,
              taxRate: 5,
              subtotal: 1200.00,
              discountAmount: 120.00,
              taxAmount: 54.00,
              totalAmount: 1134.00
            },
            {
              itemCode: 'ITEM-003',
              description: 'Training Services - 2 Day Workshop',
              quantity: 2,
              unitPrice: 500,
              discount: 0,
              taxRate: 5,
              subtotal: 1000.00,
              discountAmount: 0,
              taxAmount: 50.00,
              totalAmount: 1050.00
            }
          ]
        }
      },
      include: {
        items: true,
        customer: true
      }
    })

    const currency = customer.currency || 'AED'
    
    console.log('✅ Invoice created successfully!')
    console.log(`📋 Invoice Number: ${invoice.invoiceNumber}`)
    console.log(`👤 Customer: ${invoice.customer.name}`)
    console.log(`💰 Total Amount: ${currency} ${invoice.totalAmount.toFixed(2)}`)
    console.log(`📅 Due Date: ${invoice.dueDate.toLocaleDateString()}`)
    console.log(`🔗 View at: http://localhost:3000/invoices/${invoice.id}`)

    // Display invoice summary
    console.log('\n📊 Invoice Summary:')
    console.log('─'.repeat(50))
    invoice.items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.description}`)
      console.log(`   Qty: ${item.quantity} × ${currency} ${item.unitPrice.toFixed(2)} = ${currency} ${item.subtotal.toFixed(2)}`)
      if (item.discount > 0) {
        console.log(`   Discount: ${item.discount}% (-${currency} ${item.discountAmount.toFixed(2)})`)
      }
      console.log(`   Tax: ${item.taxRate}% (+${currency} ${item.taxAmount.toFixed(2)})`)
      console.log(`   Line Total: ${currency} ${item.totalAmount.toFixed(2)}`)
      console.log('')
    })
    console.log('─'.repeat(50))
    console.log(`Subtotal: ${currency} ${invoice.subtotal.toFixed(2)}`)
    console.log(`Discount: -${currency} ${invoice.discountAmount.toFixed(2)}`)
    console.log(`Tax: +${currency} ${invoice.taxAmount.toFixed(2)}`)
    console.log(`Total: ${currency} ${invoice.totalAmount.toFixed(2)}`)

  } catch (error) {
    console.error('❌ Error creating invoice:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
createSimpleInvoice()