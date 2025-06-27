import { prisma } from '@/lib/db/prisma'

async function checkInvoice() {
  try {
    const invoiceId = 'cmccnpcim0003v2pjzat5hp99'
    
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        payments: true
      }
    })
    
    if (invoice) {
      console.log('Invoice found:')
      console.log('- ID:', invoice.id)
      console.log('- Number:', invoice.invoiceNumber)
      console.log('- Customer:', invoice.customer.name)
      console.log('- Status:', invoice.status)
      console.log('- Total:', invoice.totalAmount)
      console.log('- Paid:', invoice.paidAmount)
      console.log('- Balance:', invoice.balanceAmount)
      console.log('- Payments:', invoice.payments.length)
      
      if (invoice.payments.length > 0) {
        console.log('\nPayment history:')
        invoice.payments.forEach(payment => {
          console.log(`  - ${payment.paymentNumber}: $${payment.amount} on ${payment.paymentDate}`)
        })
      }
    } else {
      console.log('Invoice not found with ID:', invoiceId)
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkInvoice()