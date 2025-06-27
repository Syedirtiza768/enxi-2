import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { CustomerService } from '@/lib/services/customer.service'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { QuotationService } from '@/lib/services/quotation.service'
import { QuotationStatus } from "@prisma/client"
import { prisma } from '@/lib/db/prisma'

describe('Quotation API Integration', () => {
  let customerService: CustomerService
  let salesCaseService: SalesCaseService
  let quotationService: QuotationService
  let testUserId: string
  let testCustomerId: string
  let testSalesCaseId: string

  beforeEach(async () => {
    // Initialize services
    customerService = new CustomerService()
    salesCaseService = new SalesCaseService()
    quotationService = new QuotationService()
    
    // Clean up test data first
    await prisma.auditLog.deleteMany()
    await prisma.quotationItem.deleteMany()
    await prisma.quotation.deleteMany()
    await prisma.salesCase.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.account.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    
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

    // Create test customer (simplified without AR account)
    const testCustomer = await prisma.customer.create({
      data: {
        customerNumber: 'CUST-0001',
        name: 'Test Customer',
        email: 'customer@test.com',
        createdBy: testUserId
      }
    })
    testCustomerId = testCustomer.id

    // Create test sales case
    const testSalesCase = await prisma.salesCase.create({
      data: {
        caseNumber: 'CASE-0001',
        customerId: testCustomerId,
        title: 'Test Sales Case',
        description: 'Test description',
        estimatedValue: 50000,
        createdBy: testUserId
      }
    })
    testSalesCaseId = testSalesCase.id
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany()
    await prisma.quotationItem.deleteMany()
    await prisma.quotation.deleteMany()
    await prisma.salesCase.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.account.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Quotation Service Integration', () => {
    it('should create quotation with correct calculations', async () => {
      const quotationData = {
        salesCaseId: testSalesCaseId,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        paymentTerms: 'Net 30 days',
        deliveryTerms: 'FOB shipping point',
        notes: 'Test quotation notes',
        items: [
          {
            itemCode: 'SOFT-001',
            description: 'Software License',
            quantity: 1,
            unitPrice: 10000,
            discount: 5,
            taxRate: 10
          },
          {
            itemCode: 'CONS-001',
            description: 'Consulting Services',
            quantity: 40,
            unitPrice: 150,
            discount: 0,
            taxRate: 10
          }
        ],
        createdBy: testUserId
      }

      const quotation = await quotationService.createQuotation(quotationData)

      expect(quotation).toBeDefined()
      expect(quotation.quotationNumber).toMatch(/^QUOT-\d{4}$/)
      expect(quotation.version).toBe(1)
      expect(quotation.status).toBe(QuotationStatus.DRAFT)
      expect(quotation.salesCaseId).toBe(testSalesCaseId)
      expect(quotation.items).toHaveLength(2)

      // Check calculated totals
      // Item 1: 10000 * 1 = 10000, discount = 500, after discount = 9500, tax = 950, total = 10450
      // Item 2: 150 * 40 = 6000, discount = 0, after discount = 6000, tax = 600, total = 6600
      // Grand total: 10450 + 6600 = 17050
      expect(quotation.subtotal).toBe(16000) // 10000 + 6000
      expect(quotation.discountAmount).toBe(500) // 500 + 0
      expect(quotation.taxAmount).toBe(1550) // 950 + 600
      expect(quotation.totalAmount).toBe(17050) // 16000 - 500 + 1550

      // Verify items calculations
      const softwareItem = quotation.items.find(item => item.itemCode === 'SOFT-001')
      expect(softwareItem?.subtotal).toBe(10000)
      expect(softwareItem?.discountAmount).toBe(500)
      expect(softwareItem?.taxAmount).toBe(950)
      expect(softwareItem?.totalAmount).toBe(10450)

      const consultingItem = quotation.items.find(item => item.itemCode === 'CONS-001')
      expect(consultingItem?.subtotal).toBe(6000)
      expect(consultingItem?.discountAmount).toBe(0)
      expect(consultingItem?.taxAmount).toBe(600)
      expect(consultingItem?.totalAmount).toBe(6600)
    })

    it('should handle quotation status workflow', async () => {
      // Create quotation
      const quotationData = {
        salesCaseId: testSalesCaseId,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemCode: 'TEST-001',
            description: 'Test Item',
            quantity: 1,
            unitPrice: 1000
          }
        ],
        createdBy: testUserId
      }

      const quotation = await quotationService.createQuotation(quotationData)
      expect(quotation.status).toBe(QuotationStatus.DRAFT)

      // Send quotation
      const sentQuotation = await quotationService.sendQuotation(quotation.id, testUserId)
      expect(sentQuotation.status).toBe(QuotationStatus.SENT)

      // Accept quotation
      const acceptedQuotation = await quotationService.acceptQuotation(quotation.id, testUserId)
      expect(acceptedQuotation.status).toBe(QuotationStatus.ACCEPTED)

      // Verify sales case was updated
      const updatedSalesCase = await prisma.salesCase.findUnique({ 
        where: { id: testSalesCaseId } 
      })
      expect(updatedSalesCase?.status).toBe('IN_PROGRESS')
      expect(updatedSalesCase?.actualValue).toBe(1000)
    })

    it('should create quotation versions correctly', async () => {
      // Create initial quotation
      const quotationData = {
        salesCaseId: testSalesCaseId,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: 'Original quotation',
        items: [
          {
            itemCode: 'ORIG-001',
            description: 'Original Item',
            quantity: 1,
            unitPrice: 5000
          }
        ],
        createdBy: testUserId
      }

      const originalQuotation = await quotationService.createQuotation(quotationData)
      expect(originalQuotation.version).toBe(1)
      expect(originalQuotation.quotationNumber).toBe('QUOT-0001')

      // Create new version
      const updateData = {
        notes: 'Updated quotation',
        items: [
          {
            itemCode: 'NEW-001',
            description: 'Updated Item',
            quantity: 2,
            unitPrice: 7500,
            discount: 10
          }
        ],
        createdBy: testUserId
      }

      const newVersion = await quotationService.createNewVersion(originalQuotation.id, updateData)
      expect(newVersion.version).toBe(2)
      expect(newVersion.quotationNumber).toBe('QUOT-0001-v2')
      expect(newVersion.notes).toBe('Updated quotation')
      expect(newVersion.items).toHaveLength(1)
      expect(newVersion.items[0].description).toBe('Updated Item')

      // Get all versions for the sales case
      const versions = await quotationService.getQuotationVersions(testSalesCaseId)
      expect(versions).toHaveLength(2)
      expect(versions.some(q => q.version === 1)).toBe(true)
      expect(versions.some(q => q.version === 2)).toBe(true)
    })

    it('should filter and query quotations correctly', async () => {
      // Create a second sales case for testing multiple quotations
      const testSalesCase2 = await prisma.salesCase.create({
        data: {
          caseNumber: 'CASE-0002',
          customerId: testCustomerId,
          title: 'Test Sales Case 2',
          description: 'Test description 2',
          estimatedValue: 30000,
          createdBy: testUserId
        }
      })

      // Create multiple quotations
      const quotation1Data = {
        salesCaseId: testSalesCaseId,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: 'First quotation',
        items: [
          {
            itemCode: 'TEST-001',
            description: 'Test Item 1',
            quantity: 1,
            unitPrice: 1000
          }
        ],
        createdBy: testUserId
      }

      const quotation2Data = {
        salesCaseId: testSalesCase2.id,
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        notes: 'Second quotation',
        items: [
          {
            itemCode: 'TEST-002',
            description: 'Test Item 2',
            quantity: 2,
            unitPrice: 2000
          }
        ],
        createdBy: testUserId
      }

      const quotation1 = await quotationService.createQuotation(quotation1Data)
      const quotation2 = await quotationService.createQuotation(quotation2Data)

      // Send one of them
      await quotationService.sendQuotation(quotation2.id, testUserId)

      // Test queries
      const allQuotations = await quotationService.getAllQuotations()
      expect(allQuotations).toHaveLength(2)

      const draftQuotations = await quotationService.getAllQuotations({ status: QuotationStatus.DRAFT })
      expect(draftQuotations).toHaveLength(1)
      expect(draftQuotations[0].id).toBe(quotation1.id)

      const sentQuotations = await quotationService.getAllQuotations({ status: QuotationStatus.SENT })
      expect(sentQuotations).toHaveLength(1)
      expect(sentQuotations[0].id).toBe(quotation2.id)

      const searchResults = await quotationService.getAllQuotations({ search: 'First' })
      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].notes).toContain('First')

      // Test get by ID and number
      const quotationById = await quotationService.getQuotation(quotation1.id)
      expect(quotationById?.id).toBe(quotation1.id)

      const quotationByNumber = await quotationService.getQuotationByNumber(quotation1.quotationNumber)
      expect(quotationByNumber?.id).toBe(quotation1.id)
    })

    it('should handle expired quotations', async () => {
      // Create quotation with past valid until date
      const expiredQuotationData = {
        salesCaseId: testSalesCaseId,
        validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        items: [
          {
            itemCode: 'EXP-001',
            description: 'Expired Item',
            quantity: 1,
            unitPrice: 1000
          }
        ],
        createdBy: testUserId
      }

      const quotation = await quotationService.createQuotation(expiredQuotationData)
      await quotationService.sendQuotation(quotation.id, testUserId)

      // Try to accept expired quotation
      await expect(
        quotationService.acceptQuotation(quotation.id, testUserId)
      ).rejects.toThrow('Quotation has expired')

      // Run the expired quotations check
      await quotationService.checkExpiredQuotations()

      // Verify quotation is now marked as expired
      const updatedQuotation = await quotationService.getQuotation(quotation.id)
      expect(updatedQuotation?.status).toBe(QuotationStatus.EXPIRED)
    })

    it('should prevent invalid operations', async () => {
      const quotationData = {
        salesCaseId: testSalesCaseId,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemCode: 'TEST-001',
            description: 'Test Item',
            quantity: 1,
            unitPrice: 1000
          }
        ],
        createdBy: testUserId
      }

      const quotation = await quotationService.createQuotation(quotationData)

      // Try to accept a draft quotation (should fail)
      await expect(
        quotationService.acceptQuotation(quotation.id, testUserId)
      ).rejects.toThrow('Only sent quotations can be accepted')

      // Try to reject a draft quotation (should fail)
      await expect(
        quotationService.rejectQuotation(quotation.id, testUserId)
      ).rejects.toThrow('Only sent quotations can be rejected')

      // Send and accept quotation
      await quotationService.sendQuotation(quotation.id, testUserId)
      await quotationService.acceptQuotation(quotation.id, testUserId)

      // Try to cancel accepted quotation (should fail)
      await expect(
        quotationService.cancelQuotation(quotation.id, testUserId)
      ).rejects.toThrow('Cannot cancel accepted quotations')

      // Test non-existent quotation
      await expect(
        quotationService.getQuotation('non-existent-id')
      ).resolves.toBeNull()

      await expect(
        quotationService.createNewVersion('non-existent-id', { createdBy: testUserId })
      ).rejects.toThrow('Quotation not found')
    })
  })
})