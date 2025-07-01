const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Import the services
const { InvoiceService } = require('./dist/lib/services/invoice.service')
const { SalesOrderService } = require('./dist/lib/services/sales-order.service')

async function testServiceFlow() {
  const quotationId = 'cmcjmlggo0009v23gwer2a1g1'
  
  console.log('=== Testing Service Flow Directly ===\n')
  
  try {
    // 1. First test sales order creation
    console.log('1. Testing sales order creation from quotation:')
    const salesOrderService = new SalesOrderService()
    
    try {
      const salesOrder = await salesOrderService.createFromQuotation(quotationId, {
        customerPO: 'TEST-PO-001',
        createdBy: 'system'
      })
      
      console.log('   ✅ Sales order created successfully:')
      console.log(`   Order Number: ${salesOrder.orderNumber}`)
      console.log(`   ID: ${salesOrder.id}`)
      console.log(`   Total: ${salesOrder.totalAmount}`)
    } catch (soError) {
      console.error('   ❌ Sales order creation failed:', soError.message)
      console.error('   Stack:', soError.stack)
      
      // Check if it's because sales order already exists
      const existingSO = await prisma.salesOrder.findFirst({
        where: { quotationId: quotationId },
        orderBy: { createdAt: 'desc' }
      })
      
      if (existingSO) {
        console.log(`   Note: Sales order already exists: ${existingSO.orderNumber}`)
      }
    }
    
    // 2. Now test invoice creation
    console.log('\n2. Testing invoice creation from quotation:')
    const invoiceService = new InvoiceService()
    
    try {
      const invoice = await invoiceService.createInvoiceFromQuotation(quotationId, {
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: 'Test from service flow',
        createdBy: 'system'
      })
      
      console.log('   ✅ Invoice created successfully:')
      console.log(`   Invoice Number: ${invoice.invoiceNumber}`)
      console.log(`   ID: ${invoice.id}`)
      console.log(`   Sales Order ID: ${invoice.salesOrderId || 'NULL'}`)
      console.log(`   Total: ${invoice.totalAmount}`)
      
      if (invoice.salesOrderId) {
        // Get the sales order details
        const salesOrder = await prisma.salesOrder.findUnique({
          where: { id: invoice.salesOrderId }
        })
        console.log(`   Sales Order Number: ${salesOrder?.orderNumber || 'Not found'}`)
      }
    } catch (invError) {
      console.error('   ❌ Invoice creation failed:', invError.message)
      console.error('   Stack:', invError.stack)
    }
    
    // 3. Check quotation status
    console.log('\n3. Checking quotation status:')
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      select: {
        quotationNumber: true,
        status: true,
        salesCaseId: true
      }
    })
    console.log(`   Quotation: ${quotation.quotationNumber}`)
    console.log(`   Status: ${quotation.status}`)
    console.log(`   Sales Case ID: ${quotation.salesCaseId}`)
    
  } catch (error) {
    console.error('\nUnexpected error:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testServiceFlow()