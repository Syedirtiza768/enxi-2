import { prisma } from '@/lib/db/prisma'
import { InvoiceService } from '@/lib/services/invoice.service'

async function testPaymentPage() {
  try {
    const invoiceId = 'cmccnpcim0003v2pjzat5hp99'
    
    // Get invoice directly
    const invoiceService = new InvoiceService()
    const invoice = await invoiceService.getInvoice(invoiceId)
    
    if (!invoice) {
      console.log('Invoice not found')
      return
    }
    
    console.log('Invoice data for payment page:')
    console.log({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      balanceAmount: invoice.balanceAmount,
      customer: {
        id: invoice.customer.id,
        name: invoice.customer.name
      }
    })
    
    console.log('\nThis is the data that would be displayed on the payment page.')
    console.log('Payment form would show:')
    console.log('- Default amount:', invoice.balanceAmount)
    console.log('- Payment date:', new Date().toISOString().split('T')[0])
    console.log('- Payment method: BANK_TRANSFER (default)')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPaymentPage()