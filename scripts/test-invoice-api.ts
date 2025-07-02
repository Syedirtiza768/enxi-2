async function testInvoiceAPI() {
  try {
    const invoiceId = 'cmccnpcim0003v2pjzat5hp99'
    
    console.log('Testing invoice API endpoint...')
    console.log(`URL: http://localhost:3000/api/invoices/${invoiceId}`)
    
    const response = await fetch(`http://localhost:3000/api/invoices/${invoiceId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error response:', errorText)
      return
    }
    
    const data = await response.json()
    console.log('Invoice data:', {
      id: data.id,
      number: data.invoiceNumber,
      customer: data.customer?.name,
      total: data.totalAmount,
      balance: data.balanceAmount
    })
    
  } catch (error) {
    console.error('Failed to test API:', error)
  }
}

testInvoiceAPI()