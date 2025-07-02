import { JournalEntryService } from '../lib/services/accounting/journal-entry.service'
import { prisma } from '../lib/db/prisma'

async function testPostJournalEntry() {
  const journalEntryId = 'cmc1j8z8l000av22aljq7ztuc'
  const userId = 'clm0jgz8z0000v22as8mf3rni' // Use a valid user ID
  
  try {
    console.log('Starting journal entry post test...')
    
    // First, get a valid user
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, username: true, email: true }
    })
    
    console.log('Available users:')
    users.forEach(user => {
      console.log(`- ${user.username} (${user.id})`)
    })
    
    const testUserId = users[0]?.id || userId
    console.log(`\nUsing user ID: ${testUserId}`)
    
    const journalEntryService = new JournalEntryService()
    
    console.log('\nAttempting to post journal entry...')
    const result = await journalEntryService.postJournalEntry(journalEntryId, testUserId)
    
    console.log('\nSuccess! Journal entry posted:')
    console.log('Entry Number:', result.entryNumber)
    console.log('Status:', result.status)
    console.log('Posted By:', result.postedBy)
    console.log('Posted At:', result.postedAt)
    
  } catch (error) {
    console.error('\nError posting journal entry:')
    console.error('Error Type:', error?.constructor?.name)
    console.error('Error Message:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
  } finally {
    await prisma.$disconnect()
  }
}

testPostJournalEntry()