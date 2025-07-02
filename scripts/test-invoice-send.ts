import { prisma } from '@/lib/db/prisma'

async function testInvoiceSend() {
  try {
    // Find a draft invoice
    const draftInvoice = await prisma.invoice.findFirst({
      where: { status: 'DRAFT' },
      include: { 
        customer: true,
        items: { include: { item: true } }
      }
    })
    
    if (!draftInvoice) {
      console.log('No draft invoices found')
      return
    }
    
    console.log('Found draft invoice:', {
      id: draftInvoice.id,
      number: draftInvoice.invoiceNumber,
      customer: draftInvoice.customer.name,
      total: draftInvoice.totalAmount,
      items: draftInvoice.items.length
    })
    
    // Send the invoice
    const response = await fetch('http://localhost:3000/api/invoices/' + draftInvoice.id + '/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Failed to send invoice:', error)
      return
    }
    
    const result = await response.json()
    console.log('\nInvoice sent successfully:', {
      id: result.id,
      status: result.status,
      sentAt: result.sentAt
    })
    
    // Check journal entries
    const journalEntries = await prisma.journalEntry.findMany({
      where: { 
        description: { contains: draftInvoice.invoiceNumber }
      },
      include: { 
        lines: { 
          include: { account: true } 
        } 
      }
    })
    
    console.log('\nJournal entries created:', journalEntries.length)
    journalEntries.forEach(je => {
      console.log('\nJournal Entry:', {
        id: je.id,
        date: je.date,
        description: je.description,
        status: je.status
      })
      console.log('Lines:')
      je.lines.forEach(line => {
        console.log(`  - ${line.account.code} ${line.account.name}: ${line.debit ? 'DR' : 'CR'} ${line.debit || line.credit}`)
      })
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testInvoiceSend()