const fetch = require('node-fetch')

async function testAPIFlow() {
  const quotationId = 'cmcjmlggo0009v23gwer2a1g1'
  
  console.log('=== Testing API Flow with Console Monitoring ===\n')
  console.log('⚠️  Watch the server console output for logging statements...\n')
  
  try {
    // 1. Test the invoice creation endpoint
    console.log('1. Calling POST /api/quotations/:id/create-invoice')
    console.log('   This should trigger:')
    console.log('   - "Creating sales order from quotation: [id]"')
    console.log('   - "Sales order created: [orderNumber]"')
    console.log('   - "Invoice created from sales order: [invoiceNumber]"\n')
    
    const invoiceData = {
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      paymentTerms: 'Net 30',
      notes: 'Test invoice - check server console',
      internalNotes: 'Watch for console.log output'
    }
    
    const response = await fetch(`http://localhost:3000/api/quotations/${quotationId}/create-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData)
    })
    
    const result = await response.json()
    
    console.log('2. API Response:')
    console.log(`   Status: ${response.status}`)
    console.log(`   Success: ${result.success}`)
    
    if (result.data) {
      console.log(`   Invoice Number: ${result.data.invoiceNumber}`)
      console.log(`   Sales Order ID: ${result.data.salesOrderId || 'NULL (Check server logs!)'}`)
    }
    
    console.log('\n3. Check server console for:')
    console.log('   - Any error messages')
    console.log('   - Console.log statements from createInvoiceFromQuotation')
    console.log('   - Console.log statements from createFromQuotation')
    
  } catch (error) {
    console.error('\nError:', error.message)
  }
}

testAPIFlow()