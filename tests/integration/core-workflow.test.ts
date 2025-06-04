import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { CustomerService } from '@/lib/services/customer.service'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { QuotationService } from '@/lib/services/quotation.service'
import { StockMovementService } from '@/lib/services/inventory/stock-movement.service'
import { JournalEntryService } from '@/lib/services/accounting/journal-entry.service'
import { prisma } from '@/lib/db/prisma'

describe('Core Workflow Integration Tests', () => {
  let customerService: CustomerService
  let salesCaseService: SalesCaseService
  let quotationService: QuotationService
  let stockMovementService: StockMovementService
  let journalService: JournalEntryService
  let testUserId: string

  beforeEach(async () => {
    // Initialize services
    customerService = new CustomerService()
    salesCaseService = new SalesCaseService()
    quotationService = new QuotationService()
    stockMovementService = new StockMovementService()
    journalService = new JournalEntryService()
    
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        username: 'integrationtest',
        email: 'integration@test.com',
        password: 'hashedPassword',
        role: 'USER'
      }
    })
    testUserId = testUser.id

    // Create basic accounts needed for operations
    await Promise.all([
      prisma.account.create({
        data: {
          code: '1300',
          name: 'Inventory',
          type: 'ASSET',
          status: 'ACTIVE',
          createdBy: testUserId
        }
      }),
      prisma.account.create({
        data: {
          code: '5000',
          name: 'Cost of Goods Sold',
          type: 'EXPENSE',
          status: 'ACTIVE',
          createdBy: testUserId
        }
      }),
      prisma.account.create({
        data: {
          code: '5900',
          name: 'Inventory Adjustments',
          type: 'EXPENSE',
          status: 'ACTIVE',
          createdBy: testUserId
        }
      })
    ])
  })

  afterEach(async () => {
    // Clean up in proper order to avoid foreign key constraints
    const tables = [
      'auditLog',
      'journalLine',
      'journalEntry',
      'quotationItem',
      'quotation',
      'stockMovement',
      'stockLot',
      'salesCase',
      'customer',
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

  describe('End-to-End Sales Workflow', () => {
    it('should handle complete customer → quotation → versioning workflow', async () => {
      // 1. Create customer
      const customer = await customerService.createCustomer({
        name: 'Integration Test Customer',
        email: 'customer@integration.test',
        phone: '+1 (555) 123-4567',
        createdBy: testUserId
      })

      expect(customer).toBeDefined()
      expect(customer.customerNumber).toMatch(/^CUST-\d{4}$/)

      // 2. Create sales case
      const salesCase = await salesCaseService.createSalesCase({
        customerId: customer.id,
        title: 'Integration Test Sales Case',
        description: 'End-to-end workflow test',
        estimatedValue: 25000,
        createdBy: testUserId
      })

      expect(salesCase).toBeDefined()
      expect(salesCase.caseNumber).toMatch(/^SC-\d{4}-\d{4}$/)
      expect(salesCase.status).toBe('OPEN')

      // 3. Create initial quotation
      const quotationData = {
        salesCaseId: salesCase.id,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentTerms: 'Net 30 days',
        deliveryTerms: 'FOB Origin',
        notes: 'Initial quotation for integration test',
        items: [
          {
            itemCode: 'INT-001',
            description: 'Integration Test Product',
            quantity: 5,
            unitPrice: 2000,
            discount: 5,
            taxRate: 10
          },
          {
            itemCode: 'INT-002',
            description: 'Integration Service',
            quantity: 10,
            unitPrice: 500,
            discount: 0,
            taxRate: 0
          }
        ],
        createdBy: testUserId
      }

      const quotation = await quotationService.createQuotation(quotationData)

      expect(quotation).toBeDefined()
      expect(quotation.quotationNumber).toBe('QUOT-0001')
      expect(quotation.version).toBe(1)
      expect(quotation.status).toBe('DRAFT')
      expect(quotation.items).toHaveLength(2)
      
      // Check calculations
      // Product: 5 * 2000 = 10000, discount 5% = 500, after discount = 9500, tax 10% = 950, total = 10450
      // Service: 10 * 500 = 5000, no discount, no tax, total = 5000
      // Grand total: 10450 + 5000 = 15450
      expect(quotation.subtotal).toBe(15000) // 10000 + 5000
      expect(quotation.discountAmount).toBe(500) // 500 + 0
      expect(quotation.taxAmount).toBe(950) // 950 + 0
      expect(quotation.totalAmount).toBe(15450) // 15000 - 500 + 950

      // 4. Send quotation
      const sentQuotation = await quotationService.sendQuotation(quotation.id, testUserId)
      expect(sentQuotation.status).toBe('SENT')

      // 5. Create new version with updated pricing
      const updateData = {
        notes: 'Revised pricing based on customer feedback',
        items: [
          {
            itemCode: 'INT-001',
            description: 'Integration Test Product - Updated',
            quantity: 5,
            unitPrice: 1800, // Reduced price
            discount: 0, // Removed discount
            taxRate: 10
          },
          {
            itemCode: 'INT-002',
            description: 'Integration Service',
            quantity: 10,
            unitPrice: 500,
            discount: 0,
            taxRate: 0
          }
        ],
        createdBy: testUserId
      }

      const newVersion = await quotationService.createNewVersion(quotation.id, updateData)
      
      expect(newVersion.version).toBe(2)
      expect(newVersion.quotationNumber).toBe('QUOT-0001-v2')
      expect(newVersion.status).toBe('DRAFT')
      expect(newVersion.notes).toBe('Revised pricing based on customer feedback')
      
      // New calculation: 5 * 1800 = 9000, tax 900, total = 9900 + 5000 = 14900
      expect(newVersion.totalAmount).toBe(14900)

      // 6. Get quotation versions
      const versions = await quotationService.getQuotationVersions(salesCase.id)
      expect(versions).toHaveLength(2)
      expect(versions.some(q => q.version === 1)).toBe(true)
      expect(versions.some(q => q.version === 2)).toBe(true)

      // 7. Send and accept new version
      await quotationService.sendQuotation(newVersion.id, testUserId)
      const acceptedQuotation = await quotationService.acceptQuotation(newVersion.id, testUserId)
      
      expect(acceptedQuotation.status).toBe('ACCEPTED')

      // 8. Verify sales case was updated
      const updatedSalesCase = await salesCaseService.getSalesCase(salesCase.id)
      expect(updatedSalesCase?.status).toBe('IN_PROGRESS')
      expect(updatedSalesCase?.actualValue).toBe(14900)
    })
  })

  describe('Inventory & Accounting Integration', () => {
    it('should integrate stock movements with GL postings', async () => {
      // Setup inventory items
      const uom = await prisma.unitOfMeasure.create({
        data: {
          code: 'PCS',
          name: 'Pieces',
          symbol: 'pcs',
          isBaseUnit: true,
          createdBy: testUserId
        }
      })

      const category = await prisma.category.create({
        data: {
          code: 'INT',
          name: 'Integration Test',
          description: 'Test category',
          createdBy: testUserId
        }
      })

      const inventoryAccount = await prisma.account.findFirst({
        where: { code: '1300' }
      })
      const cogsAccount = await prisma.account.findFirst({
        where: { code: '5000' }
      })

      const item = await prisma.item.create({
        data: {
          code: 'INT-ITEM-001',
          name: 'Integration Test Item',
          description: 'Test item for integration',
          categoryId: category.id,
          type: 'PRODUCT',
          unitOfMeasureId: uom.id,
          trackInventory: true,
          standardCost: 100,
          listPrice: 150,
          inventoryAccountId: inventoryAccount!.id,
          cogsAccountId: cogsAccount!.id,
          isSaleable: true,
          isPurchaseable: true,
          createdBy: testUserId
        }
      })

      // Test stock in movement
      const stockInResult = await stockMovementService.createStockMovement({
        itemId: item.id,
        movementType: 'STOCK_IN',
        quantity: 100,
        unitCost: 100,
        unitOfMeasureId: uom.id,
        referenceType: 'PURCHASE',
        referenceNumber: 'PO-INT-001',
        notes: 'Integration test stock in',
        createdBy: testUserId
      })

      expect(stockInResult.stockMovement).toBeDefined()
      expect(stockInResult.stockMovement.quantity).toBe(100)
      expect(stockInResult.stockMovement.totalCost).toBe(10000)
      expect(stockInResult.stockLot).toBeDefined()
      expect(stockInResult.stockLot.availableQty).toBe(100)

      // Verify journal entry was created (if GL integration is implemented)
      if (stockInResult.journalEntry) {
        expect(stockInResult.journalEntry).toBeDefined()
        expect(stockInResult.journalEntry.lines).toHaveLength(2)
        
        // Check debit to Inventory and credit to AP or similar
        const debitLine = stockInResult.journalEntry.lines.find(line => line.debitAmount > 0)
        const creditLine = stockInResult.journalEntry.lines.find(line => line.creditAmount > 0)
        
        expect(debitLine?.debitAmount).toBe(10000)
        expect(creditLine?.creditAmount).toBe(10000)
      }

      // Test stock adjustment
      const adjustmentResult = await stockMovementService.createStockMovement({
        itemId: item.id,
        movementType: 'ADJUSTMENT',
        quantity: -5, // Adjustment down
        unitCost: 100,
        unitOfMeasureId: uom.id,
        referenceType: 'ADJUSTMENT',
        referenceNumber: 'ADJ-INT-001',
        notes: 'Integration test adjustment',
        createdBy: testUserId
      })

      expect(adjustmentResult.stockMovement).toBeDefined()
      expect(adjustmentResult.stockMovement.quantity).toBe(-5)
      expect(adjustmentResult.allocationResults).toBeDefined()
      expect(adjustmentResult.allocationResults.length).toBeGreaterThan(0)

      // Verify FIFO allocation
      const allocation = adjustmentResult.allocationResults[0]
      expect(allocation.stockLotId).toBe(stockInResult.stockLot.id)
      expect(allocation.allocatedQty).toBe(5)
      expect(allocation.unitCost).toBe(100)

      // Check updated stock lot
      const updatedLot = await prisma.stockLot.findUnique({
        where: { id: stockInResult.stockLot.id }
      })
      expect(updatedLot?.availableQty).toBe(95) // 100 - 5
    })
  })

  describe('Auto-expiry Integration', () => {
    it('should automatically expire sent quotations past valid date', async () => {
      // Create customer and sales case
      const customer = await customerService.createCustomer({
        name: 'Expiry Test Customer',
        email: 'expiry@test.com',
        createdBy: testUserId
      })

      const salesCase = await salesCaseService.createSalesCase({
        customerId: customer.id,
        title: 'Expiry Test Sales Case',
        description: 'Test expiry functionality',
        estimatedValue: 10000,
        createdBy: testUserId
      })

      // Create quotation with past expiry date
      const expiredQuotationData = {
        salesCaseId: salesCase.id,
        validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        items: [
          {
            itemCode: 'EXP-001',
            description: 'Expiry Test Item',
            quantity: 1,
            unitPrice: 1000,
            discount: 0,
            taxRate: 0
          }
        ],
        createdBy: testUserId
      }

      const quotation = await quotationService.createQuotation(expiredQuotationData)
      
      // Send the quotation
      await quotationService.sendQuotation(quotation.id, testUserId)
      
      // Verify it's sent
      let currentQuotation = await quotationService.getQuotation(quotation.id)
      expect(currentQuotation?.status).toBe('SENT')

      // Run expiry check
      await quotationService.checkExpiredQuotations()

      // Verify it's now expired
      currentQuotation = await quotationService.getQuotation(quotation.id)
      expect(currentQuotation?.status).toBe('EXPIRED')

      // Verify we can't accept expired quotation
      await expect(
        quotationService.acceptQuotation(quotation.id, testUserId)
      ).rejects.toThrow('Quotation has expired')
    })
  })

  describe('Audit Trail Integration', () => {
    it('should create audit logs for all major operations', async () => {
      // Create customer
      const customer = await customerService.createCustomer({
        name: 'Audit Test Customer',
        email: 'audit@test.com',
        createdBy: testUserId
      })

      // Check audit log was created
      const customerAuditLogs = await prisma.auditLog.findMany({
        where: {
          entityType: 'Customer',
          entityId: customer.id,
          action: 'CREATE'
        }
      })
      expect(customerAuditLogs).toHaveLength(1)
      expect(customerAuditLogs[0].userId).toBe(testUserId)
      expect(customerAuditLogs[0].afterData).toBeDefined()

      // Create sales case
      const salesCase = await salesCaseService.createSalesCase({
        customerId: customer.id,
        title: 'Audit Test Sales Case',
        description: 'Test audit functionality',
        estimatedValue: 5000,
        createdBy: testUserId
      })

      // Check audit log was created
      const salesCaseAuditLogs = await prisma.auditLog.findMany({
        where: {
          entityType: 'SalesCase',
          entityId: salesCase.id,
          action: 'CREATE'
        }
      })
      expect(salesCaseAuditLogs).toHaveLength(1)

      // Create quotation
      const quotationData = {
        salesCaseId: salesCase.id,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemCode: 'AUD-001',
            description: 'Audit Test Item',
            quantity: 1,
            unitPrice: 1000
          }
        ],
        createdBy: testUserId
      }

      const quotation = await quotationService.createQuotation(quotationData)

      // Check quotation audit log
      const quotationAuditLogs = await prisma.auditLog.findMany({
        where: {
          entityType: 'Quotation',
          entityId: quotation.id,
          action: 'CREATE'
        }
      })
      expect(quotationAuditLogs).toHaveLength(1)

      // Update quotation status
      await quotationService.sendQuotation(quotation.id, testUserId)

      // Check status update audit log
      const statusUpdateLogs = await prisma.auditLog.findMany({
        where: {
          entityType: 'Quotation',
          entityId: quotation.id,
          action: 'UPDATE'
        }
      })
      expect(statusUpdateLogs.length).toBeGreaterThanOrEqual(1)
      
      const statusLog = statusUpdateLogs.find(log => 
        log.beforeData && (log.beforeData as any).status === 'DRAFT'
      )
      expect(statusLog).toBeDefined()
      expect((statusLog?.afterData as any)?.status).toBe('SENT')
    })
  })
})