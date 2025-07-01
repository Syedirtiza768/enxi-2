const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testInvoiceCreationDebug() {
  const quotationId = 'cmcjmlggo0009v23gwer2a1g1'
  
  console.log('=== Testing Invoice Creation from Quotation (Debug Mode) ===\n')
  
  try {
    // 1. Check quotation details
    console.log('1. Checking quotation details:')
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        salesCase: {
          include: {
            customer: true
          }
        },
        items: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })
    
    if (!quotation) {
      console.error('Quotation not found!')
      return
    }
    
    console.log(`   Quotation Number: ${quotation.quotationNumber}`)
    console.log(`   Status: ${quotation.status}`)
    console.log(`   Sales Case ID: ${quotation.salesCaseId}`)
    console.log(`   Customer: ${quotation.salesCase.customer.name}`)
    console.log(`   Total Amount: ${quotation.totalAmount}`)
    console.log(`   Item Count: ${quotation.items.length}`)
    
    // 2. Ensure quotation is accepted
    if (quotation.status !== 'ACCEPTED') {
      console.log('\n   ⚠️  Setting quotation to ACCEPTED...')
      await prisma.quotation.update({
        where: { id: quotationId },
        data: { status: 'ACCEPTED' }
      })
    }
    
    // 3. Check for existing sales orders from this quotation
    console.log('\n2. Checking for existing sales orders from this quotation:')
    const existingSalesOrders = await prisma.salesOrder.findMany({
      where: { quotationId: quotationId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        createdAt: true
      }
    })
    
    if (existingSalesOrders.length > 0) {
      console.log(`   Found ${existingSalesOrders.length} existing sales orders:`)
      existingSalesOrders.forEach(so => {
        console.log(`   - ${so.orderNumber} (${so.status}) created at ${so.createdAt}`)
      })
    } else {
      console.log('   No existing sales orders found')
    }
    
    // 4. Test API endpoint directly
    console.log('\n3. Testing API endpoint:')
    const invoiceData = {
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      paymentTerms: 'Net 30',
      notes: 'Test invoice from debug script',
      internalNotes: 'Optional internal note'
    }
    
    console.log('   Request data:', JSON.stringify(invoiceData, null, 2))
    
    const response = await fetch(`http://localhost:3000/api/quotations/${quotationId}/create-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData)
    })
    
    const responseText = await response.text()
    let result
    try {
      result = JSON.parse(responseText)
    } catch (e) {
      console.error('   Failed to parse response:', responseText)
      return
    }
    
    console.log('\n   Response status:', response.status)
    console.log('   Response:', JSON.stringify(result, null, 2))
    
    if (response.ok && result.data) {
      // 5. Check if sales order was created
      console.log('\n4. Checking sales order creation:')
      const invoice = await prisma.invoice.findUnique({
        where: { id: result.data.id },
        include: {
          salesOrder: true
        }
      })
      
      if (invoice.salesOrderId) {
        console.log(`   ✅ Sales order created: ${invoice.salesOrder.orderNumber}`)
        console.log(`   Sales Order ID: ${invoice.salesOrderId}`)
      } else {
        console.log('   ❌ No sales order ID on invoice')
        
        // Check if sales order exists separately
        const salesOrderCheck = await prisma.salesOrder.findFirst({
          where: {
            quotationId: quotationId,
            createdAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
            }
          }
        })
        
        if (salesOrderCheck) {
          console.log(`   🤔 Sales order exists but not linked: ${salesOrderCheck.orderNumber}`)
        }
      }
      
      // 6. Check invoice details
      console.log('\n5. Invoice details:')
      console.log(`   Invoice Number: ${invoice.invoiceNumber}`)
      console.log(`   Customer ID: ${invoice.customerId}`)
      console.log(`   Total Amount: ${invoice.totalAmount}`)
      console.log(`   Sales Order ID: ${invoice.salesOrderId || 'NULL'}`)
    }
    
    // 7. Check recent errors in system logs
    console.log('\n6. Checking for recent errors:')
    const recentErrors = await prisma.auditLog.findMany({
      where: {
        action: 'ERROR',
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
    
    if (recentErrors.length > 0) {
      console.log(`   Found ${recentErrors.length} recent errors`)
      recentErrors.forEach(error => {
        console.log(`   - ${error.createdAt}: ${JSON.stringify(error.metadata)}`)
      })
    } else {
      console.log('   No recent errors in audit log')
    }
    
  } catch (error) {
    console.error('\nError during test:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testInvoiceCreationDebug()