async function testPaymentAPI() {
  try {
    const invoiceId = 'cmccnpcim0003v2pjzat5hp99'
    const paymentData = {
      amount: 100,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'BANK_TRANSFER',
      reference: 'TEST-API-001',
      notes: 'Test payment via API'
    }
    
    console.log('Testing payment API endpoint...')
    console.log(`URL: http://localhost:3000/api/invoices/${invoiceId}/payments`)
    console.log('Payload:', paymentData)
    
    const response = await fetch(`http://localhost:3000/api/invoices/${invoiceId}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    })
    
    console.log('\nResponse status:', response.status)
    console.log('Response content-type:', response.headers.get('content-type'))
    
    const text = await response.text()
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      try {
        const data = JSON.parse(text)
        console.log('Response data:', data)
      } catch (e) {
        console.log('Failed to parse JSON:', e)
        console.log('Raw response:', text.substring(0, 200))
      }
    } else {
      console.log('Non-JSON response (first 200 chars):', text.substring(0, 200))
    }
    
  } catch (error) {
    console.error('Failed to test API:', error)
  }
}

testPaymentAPI()