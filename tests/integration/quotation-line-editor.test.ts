import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { prisma } from '@/lib/db/prisma'
import { QuotationService } from '@/lib/services/quotation.service'
import { ItemService } from '@/lib/services/inventory/item.service'
import { CustomerService } from '@/lib/services/customer.service'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import '@testing-library/jest-dom'

// Test for advanced quotation line editor with inventory integration
describe('Advanced Quotation Line Editor Integration', () => {
  let quotationService: QuotationService
  let itemService: ItemService
  let testUserId: string
  let testCustomerId: string
  let testSalesCaseId: string
  let testCategoryId: string
  let testInventoryItems: any[]

  beforeEach(async () => {
    quotationService = new QuotationService()
    itemService = new ItemService()
    const customerService = new CustomerService()
    const salesCaseService = new SalesCaseService()
    
    // Generate unique identifiers for this test run
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        username: `quotationtest${timestamp}`,
        email: `quotation${timestamp}@test.com`,
        password: 'hashedPassword',
        role: 'USER'
      }
    })
    testUserId = testUser.id

    // Create test customer directly to avoid transaction timeout
    const customer = await prisma.customer.create({
      data: {
        customerNumber: `CUST-${timestamp}`,
        name: `Test Customer Corp ${random}`,
        email: `customer${timestamp}${random}@testcorp.com`,
        phone: '+1-555-0123',
        address: '123 Business Ave, City, State 12345',
        currency: 'USD',
        creditLimit: 0,
        paymentTerms: 30,
        createdBy: testUserId
      }
    })
    testCustomerId = customer.id

    // Create test sales case directly
    const salesCase = await prisma.salesCase.create({
      data: {
        caseNumber: `SC-${timestamp}`,
        customerId: testCustomerId,
        title: 'Advanced Quotation Test Case',
        description: 'Testing advanced quotation line editor',
        estimatedValue: 50000,
        status: 'OPEN',
        assignedTo: testUserId,
        createdBy: testUserId
      }
    })
    testSalesCaseId = salesCase.id

    // Create test category and UOM
    const category = await prisma.category.create({
      data: {
        code: 'TECH',
        name: 'Technology Products',
        description: 'Technology and software products',
        isActive: true,
        createdBy: testUserId
      }
    })
    testCategoryId = category.id

    const defaultUOM = await prisma.unitOfMeasure.create({
      data: {
        code: 'EACH',
        name: 'Each',
        symbol: 'ea',
        isActive: true,
        isBaseUnit: true,
        conversionFactor: 1.0,
        createdBy: testUserId
      }
    })

    // Create comprehensive test inventory items
    testInventoryItems = await Promise.all([
      // Physical products
      prisma.item.create({
        data: {
          code: 'LAPTOP-PRO',
          name: 'Professional Laptop',
          description: 'High-performance business laptop with advanced features',
          categoryId: testCategoryId,
          unitOfMeasureId: defaultUOM.id,
          type: 'PRODUCT',
          listPrice: 2500.00,
          standardCost: 2000.00,
          reorderPoint: 5,
          trackInventory: true,
          isActive: true,
          createdBy: testUserId
        }
      }),
      
      // Services
      prisma.item.create({
        data: {
          code: 'SETUP-SVC',
          name: 'Professional Setup Service',
          description: 'Complete laptop setup and configuration service',
          categoryId: testCategoryId,
          unitOfMeasureId: defaultUOM.id,
          type: 'SERVICE',
          listPrice: 150.00,
          trackInventory: false,
          isActive: true,
          createdBy: testUserId
        }
      }),
      
      // Software/licenses
      prisma.item.create({
        data: {
          code: 'SW-LICENSE',
          name: 'Software License Annual',
          description: 'Annual software license subscription',
          categoryId: testCategoryId,
          unitOfMeasureId: defaultUOM.id,
          type: 'PRODUCT',
          listPrice: 500.00,
          standardCost: 400.00,
          trackInventory: false,
          isActive: true,
          createdBy: testUserId
        }
      })
    ])
  })

  afterEach(async () => {
    const tables = [
      'auditLog',
      'quotationItem',
      'quotation',
      'salesCase', 
      'customer',
      'stockMovement',
      'stockLot',
      'item',
      'category',
      'unitOfMeasure',
      'account',
      'user'
    ]
    
    for (const table of tables) {
      await (prisma as any)[table].deleteMany()
    }
  })

  describe('Quotation Line Editor Business Logic', () => {
    it('should create complex multi-line quotation with mixed item types', async () => {
      const quotationData = {
        salesCaseId: testSalesCaseId,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentTerms: 'Net 30 days',
        deliveryTerms: 'FOB Origin',
        notes: 'Complete technology solution package',
        items: [
          // Line 1: Multiple physical products
          {
            itemId: testInventoryItems[0].id,
            itemCode: testInventoryItems[0].code,
            description: 'Professional laptops for development team',
            quantity: 10,
            unitPrice: 2400.00, // Discounted from list price
            discount: 4, // 4% discount
            taxRate: 8.5
          },
          // Line 2: Service item
          {
            itemId: testInventoryItems[1].id,
            itemCode: testInventoryItems[1].code,
            description: 'Complete setup and configuration service per laptop',
            quantity: 10,
            unitPrice: 150.00,
            discount: 0,
            taxRate: 8.5
          },
          // Line 3: Software licenses
          {
            itemId: testInventoryItems[2].id,
            itemCode: testInventoryItems[2].code,
            description: 'Annual software licenses for development tools',
            quantity: 10,
            unitPrice: 480.00, // Volume discount
            discount: 4,
            taxRate: 8.5
          }
        ],
        createdBy: testUserId
      }

      const quotation = await quotationService.createQuotation(quotationData)

      // Verify quotation structure
      expect(quotation.items).toHaveLength(3)
      expect(quotation.subtotal).toBe(30300) // (2400*10) + (150*10) + (480*10) = 24000 + 1500 + 4800
      expect(quotation.discountAmount).toBe(1152) // (24000*0.04) + 0 + (4800*0.04) = 960 + 0 + 192
      expect(quotation.taxAmount).toBeCloseTo(2477.58, 2) // (29148 * 0.085)
      expect(quotation.totalAmount).toBeCloseTo(31625.58, 2) // 29148 + 2477.58

      // Verify item details integration
      const laptopLine = quotation.items.find(item => item.itemCode === 'LAPTOP-PRO')
      expect(laptopLine?.item?.name).toBe('Professional Laptop')
      expect(laptopLine?.item?.type).toBe('PRODUCT')
      expect(laptopLine?.item?.trackInventory).toBe(true)

      const serviceLine = quotation.items.find(item => item.itemCode === 'SETUP-SVC')
      expect(serviceLine?.item?.type).toBe('SERVICE')
      expect(serviceLine?.item?.trackInventory).toBe(false)
    })

    it('should handle line item calculations with complex pricing', async () => {
      const quotationData = {
        salesCaseId: testSalesCaseId,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentTerms: 'Net 30 days',
        items: [
          // Tiered pricing scenario
          {
            itemId: testInventoryItems[0].id,
            itemCode: testInventoryItems[0].code,
            description: 'Volume purchase with tiered discount',
            quantity: 25,
            unitPrice: 2300.00, // Higher volume = better price
            discount: 8, // Volume discount
            taxRate: 10
          }
        ],
        createdBy: testUserId
      }

      const quotation = await quotationService.createQuotation(quotationData)
      const line = quotation.items[0]

      // Verify complex calculations
      expect(line.subtotal).toBe(57500) // 25 * 2300
      expect(line.discountAmount).toBe(4600) // 57500 * 0.08
      expect(line.taxAmount).toBe(5290) // (57500 - 4600) * 0.10
      expect(line.totalAmount).toBe(58190) // 52900 + 5290
    })

    it('should validate business rules for quotation lines', async () => {
      // Test invalid item reference
      await expect(quotationService.createQuotation({
        salesCaseId: testSalesCaseId,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: 'non-existent-id',
          itemCode: 'INVALID',
          description: 'Invalid item',
          quantity: 1,
          unitPrice: 100.00,
          discount: 0,
          taxRate: 0
        }],
        createdBy: testUserId
      })).rejects.toThrow('Item not found')

      // Test negative quantities
      await expect(quotationService.createQuotation({
        salesCaseId: testSalesCaseId,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: testInventoryItems[0].id,
          itemCode: testInventoryItems[0].code,
          description: 'Negative quantity test',
          quantity: -5,
          unitPrice: 100.00,
          discount: 0,
          taxRate: 0
        }],
        createdBy: testUserId
      })).rejects.toThrow('Quantity must be positive')

      // Test excessive discount
      await expect(quotationService.createQuotation({
        salesCaseId: testSalesCaseId,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: testInventoryItems[0].id,
          itemCode: testInventoryItems[0].code,
          description: 'Excessive discount test',
          quantity: 1,
          unitPrice: 100.00,
          discount: 105, // > 100%
          taxRate: 0
        }],
        createdBy: testUserId
      })).rejects.toThrow('Discount cannot exceed 100%')
    })

    it('should support quotation versioning and updates', async () => {
      // Create initial quotation
      const initialQuotation = await quotationService.createQuotation({
        salesCaseId: testSalesCaseId,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: testInventoryItems[0].id,
          itemCode: testInventoryItems[0].code,
          description: 'Initial version',
          quantity: 5,
          unitPrice: 2500.00,
          discount: 0,
          taxRate: 8.5
        }],
        createdBy: testUserId
      })

      // Update quotation with additional lines
      const updatedQuotation = await quotationService.updateQuotation(
        initialQuotation.id,
        {
          items: [
            // Keep original line but modify
            {
              itemId: testInventoryItems[0].id,
              itemCode: testInventoryItems[0].code,
              description: 'Updated quantity and price',
              quantity: 8,
              unitPrice: 2400.00, // Better pricing
              discount: 2,
              taxRate: 8.5
            },
            // Add new service line
            {
              itemId: testInventoryItems[1].id,
              itemCode: testInventoryItems[1].code,
              description: 'Added setup service',
              quantity: 8,
              unitPrice: 150.00,
              discount: 0,
              taxRate: 8.5
            }
          ],
          updatedBy: testUserId
        }
      )

      expect(updatedQuotation.items).toHaveLength(2)
      expect(updatedQuotation.totalAmount).toBeGreaterThan(initialQuotation.totalAmount)
      
      // Verify version tracking
      expect(updatedQuotation.version).toBeGreaterThan(initialQuotation.version)
    })

    it('should generate different views for client vs internal', async () => {
      const quotation = await quotationService.createQuotation({
        salesCaseId: testSalesCaseId,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentTerms: 'Net 30 days',
        internalNotes: 'Cost basis: $2000 per unit, target margin: 20%',
        items: [{
          itemId: testInventoryItems[0].id,
          itemCode: testInventoryItems[0].code,
          description: 'Professional laptop solution',
          internalDescription: 'Model: XYZ-123, includes premium warranty',
          quantity: 10,
          unitPrice: 2400.00,
          cost: 2000.00, // Internal cost information
          discount: 0,
          taxRate: 8.5
        }],
        createdBy: testUserId
      })

      // Test client view (external)
      const clientView = await quotationService.getQuotationClientView(quotation.id)
      expect(clientView.internalNotes).toBeUndefined()
      expect(clientView.items[0].cost).toBeUndefined()
      expect(clientView.items[0].internalDescription).toBeUndefined()
      expect(clientView.items[0].description).toBe('Professional laptop solution')

      // Test internal view
      const internalView = await quotationService.getQuotationInternalView(quotation.id)
      expect(internalView.internalNotes).toBeDefined()
      expect(internalView.items[0].cost).toBe(2000.00)
      expect(internalView.items[0].internalDescription).toBeDefined()
      expect(internalView.items[0].margin).toBeCloseTo(16.67, 2) // (2400-2000)/2400*100
    })

    it('should handle inventory availability checks', async () => {
      // Create a fresh sales case for this test to avoid status conflicts
      const salesCase = await prisma.salesCase.create({
        data: {
          caseNumber: `SC-STOCK-${Date.now()}`,
          customerId: testCustomerId,
          title: 'Stock Availability Test Case',
          description: 'Testing inventory availability checks',
          estimatedValue: 25000,
          status: 'OPEN',
          assignedTo: testUserId,
          createdBy: testUserId
        }
      })

      // Create stock for testing - both movement and lot
      const uom = await prisma.unitOfMeasure.findFirst()
      
      await prisma.stockMovement.create({
        data: {
          movementNumber: 'OPENING-001',
          itemId: testInventoryItems[0].id,
          unitOfMeasureId: uom!.id,
          movementType: 'OPENING',
          quantity: 15, // Limited stock
          unitCost: 2000.00,
          totalCost: 30000.00,
          movementDate: new Date(),
          createdBy: testUserId
        }
      })

      // Create corresponding stock lot
      await prisma.stockLot.create({
        data: {
          lotNumber: 'LOT-001',
          itemId: testInventoryItems[0].id,
          receivedQty: 15,
          availableQty: 15,
          reservedQty: 0,
          unitCost: 2000.00,
          totalCost: 30000.00,
          receivedDate: new Date(),
          createdBy: testUserId
        }
      })

      // Test quotation within stock limits
      const quotationWithinStock = await quotationService.createQuotation({
        salesCaseId: salesCase.id,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: testInventoryItems[0].id,
          itemCode: testInventoryItems[0].code,
          description: 'Within stock limits',
          quantity: 10, // Within available stock
          unitPrice: 2400.00,
          discount: 0,
          taxRate: 8.5
        }],
        createdBy: testUserId
      })

      expect(quotationWithinStock.items[0].availabilityStatus).toBe('IN_STOCK')

      // Create second sales case for exceeding stock test (since first one will be IN_PROGRESS)
      const salesCase2 = await prisma.salesCase.create({
        data: {
          caseNumber: `SC-STOCK2-${Date.now()}`,
          customerId: testCustomerId,
          title: 'Stock Availability Test Case 2',
          description: 'Testing inventory availability checks - exceeding stock',
          estimatedValue: 50000,
          status: 'OPEN',
          assignedTo: testUserId,
          createdBy: testUserId
        }
      })

      // Test quotation exceeding stock
      const quotationExceedingStock = await quotationService.createQuotation({
        salesCaseId: salesCase2.id,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          itemId: testInventoryItems[0].id,
          itemCode: testInventoryItems[0].code,
          description: 'Exceeding stock limits',
          quantity: 20, // Exceeds available stock
          unitPrice: 2400.00,
          discount: 0,
          taxRate: 8.5
        }],
        createdBy: testUserId
      })

      expect(quotationExceedingStock.items[0].availabilityStatus).toBe('INSUFFICIENT_STOCK')
      expect(quotationExceedingStock.items[0].availableQuantity).toBe(15)
    })
  })

  describe('UI Component Requirements', () => {
    it('should define required quotation line editor components', () => {
      // Test that we need these advanced editor components
      expect(() => require('@/components/quotation/line-item-editor')).toThrow()
      expect(() => require('@/components/quotation/item-selector')).toThrow()
      expect(() => require('@/components/quotation/pricing-calculator')).toThrow()
      expect(() => require('@/components/quotation/quotation-views')).toThrow()
      expect(() => require('@/components/quotation/inventory-availability')).toThrow()
    })

    it('should require enhanced quotation pages', () => {
      // Test enhanced quotation management pages
      expect(() => require('@/app/(auth)/quotations/[id]/edit/page')).toThrow()
      expect(() => require('@/app/(auth)/quotations/[id]/client-view/page')).toThrow()
      expect(() => require('@/app/(auth)/quotations/[id]/internal-view/page')).toThrow()
    })
  })
})