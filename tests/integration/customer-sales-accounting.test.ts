import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { CustomerService } from '@/lib/services/customer.service'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { JournalEntryService } from '@/lib/services/accounting/journal-entry.service'
import { ChartOfAccountsService } from '@/lib/services/accounting/chart-of-accounts.service'
import { TrialBalanceService } from '@/lib/services/accounting/trial-balance.service'
import { AccountType } from '@/lib/constants/account-type'
import { SalesCaseStatus, LeadStatus } from "@/lib/types/shared-enums"
import { prisma } from '@/lib/db/prisma'

describe('Customer-Sales-Accounting Integration', () => {
  jest.setTimeout(30000) // 30 second timeout
  let customerService: CustomerService
  let salesCaseService: SalesCaseService
  let journalService: JournalEntryService
  let coaService: ChartOfAccountsService
  let trialBalanceService: TrialBalanceService
  let testUserId: string

  beforeEach(async () => {
    // Initialize services
    customerService = new CustomerService()
    salesCaseService = new SalesCaseService()
    journalService = new JournalEntryService()
    coaService = new ChartOfAccountsService()
    trialBalanceService = new TrialBalanceService()
    
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'USER'
      }
    })
    testUserId = testUser.id

    // Initialize Chart of Accounts
    await coaService.createStandardCOA('USD', testUserId)
  })

  afterEach(async () => {
    // Clean up test data
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

  describe('Lead to Cash Flow', () => {
    it('should complete full lead to cash cycle with accounting integration', async () => {
      // Step 1: Create a lead
      const lead = await prisma.lead.create({
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@techcorp.com',
          company: 'TechCorp Inc',
          phone: '+1-555-0123',
          jobTitle: 'CTO',
          source: 'REFERRAL',
          status: LeadStatus.QUALIFIED,
          createdBy: testUserId
        }
      })

      // Step 2: Convert lead to customer
      const customer = await customerService.convertLeadToCustomer(
        lead.id,
        {
          address: '789 Tech Boulevard, Silicon Valley, CA',
          taxId: 'TC-123456',
          currency: 'USD',
          creditLimit: 50000,
          paymentTerms: 30
        },
        testUserId
      )

      expect(customer).toBeDefined()
      expect(customer.customerNumber).toMatch(/^CUST-\d{4}$/)
      expect(customer.email).toBe(lead.email)
      expect(customer.leadId).toBe(lead.id)
      expect(customer.account).toBeDefined()
      expect(customer.account?.code).toMatch(/^1200-CUST-\d{4}$/)

      // Verify lead status was updated
      const updatedLead = await prisma.lead.findUnique({ where: { id: lead.id } })
      expect(updatedLead?.status).toBe(LeadStatus.CONVERTED)

      // Step 3: Create a sales case
      const salesCase = await salesCaseService.createSalesCase({
        customerId: customer.id,
        title: 'Enterprise Software Package',
        description: 'Implementation of complete ERP solution',
        estimatedValue: 45000,
        assignedTo: testUserId,
        createdBy: testUserId
      })

      expect(salesCase).toBeDefined()
      expect(salesCase.caseNumber).toMatch(/^CASE-\d{4}$/)
      expect(salesCase.status).toBe(SalesCaseStatus.OPEN)

      // Step 4: Close the sales case as won
      const closedCase = await salesCaseService.closeSalesCase(
        salesCase.id,
        SalesCaseStatus.WON,
        42000, // actual value
        25000, // cost
        testUserId
      )

      expect(closedCase.status).toBe(SalesCaseStatus.WON)
      expect(closedCase.actualValue).toBe(42000)
      expect(closedCase.profitMargin).toBeCloseTo(40.48, 2) // (42000-25000)/42000*100

      // Step 5: Record the sale in accounting
      // Get required accounts
      const accounts = await coaService.getAllAccounts()
      const cashAccount = accounts.find(a => a.code === '1110')
      const revenueAccount = accounts.find(a => a.code === '4100')
      const customerARAccount = customer.account

      expect(cashAccount).toBeDefined()
      expect(revenueAccount).toBeDefined()
      expect(customerARAccount).toBeDefined()

      // Create invoice journal entry (customer owes money)
      const invoiceEntry = await journalService.createJournalEntry({
        date: new Date(),
        description: `Invoice for ${salesCase.title} - ${salesCase.caseNumber}`,
        reference: `INV-${salesCase.caseNumber}`,
        currency: 'USD',
        lines: [
          {
            accountId: customerARAccount!.id,
            description: 'Customer invoice',
            debitAmount: 42000,
            creditAmount: 0
          },
          {
            accountId: revenueAccount!.id,
            description: 'Sales revenue',
            debitAmount: 0,
            creditAmount: 42000
          }
        ],
        createdBy: testUserId
      })

      // Post the invoice
      await journalService.postJournalEntry(invoiceEntry.id, testUserId)

      // Step 6: Record customer payment
      const paymentEntry = await journalService.createJournalEntry({
        date: new Date(),
        description: `Payment received from ${customer.name}`,
        reference: `PAY-${customer.customerNumber}`,
        currency: 'USD',
        lines: [
          {
            accountId: cashAccount!.id,
            description: 'Cash received',
            debitAmount: 42000,
            creditAmount: 0
          },
          {
            accountId: customerARAccount!.id,
            description: 'Clear customer invoice',
            debitAmount: 0,
            creditAmount: 42000
          }
        ],
        createdBy: testUserId
      })

      // Post the payment
      await journalService.postJournalEntry(paymentEntry.id, testUserId)

      // Step 7: Verify customer balance and credit status
      const customerBalance = await customerService.getCustomerBalance(customer.id)
      
      expect(customerBalance.accountBalance).toBe(0) // Invoice paid in full
      expect(customerBalance.creditStatus.usedCredit).toBe(0)
      expect(customerBalance.creditStatus.availableCredit).toBe(50000)
      expect(customerBalance.creditStatus.isWithinLimit).toBe(true)

      // Step 8: Verify accounting balances
      const trialBalance = await trialBalanceService.generateTrialBalance(
        new Date(),
        'USD'
      )

      // Find relevant accounts in trial balance
      const tbCash = trialBalance.accounts.find(a => a.code === '1110')
      const tbRevenue = trialBalance.accounts.find(a => a.code === '4100')
      const tbCustomerAR = trialBalance.accounts.find(a => a.code === customerARAccount!.code)

      // Cash should have increased by 42000
      expect(tbCash?.debitBalance).toBe(42000)
      expect(tbCash?.creditBalance).toBe(0)

      // Revenue should show 42000 credit
      expect(tbRevenue?.debitBalance).toBe(0)
      expect(tbRevenue?.creditBalance).toBe(42000)

      // Customer AR should be zero (invoice created and paid)
      expect(tbCustomerAR?.debitBalance).toBe(0)
      expect(tbCustomerAR?.creditBalance).toBe(0)

      // Trial balance should be balanced
      expect(trialBalance.isBalanced).toBe(true)
      expect(trialBalance.totalDebits).toBe(trialBalance.totalCredits)
    })

    it('should handle credit limit scenarios correctly', async () => {
      // Create a customer with limited credit
      const customer = await customerService.createCustomer({
        name: 'Limited Credit Corp',
        email: 'limited@test.com',
        creditLimit: 10000,
        paymentTerms: 15,
        createdBy: testUserId
      })

      // Create an invoice that uses some credit
      const accounts = await coaService.getAllAccounts()
      const revenueAccount = accounts.find(a => a.code === '4100')
      const customerARAccount = customer.account

      const invoiceEntry = await journalService.createJournalEntry({
        date: new Date(),
        description: 'Invoice for services',
        reference: 'INV-001',
        currency: 'USD',
        lines: [
          {
            accountId: customerARAccount!.id,
            description: 'Customer invoice',
            debitAmount: 8000,
            creditAmount: 0
          },
          {
            accountId: revenueAccount!.id,
            description: 'Service revenue',
            debitAmount: 0,
            creditAmount: 8000
          }
        ],
        createdBy: testUserId
      })

      await journalService.postJournalEntry(invoiceEntry.id, testUserId)

      // Check credit status
      const creditCheck = await customerService.performCreditCheck(customer.id)
      
      expect(creditCheck.creditLimit).toBe(10000)
      expect(creditCheck.usedCredit).toBe(8000)
      expect(creditCheck.availableCredit).toBe(2000)
      expect(creditCheck.isWithinLimit).toBe(true)

      // Try to reduce credit limit below used amount
      await expect(
        customerService.updateCreditLimit(customer.id, 5000, testUserId)
      ).rejects.toThrow('Cannot set credit limit below current used credit')
    })

    it('should track sales metrics across multiple cases', async () => {
      // Create a customer
      const customer = await customerService.createCustomer({
        name: 'Metrics Test Corp',
        email: 'metrics@test.com',
        createdBy: testUserId
      })

      // Create multiple sales cases with different outcomes
      const case1 = await salesCaseService.createSalesCase({
        customerId: customer.id,
        title: 'Deal 1',
        estimatedValue: 20000,
        createdBy: testUserId
      })

      const case2 = await salesCaseService.createSalesCase({
        customerId: customer.id,
        title: 'Deal 2',
        estimatedValue: 30000,
        createdBy: testUserId
      })

      const case3 = await salesCaseService.createSalesCase({
        customerId: customer.id,
        title: 'Deal 3',
        estimatedValue: 25000,
        createdBy: testUserId
      })

      // Close cases with different outcomes
      await salesCaseService.closeSalesCase(
        case1.id,
        SalesCaseStatus.WON,
        22000,
        12000,
        testUserId
      )

      await salesCaseService.closeSalesCase(
        case2.id,
        SalesCaseStatus.LOST,
        0,
        2000,
        testUserId
      )

      // Leave case3 open

      // Get metrics
      const metrics = await salesCaseService.getSalesCaseMetrics({
        customerId: customer.id
      })

      expect(metrics.totalCases).toBe(3)
      expect(metrics.openCases).toBe(1)
      expect(metrics.wonCases).toBe(1)
      expect(metrics.lostCases).toBe(1)
      expect(metrics.totalEstimatedValue).toBe(75000)
      expect(metrics.totalActualValue).toBe(22000)
      expect(metrics.totalProfit).toBe(8000) // 22000 - 12000 - 2000
      expect(metrics.averageWinRate).toBe(50) // 1 won out of 2 closed
    })
  })
})