import { prisma } from '@/lib/db/prisma'

async function testPaymentSubmission() {
  try {
    const invoiceId = 'cmccnpcim0003v2pjzat5hp99'
    
    // Check invoice before payment
    const invoiceBefore = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        invoiceNumber: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        status: true
      }
    })
    
    console.log('Invoice before payment:')
    console.log('- Number:', invoiceBefore?.invoiceNumber)
    console.log('- Total:', invoiceBefore?.totalAmount)
    console.log('- Paid:', invoiceBefore?.paidAmount)
    console.log('- Balance:', invoiceBefore?.balanceAmount)
    console.log('- Status:', invoiceBefore?.status)
    
    // Test the payment API endpoint
    const paymentData = {
      amount: 1000,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'BANK_TRANSFER',
      reference: 'TEST-REF-001',
      notes: 'Test payment via script'
    }
    
    console.log('\nSubmitting payment:', paymentData)
    
    const response = await fetch(`http://localhost:3000/api/invoices/${invoiceId}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Payment failed:', response.status, error)
      return
    }
    
    const payment = await response.json()
    console.log('\nPayment created successfully:', payment)
    
    // Check invoice after payment
    const invoiceAfter = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        paidAmount: true,
        balanceAmount: true,
        status: true
      }
    })
    
    console.log('\nInvoice after payment:')
    console.log('- Paid:', invoiceAfter?.paidAmount)
    console.log('- Balance:', invoiceAfter?.balanceAmount)
    console.log('- Status:', invoiceAfter?.status)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPaymentSubmission()