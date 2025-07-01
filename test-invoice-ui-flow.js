const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testInvoiceUIFlow() {
  const quotationId = 'cmcjmlggo0009v23gwer2a1g1'
  
  console.log('=== Testing Invoice UI Flow ===\n')
  
  try {
    // 1. First simulate what the UI does - fetch quotation with lines structure
    console.log('1. Fetching quotation (UI simulation):')
    const response = await fetch(`http://localhost:3000/api/quotations/${quotationId}?view=internal`)
    const result = await response.json()
    
    const quotationData = result.data
    console.log('   Quotation loaded:')
    console.log('   - Has lines:', !!quotationData.lines)
    console.log('   - Has items:', !!quotationData.items)
    console.log('   - Lines count:', quotationData.lines?.length)
    
    if (quotationData.lines) {
      console.log('\n   Lines structure:')
      quotationData.lines.forEach(line => {
        console.log(`   Line ${line.lineNumber}:`)
        console.log(`     Description: ${line.lineDescription}`)
        console.log(`     Items: ${line.items?.length}`)
        if (line.items?.[0]) {
          console.log(`     First item:`, {
            itemCode: line.items[0].itemCode,
            isLineHeader: line.items[0].isLineHeader,
            quantity: line.items[0].quantity,
            unitPrice: line.items[0].unitPrice
          })
        }
      })
    }
    
    // 2. Simulate converting lines to invoice format
    console.log('\n2. Converting to invoice format:')
    
    // Extract items from lines (simulating UI logic)
    let items = []
    if (quotationData.lines) {
      quotationData.lines.forEach(line => {
        if (line.items) {
          line.items.forEach(item => {
            items.push(item)
          })
        }
      })
    }
    
    console.log(`   Extracted ${items.length} items`)
    
    // Calculate due date
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)
    
    const invoiceData = {
      customerId: quotationData.salesCase?.customerId || '',
      type: 'SALES',
      status: 'DRAFT',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: dueDate.toISOString(),
      paymentTerms: quotationData.paymentTerms || 'Net 30',
      billingAddress: quotationData.salesCase?.customer?.address || '',
      notes: `Invoice created from quotation ${quotationData.quotationNumber}`,
      items: items,
      createdBy: 'system'
    }
    
    console.log('\n3. Invoice data to submit:')
    console.log('   Customer ID:', invoiceData.customerId)
    console.log('   Due Date:', invoiceData.dueDate)
    console.log('   Items:', invoiceData.items.length)
    console.log('\n   Items detail:')
    invoiceData.items.forEach((item, i) => {
      console.log(`   Item ${i + 1}:`, {
        lineNumber: item.lineNumber,
        isLineHeader: item.isLineHeader,
        itemCode: item.itemCode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sortOrder: item.sortOrder
      })
    })
    
    // 3. Test with test endpoint first
    console.log('\n4. Testing with test endpoint:')
    const testResponse = await fetch('http://localhost:3000/api/invoices/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData)
    })
    
    const testResult = await testResponse.json()
    console.log(`   Test response: ${testResponse.status}`)
    if (!testResponse.ok) {
      console.log('   Test error:', testResult)
    } else {
      console.log('   Test passed')
    }
    
    // 4. Try the real endpoint
    console.log('\n5. Calling real invoice endpoint:')
    const invoiceResponse = await fetch('http://localhost:3000/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData)
    })
    
    const invoiceResult = await invoiceResponse.json()
    if (invoiceResponse.ok) {
      console.log('   ✅ Success! Invoice created:')
      console.log(`      Invoice ID: ${invoiceResult.data.id}`)
      console.log(`      Invoice Number: ${invoiceResult.data.invoiceNumber}`)
    } else {
      console.log('   ❌ Error:', invoiceResponse.status)
      console.log('   Response:', invoiceResult)
      if (invoiceResult.details) {
        console.log('   Validation details:', invoiceResult.details)
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testInvoiceUIFlow()