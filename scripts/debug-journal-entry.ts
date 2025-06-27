import { prisma } from '@/lib/db/prisma'

async function debugJournalEntry() {
  try {
    const journalEntry = await prisma.journalEntry.findFirst({
      where: { description: { contains: 'INV2025000001' } },
      include: { 
        lines: {
          include: { account: true }
        }
      }
    })
    
    if (!journalEntry) {
      console.log('No journal entry found for INV2025000001')
      return
    }
    
    console.log('Journal Entry Details:')
    console.log('ID:', journalEntry.id)
    console.log('Description:', journalEntry.description)
    console.log('Status:', journalEntry.status)
    console.log('Date:', journalEntry.date)
    console.log('Currency:', journalEntry.currency)
    console.log('Exchange Rate:', journalEntry.exchangeRate)
    
    console.log('\nJournal Lines:')
    journalEntry.lines.forEach((line, index) => {
      console.log(`\nLine ${index + 1}:`)
      console.log('  Account:', `[${line.account.code}] ${line.account.name}`)
      console.log('  Description:', line.description)
      console.log('  Debit Amount:', line.debitAmount)
      console.log('  Credit Amount:', line.creditAmount)
      console.log('  Base Debit:', line.baseDebitAmount)
      console.log('  Base Credit:', line.baseCreditAmount)
    })
    
    // Check raw database values
    const rawLines = await prisma.journalLine.findMany({
      where: { journalEntryId: journalEntry.id }
    })
    
    console.log('\nRaw database values:')
    rawLines.forEach((line, index) => {
      console.log(`\nRaw Line ${index + 1}:`)
      console.log('  debitAmount:', line.debitAmount)
      console.log('  creditAmount:', line.creditAmount)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugJournalEntry()