import { prisma } from '@/lib/db/prisma'
import { InvoiceService } from '@/lib/services/invoice.service'

async function testInvoiceJournalEntries() {
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
    
    // Use the service directly
    const invoiceService = new InvoiceService()
    const sentInvoice = await invoiceService.sendInvoice(draftInvoice.id, 'system')
    
    console.log('\nInvoice sent successfully:', {
      id: sentInvoice.id,
      status: sentInvoice.status,
      sentAt: sentInvoice.sentAt
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
    journalEntries.forEach((je, index) => {
      console.log(`\nJournal Entry #${index + 1}:`, {
        id: je.id,
        date: je.date.toISOString().split('T')[0],
        description: je.description,
        status: je.status
      })
      console.log('Lines:')
      je.lines.forEach(line => {
        const amount = line.debit || line.credit || 0
        const type = line.debit ? 'DR' : 'CR'
        console.log(`  - [${line.account.code}] ${line.account.name}: ${type} ${amount.toFixed(2)}`)
      })
      
      // Calculate totals
      const totalDebit = je.lines.reduce((sum, line) => sum + (line.debit || 0), 0)
      const totalCredit = je.lines.reduce((sum, line) => sum + (line.credit || 0), 0)
      console.log(`\nTotals: DR ${totalDebit.toFixed(2)} = CR ${totalCredit.toFixed(2)} (Balanced: ${totalDebit === totalCredit ? 'Yes' : 'No'})`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testInvoiceJournalEntries()