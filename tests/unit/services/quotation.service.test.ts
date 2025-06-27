/**
 * Unit tests for QuotationService
 * Tests business logic without database calls
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { QuotationService } from '@/lib/services/quotation.service'
import { QuotationStatus, Prisma } from "@prisma/client"
import { prismaMock, setupCommonMocks } from '@/tests/helpers/mock-prisma'
import { testFactory } from '@/tests/helpers/test-utils'

describe('QuotationService', () => {
  let service: QuotationService
  const testUserId = 'test-user-id'
  const testSalesCaseId = 'test-sales-case-id'

  beforeEach(() => {
    setupCommonMocks()
    service = new QuotationService()
  })

  describe('createQuotation', () => {
    it('should create a quotation with calculated totals', async () => {
      const input = {
        salesCaseId: testSalesCaseId,
        validUntil: new Date('2024-12-31'),
        items: [
          {
            itemCode: 'ITEM-001',
            description: 'Test Item',
            quantity: 10,
            unitPrice: 100,
            discount: 10, // 10%
            taxRate: 15, // 15%
          },
        ],
        paymentTerms: 'Net 30',
        deliveryTerms: 'FOB',
        createdBy: testUserId,
      }

      const expectedQuotation = {
        id: 'test-quotation-id',
        quotationNumber: 'QUOT-2024-0001',
        salesCaseId: testSalesCaseId,
        version: 1,
        status: QuotationStatus.DRAFT,
        validUntil: input.validUntil,
        paymentTerms: input.paymentTerms,
        deliveryTerms: input.deliveryTerms,
        subtotal: 1000, // 10 * 100
        discountAmount: 100, // 10% of 1000
        taxAmount: 135, // 15% of 900
        totalAmount: 1035, // 900 + 135
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: null,
        internalNotes: null,
      }

      // Mock the count for quotation number generation
      prismaMock.quotation.count.mockResolvedValue(0)

      // Mock the create call
      prismaMock.quotation.create.mockResolvedValue(expectedQuotation)

      const result = await service.createQuotation(input)

      expect(result).toEqual(expectedQuotation)
      expect(prismaMock.quotation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          quotationNumber: expect.stringContaining('QUOT-'),
          salesCaseId: testSalesCaseId,
          status: QuotationStatus.DRAFT,
          subtotal: 1000,
          discountAmount: 100,
          taxAmount: 135,
          totalAmount: 1035,
        }),
      })
    })

    it('should handle multiple items with different tax rates', async () => {
      const input = {
        salesCaseId: testSalesCaseId,
        validUntil: new Date('2024-12-31'),
        items: [
          {
            itemCode: 'ITEM-001',
            description: 'Item 1',
            quantity: 5,
            unitPrice: 200,
            discount: 0,
            taxRate: 10,
          },
          {
            itemCode: 'ITEM-002',
            description: 'Item 2',
            quantity: 3,
            unitPrice: 300,
            discount: 15,
            taxRate: 5,
          },
        ],
        createdBy: testUserId,
      }

      prismaMock.quotation.count.mockResolvedValue(5)
      prismaMock.quotation.create.mockResolvedValue({} as any)

      await service.createQuotation(input)

      expect(prismaMock.quotation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          subtotal: 1900, // (5*200) + (3*300)
          discountAmount: 135, // 0 + (15% of 900)
          taxAmount: 138.25, // (10% of 1000) + (5% of 765)
          totalAmount: 1903.25, // 1765 + 138.25
        }),
      })
    })
  })

  describe('updateQuotation', () => {
    it('should update quotation and increment version on status change', async () => {
      const quotationId = 'test-quotation-id'
      const existingQuotation = {
        id: quotationId,
        version: 1,
        status: QuotationStatus.DRAFT,
        quotationNumber: 'QUOT-2024-0001',
        salesCaseId: testSalesCaseId,
      }

      const updateData = {
        status: QuotationStatus.SENT,
        updatedBy: testUserId,
      }

      prismaMock.quotation.findUnique.mockResolvedValue(existingQuotation as any)
      prismaMock.quotation.update.mockResolvedValue({
        ...existingQuotation,
        ...updateData,
        version: 2,
      } as any)

      const result = await service.updateQuotation(quotationId, updateData)

      expect(prismaMock.quotation.update).toHaveBeenCalledWith({
        where: { id: quotationId },
        data: expect.objectContaining({
          status: QuotationStatus.SENT,
          version: 2,
        }),
      })
    })

    it('should not increment version on non-status updates', async () => {
      const quotationId = 'test-quotation-id'
      const existingQuotation = {
        id: quotationId,
        version: 1,
        status: QuotationStatus.DRAFT,
      }

      const updateData = {
        paymentTerms: 'Net 60',
        updatedBy: testUserId,
      }

      prismaMock.quotation.findUnique.mockResolvedValue(existingQuotation as any)
      prismaMock.quotation.update.mockResolvedValue({
        ...existingQuotation,
        ...updateData,
      } as any)

      await service.updateQuotation(quotationId, updateData)

      expect(prismaMock.quotation.update).toHaveBeenCalledWith({
        where: { id: quotationId },
        data: expect.not.objectContaining({
          version: expect.any(Number),
        }),
      })
    })
  })

  describe('getQuotationWithDetails', () => {
    it('should return quotation with all relations', async () => {
      const quotationId = 'test-quotation-id'
      const mockQuotation = {
        id: quotationId,
        items: [
          { id: 'item-1', itemCode: 'ITEM-001' },
          { id: 'item-2', itemCode: 'ITEM-002' },
        ],
        salesCase: {
          id: testSalesCaseId,
          customer: { id: 'customer-id', name: 'Test Customer' },
        },
      }

      prismaMock.quotation.findUnique.mockResolvedValue(mockQuotation as any)

      const result = await service.getQuotationWithDetails(quotationId)

      expect(prismaMock.quotation.findUnique).toHaveBeenCalledWith({
        where: { id: quotationId },
        include: {
          items: { orderBy: { sortOrder: 'asc' } },
          salesCase: { include: { customer: true } },
          salesOrders: true,
        },
      })
      expect(result).toEqual(mockQuotation)
    })
  })

  describe('quotation number generation', () => {
    it('should generate sequential quotation numbers', async () => {
      // Test multiple calls to ensure sequential generation
      const counts = [0, 1, 2, 3]
      
      for (const count of counts) {
        prismaMock.quotation.count.mockResolvedValueOnce(count)
        prismaMock.quotation.create.mockResolvedValueOnce({
          id: `quotation-${count}`,
          quotationNumber: `QUOT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
        } as any)

        await service.createQuotation({
          salesCaseId: testSalesCaseId,
          validUntil: new Date(),
          items: [],
          createdBy: testUserId,
        })
      }

      // Verify all quotation numbers are unique and sequential
      const calls = prismaMock.quotation.create.mock.calls
      const quotationNumbers = calls.map(call => call[0].data.quotationNumber)
      
      expect(new Set(quotationNumbers).size).toBe(quotationNumbers.length)
      expect(quotationNumbers).toEqual([
        expect.stringContaining('-0001'),
        expect.stringContaining('-0002'),
        expect.stringContaining('-0003'),
        expect.stringContaining('-0004')])
    })
  })
})