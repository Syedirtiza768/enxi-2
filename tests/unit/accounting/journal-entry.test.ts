import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { JournalEntryService } from '@/lib/services/accounting/journal-entry.service'
import { ChartOfAccountsService } from '@/lib/services/accounting/chart-of-accounts.service'
import { AccountType, JournalStatus } from '@/lib/generated/prisma'
import { prisma } from '@/lib/db/prisma'

describe('Journal Entry Service', () => {
  jest.setTimeout(30000) // 30 second timeout for DB operations
  let service: JournalEntryService
  let coaService: ChartOfAccountsService
  let testUserId: string
  let cashAccountId: string
  let revenueAccountId: string
  let expenseAccountId: string

  beforeEach(async () => {
    service = new JournalEntryService()
    coaService = new ChartOfAccountsService()
    
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'USER'
      }
    })
    testUserId = testUser.id

    // Create test accounts
    const cashAccount = await coaService.createAccount({
      code: '1000',
      name: 'Cash',
      type: AccountType.ASSET,
      currency: 'USD',
      createdBy: testUserId
    })
    cashAccountId = cashAccount.id

    const revenueAccount = await coaService.createAccount({
      code: '4000',
      name: 'Sales Revenue',
      type: AccountType.INCOME,
      currency: 'USD',
      createdBy: testUserId
    })
    revenueAccountId = revenueAccount.id

    const expenseAccount = await coaService.createAccount({
      code: '5000',
      name: 'Office Expenses',
      type: AccountType.EXPENSE,
      currency: 'USD',
      createdBy: testUserId
    })
    expenseAccountId = expenseAccount.id
  })

  afterEach(async () => {
    // Clean up test data in correct order - audit logs must be deleted before users
    await prisma.auditLog.deleteMany()
    await prisma.journalLine.deleteMany()
    await prisma.journalEntry.deleteMany()
    await prisma.quotation.deleteMany()
    await prisma.salesCase.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.account.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Journal Entry Creation', () => {
    it('should create a balanced journal entry', async () => {
      const entryData = {
        date: new Date('2024-01-15'),
        description: 'Sales revenue received',
        reference: 'INV-001',
        currency: 'USD',
        exchangeRate: 1.0,
        lines: [
          {
            accountId: cashAccountId,
            description: 'Cash received from customer',
            debitAmount: 1000,
            creditAmount: 0
          },
          {
            accountId: revenueAccountId,
            description: 'Sales revenue',
            debitAmount: 0,
            creditAmount: 1000
          }
        ],
        createdBy: testUserId
      }

      const journalEntry = await service.createJournalEntry(entryData)

      expect(journalEntry).toBeDefined()
      expect(journalEntry.status).toBe(JournalStatus.DRAFT)
      expect(journalEntry.description).toBe('Sales revenue received')
      expect(journalEntry.lines).toHaveLength(2)
      
      // Calculate totals from lines
      const totalDebit = journalEntry.lines.reduce((sum, line) => sum + line.debitAmount, 0)
      const totalCredit = journalEntry.lines.reduce((sum, line) => sum + line.creditAmount, 0)
      expect(totalDebit).toBe(1000)
      expect(totalCredit).toBe(1000)
    })

    it('should reject unbalanced journal entries', async () => {
      const entryData = {
        date: new Date('2024-01-15'),
        description: 'Unbalanced entry',
        currency: 'USD',
        exchangeRate: 1.0,
        lines: [
          {
            accountId: cashAccountId,
            description: 'Cash',
            debitAmount: 1000,
            creditAmount: 0
          },
          {
            accountId: revenueAccountId,
            description: 'Revenue',
            debitAmount: 0,
            creditAmount: 500  // Not balanced!
          }
        ],
        createdBy: testUserId
      }

      await expect(service.createJournalEntry(entryData))
        .rejects.toThrow('Journal entry is not balanced')
    })

    it('should require at least 2 lines', async () => {
      const entryData = {
        date: new Date('2024-01-15'),
        description: 'Invalid entry',
        currency: 'USD',
        exchangeRate: 1.0,
        lines: [
          {
            accountId: cashAccountId,
            description: 'Single line',
            debitAmount: 1000,
            creditAmount: 0
          }
        ],
        createdBy: testUserId
      }

      await expect(service.createJournalEntry(entryData))
        .rejects.toThrow('Journal entry must have at least 2 lines')
    })

    it('should validate account existence', async () => {
      const entryData = {
        date: new Date('2024-01-15'),
        description: 'Invalid account entry',
        currency: 'USD',
        exchangeRate: 1.0,
        lines: [
          {
            accountId: 'invalid-account-id',
            description: 'Invalid account',
            debitAmount: 1000,
            creditAmount: 0
          },
          {
            accountId: revenueAccountId,
            description: 'Valid account',
            debitAmount: 0,
            creditAmount: 1000
          }
        ],
        createdBy: testUserId
      }

      await expect(service.createJournalEntry(entryData))
        .rejects.toThrow('Account invalid-account-id not found')
    })
  })

  describe('Journal Entry Posting', () => {
    let draftEntryId: string

    beforeEach(async () => {
      const entryData = {
        date: new Date('2024-01-15'),
        description: 'Test entry for posting',
        currency: 'USD',
        exchangeRate: 1.0,
        lines: [
          {
            accountId: cashAccountId,
            description: 'Cash received',
            debitAmount: 1000,
            creditAmount: 0
          },
          {
            accountId: revenueAccountId,
            description: 'Sales revenue',
            debitAmount: 0,
            creditAmount: 1000
          }
        ],
        createdBy: testUserId
      }

      const entry = await service.createJournalEntry(entryData)
      draftEntryId = entry.id
    })

    it('should post a draft journal entry and update account balances', async () => {
      const postedEntry = await service.postJournalEntry(draftEntryId, testUserId)

      expect(postedEntry.status).toBe(JournalStatus.POSTED)
      expect(postedEntry.postedAt).toBeDefined()
      expect(postedEntry.postedBy).toBe(testUserId)

      // Check account balances
      const cashAccount = await coaService.getAccount(cashAccountId)
      const revenueAccount = await coaService.getAccount(revenueAccountId)
      
      expect(cashAccount?.balance).toBe(1000)  // Asset increases with debit
      expect(revenueAccount?.balance).toBe(1000)  // Income increases with credit
    })

    it('should prevent posting already posted entries', async () => {
      await service.postJournalEntry(draftEntryId, testUserId)

      await expect(service.postJournalEntry(draftEntryId, testUserId))
        .rejects.toThrow('Only draft journal entries can be posted')
    })

    it('should prevent posting non-existent entries', async () => {
      await expect(service.postJournalEntry('invalid-id', testUserId))
        .rejects.toThrow('Journal entry not found')
    })
  })

  describe('Journal Entry Cancellation', () => {
    let postedEntryId: string

    beforeEach(async () => {
      const entryData = {
        date: new Date('2024-01-15'),
        description: 'Test entry for cancellation',
        currency: 'USD',
        exchangeRate: 1.0,
        lines: [
          {
            accountId: expenseAccountId,
            description: 'Office supplies',
            debitAmount: 500,
            creditAmount: 0
          },
          {
            accountId: cashAccountId,
            description: 'Cash payment',
            debitAmount: 0,
            creditAmount: 500
          }
        ],
        createdBy: testUserId
      }

      const entry = await service.createJournalEntry(entryData)
      const postedEntry = await service.postJournalEntry(entry.id, testUserId)
      postedEntryId = postedEntry.id
    })

    it('should cancel posted journal entry and reverse account balances', async () => {
      // Check initial balances
      const initialCash = await coaService.getAccount(cashAccountId)
      const initialExpense = await coaService.getAccount(expenseAccountId)
      
      expect(initialCash?.balance).toBe(-500)  // Cash decreased (credit)
      expect(initialExpense?.balance).toBe(500)  // Expense increased (debit)

      const cancelledEntry = await service.cancelJournalEntry(postedEntryId, testUserId)

      expect(cancelledEntry.status).toBe(JournalStatus.CANCELLED)
      expect(cancelledEntry.cancelledAt).toBeDefined()
      expect(cancelledEntry.cancelledBy).toBe(testUserId)

      // Check balances are reversed
      const finalCash = await coaService.getAccount(cashAccountId)
      const finalExpense = await coaService.getAccount(expenseAccountId)
      
      expect(finalCash?.balance).toBe(0)  // Balance restored
      expect(finalExpense?.balance).toBe(0)  // Balance restored
    })

    it('should prevent cancelling already cancelled entries', async () => {
      await service.cancelJournalEntry(postedEntryId, testUserId)

      await expect(service.cancelJournalEntry(postedEntryId, testUserId))
        .rejects.toThrow('Journal entry is already cancelled')
    })

    it('should prevent cancelling draft entries', async () => {
      const draftEntry = await service.createJournalEntry({
        date: new Date('2024-01-15'),
        description: 'Draft entry',
        currency: 'USD',
        exchangeRate: 1.0,
        lines: [
          {
            accountId: cashAccountId,
            description: 'Cash',
            debitAmount: 100,
            creditAmount: 0
          },
          {
            accountId: revenueAccountId,
            description: 'Revenue',
            debitAmount: 0,
            creditAmount: 100
          }
        ],
        createdBy: testUserId
      })

      await expect(service.cancelJournalEntry(draftEntry.id, testUserId))
        .rejects.toThrow('Only posted journal entries can be cancelled')
    })
  })

  describe('Journal Entry Filtering', () => {
    beforeEach(async () => {
      // Create multiple journal entries for filtering tests
      const entries = [
        {
          date: new Date('2024-01-01'),
          description: 'January entry',
          reference: 'JE-001',
          status: JournalStatus.DRAFT
        },
        {
          date: new Date('2024-02-01'),
          description: 'February entry',
          reference: 'JE-002',
          status: JournalStatus.POSTED
        },
        {
          date: new Date('2024-03-01'),
          description: 'March entry',
          reference: 'JE-003',
          status: JournalStatus.CANCELLED
        }
      ]

      for (const entryData of entries) {
        const entry = await service.createJournalEntry({
          ...entryData,
          currency: 'USD',
          exchangeRate: 1.0,
          lines: [
            {
              accountId: cashAccountId,
              description: 'Cash',
              debitAmount: 1000,
              creditAmount: 0
            },
            {
              accountId: revenueAccountId,
              description: 'Revenue',
              debitAmount: 0,
              creditAmount: 1000
            }
          ],
          createdBy: testUserId
        })

        if (entryData.status === JournalStatus.POSTED) {
          await service.postJournalEntry(entry.id, testUserId)
        } else if (entryData.status === JournalStatus.CANCELLED) {
          await service.postJournalEntry(entry.id, testUserId)
          await service.cancelJournalEntry(entry.id, testUserId)
        }
      }
    })

    it('should filter by status', async () => {
      const draftEntries = await service.getAllJournalEntries({ status: JournalStatus.DRAFT })
      const postedEntries = await service.getAllJournalEntries({ status: JournalStatus.POSTED })

      expect(draftEntries.some(e => e.description === 'January entry')).toBe(true)
      expect(postedEntries.some(e => e.description === 'February entry')).toBe(true)
    })

    it('should filter by date range', async () => {
      const januaryEntries = await service.getAllJournalEntries({
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31')
      })

      expect(januaryEntries).toHaveLength(1)
      expect(januaryEntries[0].description).toBe('January entry')
    })

    it('should filter by account', async () => {
      const cashEntries = await service.getAllJournalEntries({ accountId: cashAccountId })
      
      expect(cashEntries.length).toBeGreaterThan(0)
      cashEntries.forEach(entry => {
        expect(entry.lines.some(line => line.accountId === cashAccountId)).toBe(true)
      })
    })
  })

  describe('Multi-Currency Support', () => {
    it('should handle foreign currency transactions', async () => {
      const entryData = {
        date: new Date('2024-01-15'),
        description: 'EUR transaction',
        currency: 'EUR',
        exchangeRate: 1.1,  // 1 EUR = 1.1 USD
        lines: [
          {
            accountId: cashAccountId,
            description: 'EUR cash received',
            debitAmount: 1000,  // 1000 EUR
            creditAmount: 0
          },
          {
            accountId: revenueAccountId,
            description: 'EUR sales',
            debitAmount: 0,
            creditAmount: 1000  // 1000 EUR
          }
        ],
        createdBy: testUserId
      }

      const journalEntry = await service.createJournalEntry(entryData)

      expect(journalEntry.currency).toBe('EUR')
      expect(journalEntry.exchangeRate).toBe(1.1)
      
      // Calculate totals from lines
      const totalDebit = journalEntry.lines.reduce((sum, line) => sum + line.debitAmount, 0)
      const totalCredit = journalEntry.lines.reduce((sum, line) => sum + line.creditAmount, 0)
      expect(totalDebit).toBe(1000)
      expect(totalCredit).toBe(1000)
    })
  })
})