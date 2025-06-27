import { prisma } from '@/lib/db/prisma'
import { InvoiceService } from '@/lib/services/invoice.service'

async function testPaymentService() {
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
    
    // Use the service directly
    const invoiceService = new InvoiceService()
    
    const paymentData = {
      amount: 1000,
      paymentDate: new Date(),
      paymentMethod: 'BANK_TRANSFER' as const,
      reference: 'TEST-REF-001',
      notes: 'Test payment via script',
      createdBy: 'system'
    }
    
    console.log('\nRecording payment of $1000...')
    
    const payment = await invoiceService.recordPayment(invoiceId, paymentData)
    
    console.log('\nPayment created successfully:')
    console.log('- Payment Number:', payment.paymentNumber)
    console.log('- Amount:', payment.amount)
    console.log('- Method:', payment.paymentMethod)
    console.log('- Reference:', payment.reference)
    
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
    
    // Check journal entries
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        description: { contains: payment.paymentNumber }
      },
      include: {
        lines: {
          include: { account: true }
        }
      }
    })
    
    console.log('\nJournal entries created:', journalEntries.length)
    journalEntries.forEach((je, index) => {
      console.log(`\nJournal Entry #${index + 1}:`)
      console.log('- Description:', je.description)
      console.log('- Status:', je.status)
      je.lines.forEach(line => {
        const amount = line.debit || line.credit || 0
        const type = line.debit ? 'DR' : 'CR'
        console.log(`  - [${line.account.code}] ${line.account.name}: ${type} ${amount.toFixed(2)}`)
      })
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPaymentService()