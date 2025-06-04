import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { ChartOfAccountsService } from '@/lib/services/accounting/chart-of-accounts.service'
import { AccountType, AccountStatus } from '@/lib/types/accounting.types'
import { prisma } from '@/lib/db/prisma'

describe('Chart of Accounts Service', () => {
  let service: ChartOfAccountsService
  let testUserId: string

  beforeEach(async () => {
    service = new ChartOfAccountsService()
    
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
  })

  afterEach(async () => {
    // Clean up test data in correct order
    await prisma.journalLine.deleteMany()
    await prisma.journalEntry.deleteMany()
    await prisma.quotation.deleteMany()
    await prisma.salesCase.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.account.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.auditLog.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Account Creation', () => {
    it('should create a new account with valid data', async () => {
      const accountData = {
        code: '1000',
        name: 'Cash',
        type: AccountType.ASSET,
        currency: 'USD',
        description: 'Cash in hand and at bank',
        parentId: null,
        createdBy: testUserId
      }

      const account = await service.createAccount(accountData)

      expect(account).toBeDefined()
      expect(account.code).toBe('1000')
      expect(account.name).toBe('Cash')
      expect(account.type).toBe(AccountType.ASSET)
      expect(account.balance).toBe(0)
      expect(account.status).toBe(AccountStatus.ACTIVE)
    })

    it('should enforce unique account codes', async () => {
      const accountData = {
        code: '1000',
        name: 'Cash',
        type: AccountType.ASSET,
        currency: 'USD',
        createdBy: testUserId
      }

      await service.createAccount(accountData)
      
      await expect(service.createAccount(accountData))
        .rejects.toThrow('Account code already exists')
    })

    it('should validate account type hierarchy', async () => {
      // Create parent liability account
      const parentAccount = await service.createAccount({
        code: '2000',
        name: 'Liabilities',
        type: AccountType.LIABILITY,
        currency: 'USD',
        createdBy: testUserId
      })

      // Try to create asset account under liability parent - should fail
      await expect(service.createAccount({
        code: '2100',
        name: 'Invalid Asset',
        type: AccountType.ASSET,
        currency: 'USD',
        parentId: parentAccount.id,
        createdBy: testUserId
      })).rejects.toThrow('Account type must match parent account type')
    })
  })

  describe('Account Hierarchy', () => {
    it('should build account tree structure', async () => {
      // Create parent account
      const parent = await service.createAccount({
        code: '1000',
        name: 'Current Assets',
        type: AccountType.ASSET,
        currency: 'USD',
        createdBy: testUserId
      })

      // Create child accounts
      await service.createAccount({
        code: '1100',
        name: 'Cash',
        type: AccountType.ASSET,
        currency: 'USD',
        parentId: parent.id,
        createdBy: testUserId
      })

      await service.createAccount({
        code: '1200',
        name: 'Accounts Receivable',
        type: AccountType.ASSET,
        currency: 'USD',
        parentId: parent.id,
        createdBy: testUserId
      })

      const tree = await service.getAccountTree()
      const assetNode = tree.find(node => node.code === '1000')
      
      expect(assetNode?.children).toHaveLength(2)
      expect(assetNode?.children?.[0].code).toBe('1100')
      expect(assetNode?.children?.[1].code).toBe('1200')
    })
  })

  describe('Multi-Currency Support', () => {
    it('should handle multiple currencies per account type', async () => {
      const usdAccount = await service.createAccount({
        code: '1000',
        name: 'Cash USD',
        type: AccountType.ASSET,
        currency: 'USD',
        createdBy: testUserId
      })

      const eurAccount = await service.createAccount({
        code: '1001',
        name: 'Cash EUR',
        type: AccountType.ASSET,
        currency: 'EUR',
        createdBy: testUserId
      })

      expect(usdAccount.currency).toBe('USD')
      expect(eurAccount.currency).toBe('EUR')
    })
  })

  describe('Account Balance Tracking', () => {
    it('should track debit and credit balances correctly', async () => {
      const account = await service.createAccount({
        code: '1000',
        name: 'Cash',
        type: AccountType.ASSET,
        currency: 'USD',
        createdBy: testUserId
      })

      // Assets have normal debit balance
      await service.updateBalance(account.id, 1000, 'debit')
      let updated = await service.getAccount(account.id)
      expect(updated?.balance).toBe(1000)

      // Credit reduces asset balance
      await service.updateBalance(account.id, 300, 'credit')
      updated = await service.getAccount(account.id)
      expect(updated?.balance).toBe(700)
    })

    it('should handle normal credit balance accounts', async () => {
      const account = await service.createAccount({
        code: '3000',
        name: 'Share Capital',
        type: AccountType.EQUITY,
        currency: 'USD',
        createdBy: testUserId
      })

      // Equity has normal credit balance
      await service.updateBalance(account.id, 5000, 'credit')
      let updated = await service.getAccount(account.id)
      expect(updated?.balance).toBe(5000)

      // Debit reduces equity balance
      await service.updateBalance(account.id, 1000, 'debit')
      updated = await service.getAccount(account.id)
      expect(updated?.balance).toBe(4000)
    })
  })

  describe('Standard Chart of Accounts', () => {
    it('should create standard COA template', async () => {
      await service.createStandardCOA('USD', testUserId)

      const accounts = await service.getAllAccounts()
      
      // Should have all major account categories
      expect(accounts.some(a => a.code === '1000')).toBe(true) // Assets
      expect(accounts.some(a => a.code === '2000')).toBe(true) // Liabilities
      expect(accounts.some(a => a.code === '3000')).toBe(true) // Equity
      expect(accounts.some(a => a.code === '4000')).toBe(true) // Income
      expect(accounts.some(a => a.code === '5000')).toBe(true) // Expenses
    })
  })
})