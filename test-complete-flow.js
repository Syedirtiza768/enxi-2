const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testCompleteFlow() {
  const quotationId = 'cmcjmlggo0009v23gwer2a1g1'
  
  console.log('=== Testing Complete Quotation → Sales Order → Invoice Flow ===\n')
  
  try {
    // 1. Check initial state
    console.log('1. Initial State Check:')
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      select: {
        quotationNumber: true,
        status: true,
        totalAmount: true,
        salesCase: {
          select: {
            customer: {
              select: { name: true }
            }
          }
        }
      }
    })
    
    console.log(`   Quotation: ${quotation.quotationNumber}`)
    console.log(`   Customer: ${quotation.salesCase.customer.name}`)
    console.log(`   Total: ${quotation.totalAmount}`)
    console.log(`   Status: ${quotation.status}`)
    
    // 2. Call the API to create invoice
    console.log('\n2. Creating invoice from quotation via API...')
    
    const invoiceData = {
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      paymentTerms: 'Net 30',
      notes: 'Invoice created from quotation - complete flow test',
      internalNotes: 'Testing complete flow with sales order creation'
    }
    
    const response = await fetch(`http://localhost:3000/api/quotations/${quotationId}/create-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData)
    })
    
    const result = await response.json()
    
    if (response.ok && result.data) {
      console.log('   ✅ Invoice created successfully!')
      console.log(`   Invoice Number: ${result.data.invoiceNumber}`)
      console.log(`   Invoice ID: ${result.data.id}`)
      console.log(`   Sales Order ID: ${result.data.salesOrderId || 'NULL'}`)
      
      // 3. Verify sales order was created
      console.log('\n3. Verifying sales order creation:')
      
      if (result.data.salesOrderId) {
        const salesOrder = await prisma.salesOrder.findUnique({
          where: { id: result.data.salesOrderId },
          select: {
            orderNumber: true,
            status: true,
            totalAmount: true,
            quotationId: true,
            approvedAt: true,
            approvedBy: true
          }
        })
        
        if (salesOrder) {
          console.log('   ✅ Sales order found!')
          console.log(`   Order Number: ${salesOrder.orderNumber}`)
          console.log(`   Status: ${salesOrder.status}`)
          console.log(`   Total: ${salesOrder.totalAmount}`)
          console.log(`   From Quotation: ${salesOrder.quotationId === quotationId ? 'Yes' : 'No'}`)
          console.log(`   Approved: ${salesOrder.approvedAt ? 'Yes' : 'No'}`)
        } else {
          console.log('   ❌ Sales order not found despite having ID')
        }
      } else {
        console.log('   ❌ No sales order ID on invoice')
        
        // Check if any sales order was created
        const recentSalesOrder = await prisma.salesOrder.findFirst({
          where: {
            quotationId: quotationId,
            createdAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
            }
          },
          orderBy: { createdAt: 'desc' }
        })
        
        if (recentSalesOrder) {
          console.log('   🤔 Found recent sales order not linked to invoice:')
          console.log(`   Order Number: ${recentSalesOrder.orderNumber}`)
          console.log(`   Status: ${recentSalesOrder.status}`)
        }
      }
      
      // 4. Check invoice items
      console.log('\n4. Checking invoice items:')
      const invoice = await prisma.invoice.findUnique({
        where: { id: result.data.id },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      })
      
      console.log(`   Total items: ${invoice.items.length}`)
      invoice.items.forEach((item, index) => {
        console.log(`   Item ${index + 1}: ${item.itemCode} - ${item.description}`)
        console.log(`     Line: ${item.lineNumber}, Qty: ${item.quantity}, Price: ${item.unitPrice}`)
        if (item.lineDescription) {
          console.log(`     Line Description: ${item.lineDescription}`)
        }
      })
      
    } else {
      console.log('   ❌ Invoice creation failed!')
      console.log(`   Status: ${response.status}`)
      console.log(`   Error: ${JSON.stringify(result, null, 2)}`)
    }
    
  } catch (error) {
    console.error('\nError:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testCompleteFlow()