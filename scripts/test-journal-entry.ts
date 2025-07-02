import { prisma } from '../lib/db/prisma'

async function testJournalEntry() {
  const journalEntryId = 'cmc1j8z8l000av22aljq7ztuc'
  
  try {
    // Find the journal entry
    const entry = await prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: {
        lines: {
          include: {
            account: true
          }
        }
      }
    })

    if (!entry) {
      console.error('Journal entry not found')
      return
    }

    console.log('Journal Entry Details:')
    console.log('ID:', entry.id)
    console.log('Entry Number:', entry.entryNumber)
    console.log('Status:', entry.status)
    console.log('Description:', entry.description)
    console.log('Date:', entry.date)
    console.log('Currency:', entry.currency)
    console.log('Exchange Rate:', entry.exchangeRate)
    console.log('\nJournal Lines:')
    
    entry.lines.forEach((line, index) => {
      console.log(`\nLine ${index + 1}:`)
      console.log('  Account:', line.account.code, '-', line.account.name)
      console.log('  Account ID:', line.accountId)
      console.log('  Account Type:', line.account.type)
      console.log('  Account Balance:', line.account.balance)
      console.log('  Debit:', line.debitAmount)
      console.log('  Credit:', line.creditAmount)
      console.log('  Base Debit:', line.baseDebitAmount)
      console.log('  Base Credit:', line.baseCreditAmount)
    })

    // Calculate totals
    const totalDebit = entry.lines.reduce((sum, line) => sum + line.debitAmount, 0)
    const totalCredit = entry.lines.reduce((sum, line) => sum + line.creditAmount, 0)
    
    console.log('\nTotals:')
    console.log('Total Debit:', totalDebit)
    console.log('Total Credit:', totalCredit)
    console.log('Difference:', Math.abs(totalDebit - totalCredit))
    console.log('Is Balanced:', Math.abs(totalDebit - totalCredit) < 0.01)

    // Check if all accounts exist
    console.log('\nAccount Validation:')
    for (const line of entry.lines) {
      const account = await prisma.account.findUnique({
        where: { id: line.accountId }
      })
      if (!account) {
        console.error(`Account ${line.accountId} not found!`)
      } else {
        console.log(`✓ Account ${account.code} exists`)
      }
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testJournalEntry()