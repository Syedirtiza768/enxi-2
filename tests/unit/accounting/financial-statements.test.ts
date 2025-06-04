import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { FinancialStatementsService } from '@/lib/services/accounting/financial-statements.service'
import { JournalEntryService } from '@/lib/services/accounting/journal-entry.service'
import { ChartOfAccountsService } from '@/lib/services/accounting/chart-of-accounts.service'
import { AccountType } from '@/lib/generated/prisma'
import { prisma } from '@/lib/db/prisma'

describe('Financial Statements Service', () => {
  let financialService: FinancialStatementsService
  let journalService: JournalEntryService
  let coaService: ChartOfAccountsService
  let testUserId: string
  let accountIds: { [key: string]: string } = {}

  beforeEach(async () => {
    financialService = new FinancialStatementsService()
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

    // Create comprehensive test accounts
    const accounts = [
      // Assets
      { code: '1000', name: 'Cash', type: AccountType.ASSET },
      { code: '1200', name: 'Accounts Receivable', type: AccountType.ASSET },
      { code: '1500', name: 'Equipment', type: AccountType.ASSET },
      
      // Liabilities
      { code: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY },
      { code: '2500', name: 'Bank Loan', type: AccountType.LIABILITY },
      
      // Equity
      { code: '3000', name: 'Share Capital', type: AccountType.EQUITY },
      { code: '3500', name: 'Retained Earnings', type: AccountType.EQUITY },
      
      // Income
      { code: '4000', name: 'Sales Revenue', type: AccountType.INCOME },
      { code: '4100', name: 'Service Revenue', type: AccountType.INCOME },
      
      // Expenses
      { code: '5000', name: 'Cost of Goods Sold', type: AccountType.EXPENSE },
      { code: '5100', name: 'Office Expenses', type: AccountType.EXPENSE },
      { code: '5200', name: 'Marketing Expenses', type: AccountType.EXPENSE }
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

  describe('Balance Sheet Generation', () => {
    beforeEach(async () => {
      // Create comprehensive business scenario
      const entries = [
        {
          description: 'Initial capital investment',
          lines: [
            { accountId: accountIds['1000'], debit: 50000, credit: 0 }, // Cash
            { accountId: accountIds['3000'], debit: 0, credit: 50000 }  // Share Capital
          ]
        },
        {
          description: 'Equipment purchase',
          lines: [
            { accountId: accountIds['1500'], debit: 20000, credit: 0 }, // Equipment
            { accountId: accountIds['1000'], debit: 0, credit: 15000 }, // Cash payment
            { accountId: accountIds['2500'], debit: 0, credit: 5000 }   // Bank loan
          ]
        },
        {
          description: 'Sales on credit',
          lines: [
            { accountId: accountIds['1200'], debit: 10000, credit: 0 }, // A/R
            { accountId: accountIds['4000'], debit: 0, credit: 10000 }  // Revenue
          ]
        },
        {
          description: 'Purchase on credit',
          lines: [
            { accountId: accountIds['5000'], debit: 6000, credit: 0 },  // COGS
            { accountId: accountIds['2000'], debit: 0, credit: 6000 }   // A/P
          ]
        },
        {
          description: 'Operating expenses',
          lines: [
            { accountId: accountIds['5100'], debit: 2000, credit: 0 }, // Office expenses
            { accountId: accountIds['5200'], debit: 1500, credit: 0 }, // Marketing
            { accountId: accountIds['1000'], debit: 0, credit: 3500 }  // Cash payment
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

    it('should generate balance sheet with correct structure', async () => {
      const balanceSheet = await financialService.generateBalanceSheet(
        new Date('2024-01-31'),
        'USD'
      )

      expect(balanceSheet).toBeDefined()
      expect(balanceSheet.currency).toBe('USD')
      expect(balanceSheet.asOfDate).toEqual(new Date('2024-01-31'))

      // Check structure
      expect(balanceSheet.assets).toBeDefined()
      expect(balanceSheet.liabilities).toBeDefined()
      expect(balanceSheet.equity).toBeDefined()
    })

    it('should calculate asset balances correctly', async () => {
      const balanceSheet = await financialService.generateBalanceSheet(
        new Date('2024-01-31'),
        'USD'
      )

      const cash = balanceSheet.assets.find(a => a.code === '1000')
      const ar = balanceSheet.assets.find(a => a.code === '1200')
      const equipment = balanceSheet.assets.find(a => a.code === '1500')

      expect(cash?.balance).toBe(31500) // 50000 - 15000 - 3500
      expect(ar?.balance).toBe(10000)
      expect(equipment?.balance).toBe(20000)

      expect(balanceSheet.totalAssets).toBe(61500)
    })

    it('should calculate liability balances correctly', async () => {
      const balanceSheet = await financialService.generateBalanceSheet(
        new Date('2024-01-31'),
        'USD'
      )

      const ap = balanceSheet.liabilities.find(a => a.code === '2000')
      const loan = balanceSheet.liabilities.find(a => a.code === '2500')

      expect(ap?.balance).toBe(6000)
      expect(loan?.balance).toBe(5000)

      expect(balanceSheet.totalLiabilities).toBe(11000)
    })

    it('should calculate equity including retained earnings', async () => {
      const balanceSheet = await financialService.generateBalanceSheet(
        new Date('2024-01-31'),
        'USD'
      )

      const shareCapital = balanceSheet.equity.find(a => a.code === '3000')
      const retainedEarnings = balanceSheet.equity.find(a => a.name === 'Retained Earnings')

      expect(shareCapital?.balance).toBe(50000)
      expect(retainedEarnings?.balance).toBe(500) // Revenue (10000) - Expenses (9500)

      expect(balanceSheet.totalEquity).toBe(50500)
    })

    it('should validate accounting equation (Assets = Liabilities + Equity)', async () => {
      const balanceSheet = await financialService.generateBalanceSheet(
        new Date('2024-01-31'),
        'USD'
      )

      expect(balanceSheet.isBalanced).toBe(true)
      expect(balanceSheet.totalAssets).toBe(
        balanceSheet.totalLiabilities + balanceSheet.totalEquity
      )
      expect(balanceSheet.totalAssets).toBe(61500)
      expect(balanceSheet.totalLiabilities + balanceSheet.totalEquity).toBe(61500)
    })
  })

  describe('Income Statement Generation', () => {
    beforeEach(async () => {
      // Create revenue and expense transactions across multiple periods
      const entries = [
        // Q1 2024 transactions
        {
          date: new Date('2024-01-15'),
          description: 'Sales revenue Q1',
          lines: [
            { accountId: accountIds['1000'], debit: 15000, credit: 0 },
            { accountId: accountIds['4000'], debit: 0, credit: 15000 }
          ]
        },
        {
          date: new Date('2024-02-15'),
          description: 'Service revenue Q1',
          lines: [
            { accountId: accountIds['1000'], debit: 8000, credit: 0 },
            { accountId: accountIds['4100'], debit: 0, credit: 8000 }
          ]
        },
        {
          date: new Date('2024-03-15'),
          description: 'Cost of goods sold Q1',
          lines: [
            { accountId: accountIds['5000'], debit: 9000, credit: 0 },
            { accountId: accountIds['1000'], debit: 0, credit: 9000 }
          ]
        },
        {
          date: new Date('2024-03-20'),
          description: 'Operating expenses Q1',
          lines: [
            { accountId: accountIds['5100'], debit: 3000, credit: 0 },
            { accountId: accountIds['5200'], debit: 2500, credit: 0 },
            { accountId: accountIds['1000'], debit: 0, credit: 5500 }
          ]
        },
        // Q2 2024 transactions (should not be included in Q1 report)
        {
          date: new Date('2024-04-15'),
          description: 'Q2 Sales',
          lines: [
            { accountId: accountIds['1000'], debit: 20000, credit: 0 },
            { accountId: accountIds['4000'], debit: 0, credit: 20000 }
          ]
        }
      ]

      for (const entryData of entries) {
        const entry = await journalService.createJournalEntry({
          date: entryData.date,
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

    it('should generate income statement with correct structure', async () => {
      const incomeStatement = await financialService.generateIncomeStatement(
        new Date('2024-01-01'),
        new Date('2024-03-31'),
        'USD'
      )

      expect(incomeStatement).toBeDefined()
      expect(incomeStatement.currency).toBe('USD')
      expect(incomeStatement.fromDate).toEqual(new Date('2024-01-01'))
      expect(incomeStatement.toDate).toEqual(new Date('2024-03-31'))

      expect(incomeStatement.revenue).toBeDefined()
      expect(incomeStatement.expenses).toBeDefined()
    })

    it('should calculate revenue correctly', async () => {
      const incomeStatement = await financialService.generateIncomeStatement(
        new Date('2024-01-01'),
        new Date('2024-03-31'),
        'USD'
      )

      const salesRevenue = incomeStatement.revenue.find(r => r.code === '4000')
      const serviceRevenue = incomeStatement.revenue.find(r => r.code === '4100')

      expect(salesRevenue?.amount).toBe(15000)
      expect(serviceRevenue?.amount).toBe(8000)
      expect(incomeStatement.totalRevenue).toBe(23000)
    })

    it('should calculate expenses correctly', async () => {
      const incomeStatement = await financialService.generateIncomeStatement(
        new Date('2024-01-01'),
        new Date('2024-03-31'),
        'USD'
      )

      const cogs = incomeStatement.expenses.find(e => e.code === '5000')
      const office = incomeStatement.expenses.find(e => e.code === '5100')
      const marketing = incomeStatement.expenses.find(e => e.code === '5200')

      expect(cogs?.amount).toBe(9000)
      expect(office?.amount).toBe(3000)
      expect(marketing?.amount).toBe(2500)
      expect(incomeStatement.totalExpenses).toBe(14500)
    })

    it('should calculate net income correctly', async () => {
      const incomeStatement = await financialService.generateIncomeStatement(
        new Date('2024-01-01'),
        new Date('2024-03-31'),
        'USD'
      )

      expect(incomeStatement.netIncome).toBe(8500) // 23000 - 14500
    })

    it('should filter by date range correctly', async () => {
      // Get January only
      const januaryIS = await financialService.generateIncomeStatement(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'USD'
      )

      const salesRevenue = januaryIS.revenue.find(r => r.code === '4000')
      expect(salesRevenue?.amount).toBe(15000) // Only January sales
      expect(januaryIS.totalRevenue).toBe(15000)
      expect(januaryIS.totalExpenses).toBe(0) // No expenses in January
      expect(januaryIS.netIncome).toBe(15000)
    })

    it('should handle period with no transactions', async () => {
      const incomeStatement = await financialService.generateIncomeStatement(
        new Date('2024-05-01'),
        new Date('2024-05-31'),
        'USD'
      )

      expect(incomeStatement.revenue).toHaveLength(0)
      expect(incomeStatement.expenses).toHaveLength(0)
      expect(incomeStatement.totalRevenue).toBe(0)
      expect(incomeStatement.totalExpenses).toBe(0)
      expect(incomeStatement.netIncome).toBe(0)
    })

    it('should filter by currency', async () => {
      // Create EUR accounts and transaction
      const eurRevenueAccount = await coaService.createAccount({
        code: '4500',
        name: 'EUR Sales',
        type: AccountType.INCOME,
        currency: 'EUR',
        createdBy: testUserId
      })

      const eurCashAccount = await coaService.createAccount({
        code: '1050',
        name: 'EUR Cash',
        type: AccountType.ASSET,
        currency: 'EUR',
        createdBy: testUserId
      })

      const eurEntry = await journalService.createJournalEntry({
        date: new Date('2024-01-15'),
        description: 'EUR sales',
        currency: 'EUR',
        exchangeRate: 1.1,
        lines: [
          {
            accountId: eurCashAccount.id,
            description: 'EUR cash',
            debitAmount: 5000,
            creditAmount: 0
          },
          {
            accountId: eurRevenueAccount.id,
            description: 'EUR revenue',
            debitAmount: 0,
            creditAmount: 5000
          }
        ],
        createdBy: testUserId
      })
      await journalService.postJournalEntry(eurEntry.id, testUserId)

      // Get USD income statement - should not include EUR transactions
      const usdIS = await financialService.generateIncomeStatement(
        new Date('2024-01-01'),
        new Date('2024-03-31'),
        'USD'
      )

      expect(usdIS.revenue.every(r => r.currency === 'USD')).toBe(true)

      // Get EUR income statement - should only include EUR transactions
      const eurIS = await financialService.generateIncomeStatement(
        new Date('2024-01-01'),
        new Date('2024-03-31'),
        'EUR'
      )

      expect(eurIS.revenue.every(r => r.currency === 'EUR')).toBe(true)
      expect(eurIS.totalRevenue).toBe(5000)
    })
  })

  describe('Date Range Validation', () => {
    it('should validate that fromDate is before toDate', async () => {
      await expect(
        financialService.generateIncomeStatement(
          new Date('2024-03-31'),
          new Date('2024-01-01'),
          'USD'
        )
      ).rejects.toThrow('fromDate must be before toDate')
    })
  })
})