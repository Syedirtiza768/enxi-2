import { JournalEntryService } from '../lib/services/accounting/journal-entry.service'
import { prisma } from '../lib/db/prisma'

async function createTestJournalEntry() {
  try {
    console.log('Creating test journal entry...')
    
    // Get admin user
    const admin = await prisma.user.findFirst({
      where: { username: 'admin' }
    })
    
    if (!admin) {
      throw new Error('Admin user not found')
    }
    
    // Get some accounts
    const cashAccount = await prisma.account.findFirst({
      where: { code: '1010' } // Petty Cash
    })
    
    const expenseAccount = await prisma.account.findFirst({
      where: { code: '5400' } // Office Supplies
    })
    
    if (!cashAccount || !expenseAccount) {
      throw new Error('Required accounts not found')
    }
    
    const journalEntryService = new JournalEntryService()
    
    const journalEntry = await journalEntryService.createJournalEntry({
      date: new Date(),
      description: 'Test journal entry for posting',
      reference: 'TEST-001',
      currency: 'USD',
      lines: [
        {
          accountId: expenseAccount.id,
          description: 'Office supplies expense',
          debitAmount: 500,
          creditAmount: 0
        },
        {
          accountId: cashAccount.id,
          description: 'Cash payment',
          debitAmount: 0,
          creditAmount: 500
        }
      ],
      createdBy: admin.id
    })
    
    console.log('\nJournal entry created successfully!')
    console.log('ID:', journalEntry.id)
    console.log('Entry Number:', journalEntry.entryNumber)
    console.log('Status:', journalEntry.status)
    console.log('\nYou can now test posting this entry at:')
    console.log(`http://localhost:3000/accounting/journal-entries/${journalEntry.id}`)
    
  } catch (error) {
    console.error('Error creating journal entry:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestJournalEntry()