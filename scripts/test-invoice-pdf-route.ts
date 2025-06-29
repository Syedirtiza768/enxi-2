import { apiClient } from '@/lib/api/client'

async function testInvoicePdfRoute() {
  try {
    console.log('Testing Invoice PDF Route...')
    
    // First, get list of invoices to find a valid ID
    const invoicesResponse = await apiClient('/invoices')
    const invoices = await invoicesResponse.json()
    
    if (!invoices.success || !invoices.data || invoices.data.length === 0) {
      console.error('No invoices found in the system')
      return
    }
    
    const invoiceId = invoices.data[0].id
    console.log(`Testing with invoice ID: ${invoiceId}`)
    
    // Test the PDF route
    const pdfResponse = await apiClient(`/invoices/${invoiceId}/pdf`)
    
    console.log('PDF Response Status:', pdfResponse.status)
    console.log('PDF Response Headers:', Object.fromEntries(pdfResponse.headers.entries()))
    
    if (pdfResponse.status === 200) {
      console.log('✅ Invoice PDF route is working!')
      console.log('Content-Type:', pdfResponse.headers.get('content-type'))
      console.log('Content-Disposition:', pdfResponse.headers.get('content-disposition'))
    } else {
      console.error('❌ Invoice PDF route failed')
      const errorText = await pdfResponse.text()
      console.error('Error:', errorText)
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Run the test
testInvoicePdfRoute()