const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testQuotationToInvoiceFlow() {
  const quotationId = 'cmcjmlggo0009v23gwer2a1g1'
  
  console.log('=== Testing Quotation → Sales Order → Invoice Flow ===\n')
  
  try {
    // 1. Check initial quotation state
    console.log('1. Checking quotation status:')
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
    console.log(`   Status: ${quotation.status}`)
    console.log(`   Customer: ${quotation.salesCase.customer.name}`)
    console.log(`   Total: ${quotation.totalAmount}`)
    
    if (quotation.status !== 'ACCEPTED') {
      console.log('\n   ⚠️  Quotation is not ACCEPTED. Setting to ACCEPTED...')
      await prisma.quotation.update({
        where: { id: quotationId },
        data: { status: 'ACCEPTED' }
      })
    }
    
    // 2. Test the API endpoint
    console.log('\n2. Testing invoice creation from quotation:')
    
    const invoiceData = {
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      paymentTerms: 'Net 30',
      notes: 'Invoice created from quotation via API test',
      internalNotes: 'Test internal note - optional field'
    }
    
    console.log('   Sending request to create invoice...')
    const response = await fetch(`http://localhost:3000/api/quotations/${quotationId}/create-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData)
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('\n   ✅ Success! Invoice created')
      console.log(`   Invoice ID: ${result.data.id}`)
      console.log(`   Invoice Number: ${result.data.invoiceNumber}`)
      
      // Check if sales order was created
      if (result.data.salesOrderId) {
        const salesOrder = await prisma.salesOrder.findUnique({
          where: { id: result.data.salesOrderId },
          select: { orderNumber: true }
        })
        console.log(`\n   Sales Order created: ${salesOrder?.orderNumber}`)
      }
      
      // Verify invoice details
      const invoice = await prisma.invoice.findUnique({
        where: { id: result.data.id },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' }
          },
          salesOrder: true
        }
      })
      
      console.log('\n3. Invoice Details:')
      console.log(`   Sales Order: ${invoice.salesOrder?.orderNumber || 'None'}`)
      console.log(`   Items: ${invoice.items.length}`)
      console.log(`   Total: ${invoice.totalAmount}`)
      
      console.log('\n4. Invoice Items:')
      invoice.items.forEach((item, i) => {
        console.log(`\n   Item ${i + 1}:`)
        console.log(`     Line: ${item.lineNumber}`)
        console.log(`     Line Description: ${item.lineDescription || 'NULL'}`)
        console.log(`     Item Code: ${item.itemCode}`)
        console.log(`     Description: ${item.description}`)
        console.log(`     Quantity: ${item.quantity}`)
        console.log(`     Unit Price: ${item.unitPrice}`)
        console.log(`     Is Header: ${item.isLineHeader}`)
      })
      
    } else {
      console.log('\n   ❌ Error:', response.status)
      console.log('   Response:', result)
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testQuotationToInvoiceFlow()