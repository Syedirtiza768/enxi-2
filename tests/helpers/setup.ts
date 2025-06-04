import { setupTestDatabase, cleanTestDatabase, createTestCustomer, createTestLead } from '../../prisma/test-seed'
import { prisma } from '@/lib/db/prisma'

export class TestSetup {
  static testUser: any = null
  static accounts: any = null
  
  static async beforeAll() {
    // Set up fresh test environment
    const { testUser, accounts } = await setupTestDatabase()
    TestSetup.testUser = testUser
    TestSetup.accounts = accounts
    
    return { testUser, accounts }
  }
  
  static async afterAll() {
    // Clean up after all tests
    await cleanTestDatabase()
    await prisma.$disconnect()
  }
  
  static async beforeEach() {
    // Clean transactional data but keep base structure
    await prisma.auditLog.deleteMany()
    await prisma.journalLine.deleteMany()
    await prisma.journalEntry.deleteMany()
    await prisma.quotationItem.deleteMany()
    await prisma.quotation.deleteMany()
    await prisma.customerPO.deleteMany()
    await prisma.caseExpense.deleteMany()
    await prisma.salesCase.deleteMany()
    await prisma.stockMovement.deleteMany()
    await prisma.stockLot.deleteMany()
    await prisma.item.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.customer.deleteMany({
      where: {
        customerNumber: { not: 'SYSTEM' } // Keep system customer if exists
      }
    })
    
    // Keep accounts and users for reuse
  }
  
  static async createTestCustomer() {
    if (!TestSetup.testUser || !TestSetup.accounts) {
      throw new Error('Test setup not initialized. Call TestSetup.beforeAll() first.')
    }
    
    return createTestCustomer(TestSetup.testUser.id, TestSetup.accounts)
  }
  
  static async createTestLead() {
    if (!TestSetup.testUser) {
      throw new Error('Test setup not initialized. Call TestSetup.beforeAll() first.')
    }
    
    return createTestLead(TestSetup.testUser.id)
  }
  
  static getUserId() {
    if (!TestSetup.testUser) {
      throw new Error('Test setup not initialized. Call TestSetup.beforeAll() first.')
    }
    return TestSetup.testUser.id
  }
  
  static getAccounts() {
    if (!TestSetup.accounts) {
      throw new Error('Test setup not initialized. Call TestSetup.beforeAll() first.')
    }
    return TestSetup.accounts
  }
}

// Helper function to get account by code
export function getAccountByCode(accounts: any, code: string) {
  const accountMap: { [key: string]: any } = {
    '1000': accounts.assets,
    '1110': accounts.cash,
    '1120': accounts.accountsReceivable,
    '1130': accounts.inventory,
    '1210': accounts.equipment,
    '2000': accounts.liabilities,
    '2110': accounts.accountsPayable,
    '2200': accounts.longTermLiabilities,
    '3000': accounts.equity,
    '3100': accounts.shareCapital,
    '4000': accounts.income,
    '4100': accounts.salesRevenue,
    '4200': accounts.serviceRevenue,
    '5000': accounts.expenses,
    '5100': accounts.cogs,
    '5210': accounts.salariesExpense,
    '5220': accounts.rentExpense,
    '5230': accounts.utilitiesExpense
  }
  
  const account = accountMap[code]
  if (!account) {
    throw new Error(`Account with code ${code} not found in test setup`)
  }
  
  return account
}