import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { QuotationService } from '@/lib/services/quotation.service'
import { CustomerService } from '@/lib/services/customer.service'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { QuotationStatus, SalesCaseStatus } from "@prisma/client"
import { prisma } from '@/lib/db/prisma'

describe('Quotation Service', () => {
  let service: QuotationService
  let customerService: CustomerService
  let salesCaseService: SalesCaseService
  let testUserId: string
  let testCustomerId: string
  let testSalesCaseId: string

  beforeEach(async () => {
    service = new QuotationService()
    customerService = new CustomerService()
    salesCaseService = new SalesCaseService()
    
    // Create a test user with unique identifier
    const timestamp = Date.now()
    const testUser = await prisma.user.create({
      data: {
        username: `testuser_quotation_${timestamp}`,
        email: `test_quotation_${timestamp}@example.com`,
        password: 'hashedPassword',
        role: 'USER'
      }
    })
    testUserId = testUser.id

    // Create a test customer
    const testCustomer = await customerService.createCustomer({
      name: 'Test Customer',
      email: 'customer@test.com',
      createdBy: testUserId
    })
    testCustomerId = testCustomer.id

    // Create a test sales case
    const testSalesCase = await salesCaseService.createSalesCase({
      customerId: testCustomerId,
      title: 'Test Sales Case',
      description: 'Test description',
      estimatedValue: 50000,
      createdBy: testUserId
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

  describe('Quotation Creation', () => {
    it('should create a new quotation with items', async () => {
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

      const quotation = await service.createQuotation(quotationData)

      expect(quotation).toBeDefined()
      expect(quotation.quotationNumber).toMatch(/^QUOT-\d{4}$/)
      expect(quotation.version).toBe(1)
      expect(quotation.status).toBe(QuotationStatus.DRAFT)
      expect(quotation.salesCaseId).toBe(testSalesCaseId)
      expect(quotation.validUntil).toEqual(quotationData.validUntil)
      expect(quotation.paymentTerms).toBe('Net 30 days')
      expect(quotation.deliveryTerms).toBe('FOB shipping point')
      expect(quotation.notes).toBe('Test quotation notes')
      expect(quotation.items).toHaveLength(2)
      expect(quotation.salesCase).toBeDefined()
      expect(quotation.salesCase.customer).toBeDefined()

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

    it('should generate sequential quotation numbers', async () => {
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

      const quotation1 = await service.createQuotation(quotationData)
      const quotation2 = await service.createQuotation(quotationData)

      expect(quotation1.quotationNumber).toBe('QUOT-0001')
      expect(quotation2.quotationNumber).toBe('QUOT-0002')
    })

    it('should prevent creating quotation for non-open sales case', async () => {
      // Close the sales case
      await salesCaseService.closeSalesCase(
        testSalesCaseId,
        SalesCaseStatus.WON,
        40000,
        25000,
        testUserId
      )

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

      await expect(service.createQuotation(quotationData))
        .rejects.toThrow('Can only create quotations for open sales cases')
    })

    it('should handle non-existent sales case', async () => {
      const quotationData = {
        salesCaseId: 'non-existent-id',
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

      await expect(service.createQuotation(quotationData))
        .rejects.toThrow('Sales case not found')
    })
  })

  describe('Quotation Versioning', () => {
    let quotationId: string

    beforeEach(async () => {
      const quotationData = {
        salesCaseId: testSalesCaseId,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentTerms: 'Net 30 days',
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

      const quotation = await service.createQuotation(quotationData)
      quotationId = quotation.id
    })

    it('should create new version with updated data', async () => {
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

      const newVersion = await service.createNewVersion(quotationId, updateData)

      expect(newVersion.version).toBe(2)
      expect(newVersion.quotationNumber).toMatch(/^QUOT-\d{4}-v2$/)
      expect(newVersion.status).toBe(QuotationStatus.DRAFT)
      expect(newVersion.notes).toBe('Updated quotation')
      expect(newVersion.items).toHaveLength(1)
      expect(newVersion.items[0].description).toBe('Updated Item')
      expect(newVersion.items[0].quantity).toBe(2)
      expect(newVersion.totalAmount).toBe(14850) // (7500 * 2 * 0.9) = 13500, no tax = 13500
    })

    it('should use existing items if not provided', async () => {
      const updateData = {
        notes: 'Updated notes only',
        createdBy: testUserId
      }

      const newVersion = await service.createNewVersion(quotationId, updateData)

      expect(newVersion.version).toBe(2)
      expect(newVersion.notes).toBe('Updated notes only')
      expect(newVersion.items).toHaveLength(1)
      expect(newVersion.items[0].itemCode).toBe('ORIG-001')
      expect(newVersion.items[0].description).toBe('Original Item')
    })

    it('should handle non-existent quotation', async () => {
      await expect(
        service.createNewVersion('non-existent-id', { createdBy: testUserId })
      ).rejects.toThrow('Quotation not found')
    })
  })

  describe('Quotation Status Management', () => {
    let quotationId: string

    beforeEach(async () => {
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

      const quotation = await service.createQuotation(quotationData)
      quotationId = quotation.id
    })

    it('should send quotation (DRAFT -> SENT)', async () => {
      const sentQuotation = await service.sendQuotation(quotationId, testUserId)

      expect(sentQuotation.status).toBe(QuotationStatus.SENT)
    })

    it('should accept sent quotation', async () => {
      await service.sendQuotation(quotationId, testUserId)
      const acceptedQuotation = await service.acceptQuotation(quotationId, testUserId)

      expect(acceptedQuotation.status).toBe(QuotationStatus.ACCEPTED)

      // Check that sales case was updated
      const salesCase = await salesCaseService.getSalesCase(testSalesCaseId)
      expect(salesCase?.status).toBe(SalesCaseStatus.NEGOTIATING)
      expect(salesCase?.actualValue).toBe(1000)
    })

    it('should reject sent quotation', async () => {
      await service.sendQuotation(quotationId, testUserId)
      const rejectedQuotation = await service.rejectQuotation(quotationId, testUserId)

      expect(rejectedQuotation.status).toBe(QuotationStatus.REJECTED)
    })

    it('should cancel quotation', async () => {
      const cancelledQuotation = await service.cancelQuotation(quotationId, testUserId)

      expect(cancelledQuotation.status).toBe(QuotationStatus.CANCELLED)
    })

    it('should prevent invalid status transitions', async () => {
      // Try to accept a draft quotation (should fail)
      await expect(
        service.acceptQuotation(quotationId, testUserId)
      ).rejects.toThrow('Only sent quotations can be accepted')

      // Try to reject a draft quotation (should fail)
      await expect(
        service.rejectQuotation(quotationId, testUserId)
      ).rejects.toThrow('Only sent quotations can be rejected')

      // Send quotation then accept it
      await service.sendQuotation(quotationId, testUserId)
      await service.acceptQuotation(quotationId, testUserId)

      // Try to cancel accepted quotation (should fail)
      await expect(
        service.cancelQuotation(quotationId, testUserId)
      ).rejects.toThrow('Cannot cancel accepted quotations')
    })

    it('should check quotation validity before acceptance', async () => {
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

      const expiredQuotation = await service.createQuotation(expiredQuotationData)
      await service.sendQuotation(expiredQuotation.id, testUserId)

      await expect(
        service.acceptQuotation(expiredQuotation.id, testUserId)
      ).rejects.toThrow('Quotation has expired')
    })
  })

  describe('Quotation Queries', () => {
    beforeEach(async () => {
      // Create multiple quotations for testing
      const quotationData1 = {
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

      const quotationData2 = {
        salesCaseId: testSalesCaseId,
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

      const quotation1 = await service.createQuotation(quotationData1)
      const quotation2 = await service.createQuotation(quotationData2)

      // Send one of them
      await service.sendQuotation(quotation2.id, testUserId)
    })

    it('should get quotation by ID', async () => {
      const quotations = await service.getAllQuotations()
      const quotationId = quotations[0].id

      const quotation = await service.getQuotation(quotationId)

      expect(quotation).toBeDefined()
      expect(quotation?.id).toBe(quotationId)
      expect(quotation?.items).toBeDefined()
      expect(quotation?.salesCase).toBeDefined()
    })

    it('should get quotation by number', async () => {
      const quotations = await service.getAllQuotations()
      const quotationNumber = quotations[0].quotationNumber

      const quotation = await service.getQuotationByNumber(quotationNumber)

      expect(quotation).toBeDefined()
      expect(quotation?.quotationNumber).toBe(quotationNumber)
    })

    it('should get all quotations', async () => {
      const quotations = await service.getAllQuotations()

      expect(quotations).toHaveLength(2)
      expect(quotations.every(q => q.salesCaseId === testSalesCaseId)).toBe(true)
    })

    it('should filter quotations by status', async () => {
      const draftQuotations = await service.getAllQuotations({ status: QuotationStatus.DRAFT })
      const sentQuotations = await service.getAllQuotations({ status: QuotationStatus.SENT })

      expect(draftQuotations).toHaveLength(1)
      expect(sentQuotations).toHaveLength(1)
      expect(draftQuotations[0].status).toBe(QuotationStatus.DRAFT)
      expect(sentQuotations[0].status).toBe(QuotationStatus.SENT)
    })

    it('should filter quotations by sales case', async () => {
      const quotations = await service.getAllQuotations({ salesCaseId: testSalesCaseId })

      expect(quotations).toHaveLength(2)
      expect(quotations.every(q => q.salesCaseId === testSalesCaseId)).toBe(true)
    })

    it('should filter quotations by customer', async () => {
      const quotations = await service.getAllQuotations({ customerId: testCustomerId })

      expect(quotations).toHaveLength(2)
      expect(quotations.every(q => q.salesCase.customer.id === testCustomerId)).toBe(true)
    })

    it('should search quotations by number and notes', async () => {
      const searchResults = await service.getAllQuotations({ search: 'First' })

      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].notes).toContain('First')
    })

    it('should paginate results', async () => {
      const page1 = await service.getAllQuotations({ limit: 1, offset: 0 })
      const page2 = await service.getAllQuotations({ limit: 1, offset: 1 })

      expect(page1).toHaveLength(1)
      expect(page2).toHaveLength(1)
      expect(page1[0].id).not.toBe(page2[0].id)
    })

    it('should get quotation versions for sales case', async () => {
      const versions = await service.getQuotationVersions(testSalesCaseId)

      expect(versions).toHaveLength(2)
      expect(versions.every(q => q.salesCaseId === testSalesCaseId)).toBe(true)
    })
  })

  describe('Expired Quotations Check', () => {
    it('should mark expired quotations', async () => {
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

      const quotation = await service.createQuotation(expiredQuotationData)
      await service.sendQuotation(quotation.id, testUserId)

      // Run the expired quotations check
      await service.checkExpiredQuotations()

      // Verify quotation is now marked as expired
      const updatedQuotation = await service.getQuotation(quotation.id)
      expect(updatedQuotation?.status).toBe(QuotationStatus.EXPIRED)
    })

    it('should not affect non-sent quotations', async () => {
      // Create expired draft quotation
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

      const quotation = await service.createQuotation(expiredQuotationData)
      // Don't send it - leave as draft

      // Run the expired quotations check
      await service.checkExpiredQuotations()

      // Verify quotation is still draft (only sent quotations can expire)
      const updatedQuotation = await service.getQuotation(quotation.id)
      expect(updatedQuotation?.status).toBe(QuotationStatus.DRAFT)
    })
  })
})