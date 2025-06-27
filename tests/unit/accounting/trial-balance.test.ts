import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { TrialBalanceService } from '@/lib/services/accounting/trial-balance.service'
import { JournalEntryService } from '@/lib/services/accounting/journal-entry.service'
import { ChartOfAccountsService } from '@/lib/services/accounting/chart-of-accounts.service'
import { AccountType } from '@/lib/constants/account-type'
import { prisma } from '@/lib/db/prisma'

describe('Trial Balance Service', () => {
  let trialBalanceService: TrialBalanceService
  let journalService: JournalEntryService
  let coaService: ChartOfAccountsService
  let testUserId: string
  let accountIds: { [key: string]: string } = {}

  beforeEach(async () => {
    trialBalanceService = new TrialBalanceService()
    journalService = new JournalEntryService()
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
    const accounts = [
      { code: '1000', name: 'Cash', type: AccountType.ASSET },
      { code: '1200', name: 'Accounts Receivable', type: AccountType.ASSET },
      { code: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY },
      { code: '3000', name: 'Share Capital', type: AccountType.EQUITY },
      { code: '4000', name: 'Sales Revenue', type: AccountType.INCOME },
      { code: '5000', name: 'Office Expenses', type: AccountType.EXPENSE }
    ]

    for (const account of accounts) {
      const created = await coaService.createAccount({
        code: account.code,
        name: account.name,
        type: account.type,
        currency: 'USD',
        createdBy: testUserId
      })
      accountIds[account.code] = created.id
    }
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

  describe('Trial Balance Generation', () => {
    beforeEach(async () => {
      // Create and post sample journal entries
      const entries = [
        {
          description: 'Initial capital investment',
          lines: [
            { accountId: accountIds['1000'], debit: 10000, credit: 0 }, // Cash
            { accountId: accountIds['3000'], debit: 0, credit: 10000 }  // Share Capital
          ]
        },
        {
          description: 'Sales transaction',
          lines: [
            { accountId: accountIds['1000'], debit: 5000, credit: 0 },  // Cash
            { accountId: accountIds['4000'], debit: 0, credit: 5000 }   // Revenue
          ]
        },
        {
          description: 'Credit sale',
          lines: [
            { accountId: accountIds['1200'], debit: 3000, credit: 0 }, // A/R
            { accountId: accountIds['4000'], debit: 0, credit: 3000 }  // Revenue
          ]
        },
        {
          description: 'Office expense',
          lines: [
            { accountId: accountIds['5000'], debit: 1000, credit: 0 }, // Expense
            { accountId: accountIds['1000'], debit: 0, credit: 1000 }  // Cash
          ]
        },
        {
          description: 'Purchase on credit',
          lines: [
            { accountId: accountIds['5000'], debit: 2000, credit: 0 }, // Expense
            { accountId: accountIds['2000'], debit: 0, credit: 2000 }  // A/P
          ]
        }
      ]

      for (const entryData of entries) {
        const entry = await journalService.createJournalEntry({
          date: new Date('2024-01-15'),
          description: entryData.description,
          currency: 'USD',
          exchangeRate: 1.0,
          lines: entryData.lines.map(line => ({
            accountId: line.accountId,
            description: entryData.description,
            debitAmount: line.debit,
            creditAmount: line.credit
          })),
          createdBy: testUserId
        })

        await journalService.postJournalEntry(entry.id, testUserId)
      }
    })

    it('should generate trial balance with correct balances', async () => {
      const trialBalance = await trialBalanceService.generateTrialBalance(
        new Date('2024-01-31'),
        'USD'
      )

      expect(trialBalance).toBeDefined()
      expect(trialBalance.currency).toBe('USD')
      expect(trialBalance.isBalanced).toBe(true)

      // Check individual account balances
      const cashBalance = trialBalance.accounts.find(a => a.code === '1000')
      expect(cashBalance?.debitBalance).toBe(14000) // 10000 + 5000 - 1000
      expect(cashBalance?.creditBalance).toBe(0)

      const arBalance = trialBalance.accounts.find(a => a.code === '1200')
      expect(arBalance?.debitBalance).toBe(3000)
      expect(arBalance?.creditBalance).toBe(0)

      const apBalance = trialBalance.accounts.find(a => a.code === '2000')
      expect(apBalance?.debitBalance).toBe(0)
      expect(apBalance?.creditBalance).toBe(2000)

      const capitalBalance = trialBalance.accounts.find(a => a.code === '3000')
      expect(capitalBalance?.debitBalance).toBe(0)
      expect(capitalBalance?.creditBalance).toBe(10000)

      const revenueBalance = trialBalance.accounts.find(a => a.code === '4000')
      expect(revenueBalance?.debitBalance).toBe(0)
      expect(revenueBalance?.creditBalance).toBe(8000) // 5000 + 3000

      const expenseBalance = trialBalance.accounts.find(a => a.code === '5000')
      expect(expenseBalance?.debitBalance).toBe(3000) // 1000 + 2000
      expect(expenseBalance?.creditBalance).toBe(0)
    })

    it('should ensure trial balance totals are equal', async () => {
      const trialBalance = await trialBalanceService.generateTrialBalance(
        new Date('2024-01-31'),
        'USD'
      )

      expect(trialBalance.totalDebits).toBe(trialBalance.totalCredits)
      expect(trialBalance.totalDebits).toBe(20000) // Total of all debits
      expect(trialBalance.totalCredits).toBe(20000) // Total of all credits
    })

    it('should filter by date correctly', async () => {
      // Create entry after our test date
      const futureEntry = await journalService.createJournalEntry({
        date: new Date('2024-02-15'),
        description: 'Future transaction',
        currency: 'USD',
        exchangeRate: 1.0,
        lines: [
          {
            accountId: accountIds['1000'],
            description: 'Future cash',
            debitAmount: 5000,
            creditAmount: 0
          },
          {
            accountId: accountIds['4000'],
            description: 'Future revenue',
            debitAmount: 0,
            creditAmount: 5000
          }
        ],
        createdBy: testUserId
      })
      await journalService.postJournalEntry(futureEntry.id, testUserId)

      // Generate trial balance as of January 31st
      const trialBalance = await trialBalanceService.generateTrialBalance(
        new Date('2024-01-31'),
        'USD'
      )

      // Should not include February transaction
      const cashBalance = trialBalance.accounts.find(a => a.code === '1000')
      expect(cashBalance?.debitBalance).toBe(14000) // Should not include the 5000 from Feb
    })

    it('should handle empty trial balance', async () => {
      // Clear all data
      await prisma.journalLine.deleteMany()
      await prisma.journalEntry.deleteMany()

      const trialBalance = await trialBalanceService.generateTrialBalance(
        new Date('2024-01-31'),
        'USD'
      )

      expect(trialBalance.accounts).toHaveLength(0)
      expect(trialBalance.totalDebits).toBe(0)
      expect(trialBalance.totalCredits).toBe(0)
      expect(trialBalance.isBalanced).toBe(true)
    })

    it('should filter by currency', async () => {
      // Create EUR account and transaction
      const eurCashAccount = await coaService.createAccount({
        code: '1001',
        name: 'Cash EUR',
        type: AccountType.ASSET,
        currency: 'EUR',
        createdBy: testUserId
      })

      const eurRevenueAccount = await coaService.createAccount({
        code: '4001',
        name: 'Revenue EUR',
        type: AccountType.INCOME,
        currency: 'EUR',
        createdBy: testUserId
      })

      const eurEntry = await journalService.createJournalEntry({
        date: new Date('2024-01-15'),
        description: 'EUR transaction',
        currency: 'EUR',
        exchangeRate: 1.1,
        lines: [
          {
            accountId: eurCashAccount.id,
            description: 'EUR cash',
            debitAmount: 1000,
            creditAmount: 0
          },
          {
            accountId: eurRevenueAccount.id,
            description: 'EUR revenue',
            debitAmount: 0,
            creditAmount: 1000
          }
        ],
        createdBy: testUserId
      })
      await journalService.postJournalEntry(eurEntry.id, testUserId)

      // Get USD trial balance - should not include EUR accounts
      const usdTrialBalance = await trialBalanceService.generateTrialBalance(
        new Date('2024-01-31'),
        'USD'
      )

      expect(usdTrialBalance.accounts.every(a => a.currency === 'USD')).toBe(true)

      // Get EUR trial balance - should only include EUR accounts
      const eurTrialBalance = await trialBalanceService.generateTrialBalance(
        new Date('2024-01-31'),
        'EUR'
      )

      expect(eurTrialBalance.accounts.every(a => a.currency === 'EUR')).toBe(true)
      expect(eurTrialBalance.accounts).toHaveLength(2)
    })
  })

  describe('Account Balance Classification', () => {
    it('should classify normal debit balance accounts correctly', async () => {
      // Create asset transaction
      const entry = await journalService.createJournalEntry({
        date: new Date('2024-01-15'),
        description: 'Asset purchase',
        currency: 'USD',
        exchangeRate: 1.0,
        lines: [
          {
            accountId: accountIds['1000'], // Cash (Asset)
            description: 'Cash payment',
            debitAmount: 1000,
            creditAmount: 0
          },
          {
            accountId: accountIds['2000'], // A/P (Liability)
            description: 'Amount owed',
            debitAmount: 0,
            creditAmount: 1000
          }
        ],
        createdBy: testUserId
      })
      await journalService.postJournalEntry(entry.id, testUserId)

      const trialBalance = await trialBalanceService.generateTrialBalance(
        new Date('2024-01-31'),
        'USD'
      )

      const assetAccount = trialBalance.accounts.find(a => a.code === '1000')
      const liabilityAccount = trialBalance.accounts.find(a => a.code === '2000')

      // Asset should show debit balance
      expect(assetAccount?.debitBalance).toBe(1000)
      expect(assetAccount?.creditBalance).toBe(0)

      // Liability should show credit balance
      expect(liabilityAccount?.debitBalance).toBe(0)
      expect(liabilityAccount?.creditBalance).toBe(1000)
    })
  })
})