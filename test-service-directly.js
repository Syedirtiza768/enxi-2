const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { InvoiceService } = require('./lib/services/invoice.service')

async function testServiceDirectly() {
  const quotationId = 'cmcjmlggo0009v23gwer2a1g1'
  
  console.log('=== Testing Invoice Service Directly ===\n')
  
  try {
    // 1. Make sure quotation is accepted
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: 'ACCEPTED' }
    })
    
    console.log('1. Creating invoice from quotation using service...')
    const invoiceService = new InvoiceService()
    
    const result = await invoiceService.createInvoiceFromQuotation(quotationId, {
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: 'Test invoice from service',
      createdBy: 'system'
    })
    
    console.log('\n2. Result:')
    console.log(`   Invoice ID: ${result.id}`)
    console.log(`   Invoice Number: ${result.invoiceNumber}`)
    console.log(`   Sales Order ID: ${result.salesOrderId || 'None'}`)
    console.log(`   Customer: ${result.customer.name}`)
    console.log(`   Items: ${result.items.length}`)
    
    // Check if sales order was created
    if (result.salesOrderId) {
      const salesOrder = await prisma.salesOrder.findUnique({
        where: { id: result.salesOrderId },
        include: {
          items: true
        }
      })
      
      console.log('\n3. Sales Order Details:')
      console.log(`   Order Number: ${salesOrder.orderNumber}`)
      console.log(`   Status: ${salesOrder.status}`)
      console.log(`   Items: ${salesOrder.items.length}`)
      console.log(`   Total: ${salesOrder.totalAmount}`)
    }
    
  } catch (error) {
    console.error('\nError:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testServiceDirectly()