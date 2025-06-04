import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { runQuotationExpiryCheck } from '@/lib/cron/quotation-expiry'
import { QuotationService } from '@/lib/services/quotation.service'
import { CustomerService } from '@/lib/services/customer.service'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { prisma } from '@/lib/db/prisma'

// Mock Date to control time in tests
const mockDate = (dateString: string) => {
  const realDate = Date
  const MockedDate = class extends Date {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(dateString)
      } else {
        super(...args)
      }
    }
    
    static now() {
      return new Date(dateString).getTime()
    }
  } as any
  
  global.Date = MockedDate
  return () => { global.Date = realDate }
}

describe('Quotation Expiry Cron Job', () => {
  let quotationService: QuotationService
  let customerService: CustomerService
  let salesCaseService: SalesCaseService
  let testUserId: string
  let testCustomerId: string
  let testSalesCaseId: string
  let restoreDate: () => void

  beforeEach(async () => {
    // Initialize services
    quotationService = new QuotationService()
    customerService = new CustomerService()
    salesCaseService = new SalesCaseService()
    
    // Mock current time to January 15, 2024
    restoreDate = mockDate('2024-01-15T10:00:00.000Z')
    
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        username: 'crontest',
        email: 'cron@test.com',
        password: 'hashedPassword',
        role: 'USER'
      }
    })
    testUserId = testUser.id

    // Create test customer
    const testCustomer = await customerService.createCustomer({
      name: 'Cron Test Customer',
      email: 'customer@crontest.com',
      createdBy: testUserId
    })
    testCustomerId = testCustomer.id

    // Create test sales case
    const testSalesCase = await salesCaseService.createSalesCase({
      customerId: testCustomerId,
      title: 'Cron Test Sales Case',
      description: 'Test case for cron job',
      estimatedValue: 10000,
      createdBy: testUserId
    })
    testSalesCaseId = testSalesCase.id
  })

  afterEach(async () => {
    // Restore real Date
    restoreDate()
    
    // Clean up test data
    await prisma.auditLog.deleteMany()
    await prisma.quotationItem.deleteMany()
    await prisma.quotation.deleteMany()
    await prisma.salesCase.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('runQuotationExpiryCheck', () => {
    it('should expire quotations past their valid date', async () => {
      // Create quotation that expires yesterday (January 14, 2024)
      const expiredQuotationData = {
        salesCaseId: testSalesCaseId,
        validUntil: new Date('2024-01-14T23:59:59.000Z'), // Yesterday
        items: [
          {
            itemCode: 'CRON-001',
            description: 'Expired Test Item',
            quantity: 1,
            unitPrice: 1000
          }
        ],
        createdBy: testUserId
      }

      const quotation = await quotationService.createQuotation(expiredQuotationData)
      
      // Send the quotation (only sent quotations can expire)
      await quotationService.sendQuotation(quotation.id, testUserId)
      
      // Verify it's sent
      let currentQuotation = await quotationService.getQuotation(quotation.id)
      expect(currentQuotation?.status).toBe('SENT')

      // Run the expiry check
      const result = await runQuotationExpiryCheck()

      // Verify results
      expect(result.success).toBe(true)
      expect(result.expiredCount).toBe(1)
      expect(result.expiredQuotations).toContain(quotation.quotationNumber)

      // Verify quotation is now expired
      currentQuotation = await quotationService.getQuotation(quotation.id)
      expect(currentQuotation?.status).toBe('EXPIRED')

      // Verify audit log was created
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entityType: 'System',
          entityId: 'quotation-expiry-manual'
        }
      })
      expect(auditLogs).toHaveLength(1)
      expect(auditLogs[0].metadata).toMatchObject({
        type: 'manual-execution',
        expiredCount: 1
      })
    })

    it('should not expire quotations that are still valid', async () => {
      // Create quotation that expires tomorrow (January 16, 2024)
      const validQuotationData = {
        salesCaseId: testSalesCaseId,
        validUntil: new Date('2024-01-16T23:59:59.000Z'), // Tomorrow
        items: [
          {
            itemCode: 'CRON-002',
            description: 'Valid Test Item',
            quantity: 1,
            unitPrice: 1000
          }
        ],
        createdBy: testUserId
      }

      const quotation = await quotationService.createQuotation(validQuotationData)
      await quotationService.sendQuotation(quotation.id, testUserId)

      // Run the expiry check
      const result = await runQuotationExpiryCheck()

      // Verify no quotations expired
      expect(result.success).toBe(true)
      expect(result.expiredCount).toBe(0)
      expect(result.expiredQuotations).toHaveLength(0)

      // Verify quotation is still sent
      const currentQuotation = await quotationService.getQuotation(quotation.id)
      expect(currentQuotation?.status).toBe('SENT')
    })

    it('should only expire SENT quotations, not DRAFT ones', async () => {
      // Create expired quotation but leave it as draft
      const expiredDraftData = {
        salesCaseId: testSalesCaseId,
        validUntil: new Date('2024-01-14T23:59:59.000Z'), // Yesterday
        items: [
          {
            itemCode: 'CRON-003',
            description: 'Expired Draft Item',
            quantity: 1,
            unitPrice: 1000
          }
        ],
        createdBy: testUserId
      }

      const draftQuotation = await quotationService.createQuotation(expiredDraftData)
      // Don't send it - leave as draft

      // Create expired sent quotation
      const expiredSentData = {
        salesCaseId: testSalesCaseId,
        validUntil: new Date('2024-01-14T23:59:59.000Z'), // Yesterday
        items: [
          {
            itemCode: 'CRON-004',
            description: 'Expired Sent Item',
            quantity: 1,
            unitPrice: 1000
          }
        ],
        createdBy: testUserId
      }

      const sentQuotation = await quotationService.createQuotation(expiredSentData)
      await quotationService.sendQuotation(sentQuotation.id, testUserId)

      // Run expiry check
      const result = await runQuotationExpiryCheck()

      // Only the sent quotation should expire
      expect(result.expiredCount).toBe(1)
      expect(result.expiredQuotations).toContain(sentQuotation.quotationNumber)

      // Check statuses
      const draftStatus = await quotationService.getQuotation(draftQuotation.id)
      const sentStatus = await quotationService.getQuotation(sentQuotation.id)

      expect(draftStatus?.status).toBe('DRAFT') // Still draft
      expect(sentStatus?.status).toBe('EXPIRED') // Now expired
    })

    it('should handle multiple expired quotations', async () => {
      // Create multiple expired quotations
      const quotationData1 = {
        salesCaseId: testSalesCaseId,
        validUntil: new Date('2024-01-14T10:00:00.000Z'),
        items: [{ itemCode: 'MULTI-001', description: 'Multi Test 1', quantity: 1, unitPrice: 1000 }],
        createdBy: testUserId
      }
      
      const quotationData2 = {
        salesCaseId: testSalesCaseId,
        validUntil: new Date('2024-01-13T15:30:00.000Z'),
        items: [{ itemCode: 'MULTI-002', description: 'Multi Test 2', quantity: 1, unitPrice: 2000 }],
        createdBy: testUserId
      }

      const quotation1 = await quotationService.createQuotation(quotationData1)
      const quotation2 = await quotationService.createQuotation(quotationData2)

      await quotationService.sendQuotation(quotation1.id, testUserId)
      await quotationService.sendQuotation(quotation2.id, testUserId)

      // Run expiry check
      const result = await runQuotationExpiryCheck()

      // Both should expire
      expect(result.expiredCount).toBe(2)
      expect(result.expiredQuotations).toContain(quotation1.quotationNumber)
      expect(result.expiredQuotations).toContain(quotation2.quotationNumber)

      // Verify both are expired
      const status1 = await quotationService.getQuotation(quotation1.id)
      const status2 = await quotationService.getQuotation(quotation2.id)
      
      expect(status1?.status).toBe('EXPIRED')
      expect(status2?.status).toBe('EXPIRED')
    })

    it('should handle edge case of quotation expiring exactly now', async () => {
      // Create quotation that expires exactly at current time
      const edgeCaseData = {
        salesCaseId: testSalesCaseId,
        validUntil: new Date('2024-01-15T10:00:00.000Z'), // Exactly now
        items: [
          {
            itemCode: 'EDGE-001',
            description: 'Edge Case Item',
            quantity: 1,
            unitPrice: 1000
          }
        ],
        createdBy: testUserId
      }

      const quotation = await quotationService.createQuotation(edgeCaseData)
      await quotationService.sendQuotation(quotation.id, testUserId)

      // Run expiry check
      const result = await runQuotationExpiryCheck()

      // Should expire (validUntil < now, not <=)
      expect(result.expiredCount).toBe(0) // Exactly at time shouldn't expire
      
      const currentQuotation = await quotationService.getQuotation(quotation.id)
      expect(currentQuotation?.status).toBe('SENT') // Still sent

      // Now move time forward 1 second and test again
      restoreDate()
      restoreDate = mockDate('2024-01-15T10:00:01.000Z')

      const result2 = await runQuotationExpiryCheck()
      expect(result2.expiredCount).toBe(1)
    })

    it('should log errors when expiry check fails', async () => {
      // Mock the quotationService to throw an error
      const originalCheckExpired = quotationService.checkExpiredQuotations
      quotationService.checkExpiredQuotations = jest.fn().mockRejectedValue(new Error('Database error'))

      await expect(runQuotationExpiryCheck()).rejects.toThrow('Database error')

      // Restore original method
      quotationService.checkExpiredQuotations = originalCheckExpired
    })
  })
})