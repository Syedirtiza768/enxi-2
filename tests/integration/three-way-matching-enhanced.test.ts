import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { PrismaClient } from '@/lib/generated/prisma'
import { ThreeWayMatchingService } from '@/lib/services/purchase/three-way-matching.service'

const prisma = new PrismaClient()
let threeWayMatchingService: ThreeWayMatchingService

describe('Enhanced Three-Way Matching Integration', () => {
  let testSupplier: any
  let testPurchaseOrder: any
  let testGoodsReceipt: any
  let testSupplierInvoice: any
  let testItems: any[]
  let testAccount: any
  let testUser: any

  beforeAll(async () => {
    threeWayMatchingService = new ThreeWayMatchingService()
    
    // Create test user
    testUser = await prisma.user.create({
      data: {
        username: 'threewaytest',
        email: 'threeway@test.com',
        password: 'hashedpassword',
        role: 'ACCOUNTANT'
      }
    })

    // Create test account
    testAccount = await prisma.account.create({
      data: {
        code: 'EXP001',
        name: 'Test Expense Account',
        type: 'EXPENSE',
        createdBy: testUser.id
      }
    })

    // Create test supplier
    testSupplier = await prisma.supplier.create({
      data: {
        name: 'Three-Way Test Supplier',
        code: 'TWS-001',
        supplierNumber: 'TWS-001',
        email: 'supplier@threeway.com',
        currency: 'USD',
        apAccountId: testAccount.id,
        createdBy: testUser.id
      }
    })

    // Create test items
    const category = await prisma.category.create({
      data: {
        name: 'Test Category',
        code: 'TC001',
        description: 'Test category for three-way matching',
        createdBy: testUser.id
      }
    })

    testItems = await Promise.all([
      prisma.item.create({
        data: {
          name: 'Test Item A',
          code: 'TIA-001',
          categoryId: category.id,
          unitOfMeasureId: 'ea',
          costPrice: 100.00,
          sellingPrice: 150.00,
          createdBy: testUser.id
        }
      }),
      prisma.item.create({
        data: {
          name: 'Test Item B',
          code: 'TIB-001',
          categoryId: category.id,
          unitOfMeasureId: 'ea',
          costPrice: 200.00,
          sellingPrice: 300.00,
          createdBy: testUser.id
        }
      })
    ])

    // Create test purchase order
    testPurchaseOrder = await prisma.purchaseOrder.create({
      data: {
        poNumber: 'PO-TWM-001',
        supplierId: testSupplier.id,
        status: 'CONFIRMED',
        orderDate: new Date('2024-01-01'),
        expectedDate: new Date('2024-01-15'),
        currency: 'USD',
        subtotal: 500.00,
        taxAmount: 50.00,
        totalAmount: 550.00,
        createdBy: testUser.id,
        items: {
          create: [
            {
              itemId: testItems[0].id,
              quantity: 3,
              unitPrice: 100.00,
              totalPrice: 300.00
            },
            {
              itemId: testItems[1].id,
              quantity: 1,
              unitPrice: 200.00,
              totalPrice: 200.00
            }
          ]
        }
      },
      include: { items: true }
    })

    // Create test goods receipt
    testGoodsReceipt = await prisma.goodsReceipt.create({
      data: {
        receiptNumber: 'GR-TWM-001',
        purchaseOrderId: testPurchaseOrder.id,
        supplierId: testSupplier.id,
        receivedDate: new Date('2024-01-10'),
        receivedBy: testUser.id,
        status: 'RECEIVED',
        totalReceived: 4,
        createdBy: testUser.id,
        items: {
          create: [
            {
              purchaseOrderItemId: testPurchaseOrder.items[0].id,
              itemId: testItems[0].id,
              quantityReceived: 2, // Partial receipt (ordered 3, received 2)
              quantityRejected: 0,
              unitCost: 100.00,
              totalCost: 200.00,
              qualityStatus: 'ACCEPTED'
            },
            {
              purchaseOrderItemId: testPurchaseOrder.items[1].id,
              itemId: testItems[1].id,
              quantityReceived: 1, // Full receipt (ordered 1, received 1)
              quantityRejected: 0,
              unitCost: 200.00,
              totalCost: 200.00,
              qualityStatus: 'ACCEPTED'
            }
          ]
        }
      },
      include: { items: true }
    })

    // Create test supplier invoice
    testSupplierInvoice = await prisma.supplierInvoice.create({
      data: {
        invoiceNumber: 'INV-TWM-001',
        supplierId: testSupplier.id,
        invoiceDate: new Date('2024-01-12'),
        dueDate: new Date('2024-02-12'),
        status: 'DRAFT',
        matchingStatus: 'PENDING',
        currency: 'USD',
        subtotal: 400.00,
        taxAmount: 40.00,
        totalAmount: 440.00,
        createdBy: testUser.id,
        items: {
          create: [
            {
              goodsReceiptItemId: testGoodsReceipt.items[0].id,
              description: 'Test Item A',
              quantity: 2, // Matches received quantity
              unitPrice: 100.00,
              totalAmount: 200.00,
              accountId: testAccount.id
            },
            {
              goodsReceiptItemId: testGoodsReceipt.items[1].id,
              description: 'Test Item B',
              quantity: 1, // Matches received quantity
              unitPrice: 200.00,
              totalAmount: 200.00,
              accountId: testAccount.id
            }
          ]
        }
      },
      include: { items: true }
    })
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.supplierInvoiceItem.deleteMany()
    await prisma.supplierInvoice.deleteMany()
    await prisma.goodsReceiptItem.deleteMany()
    await prisma.goodsReceipt.deleteMany()
    await prisma.purchaseOrderItem.deleteMany()
    await prisma.purchaseOrder.deleteMany()
    await prisma.item.deleteMany()
    await prisma.category.deleteMany()
    await prisma.supplier.deleteMany()
    await prisma.account.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  describe('Three-Way Matching Analysis', () => {
    test('should analyze complete three-way matching scenario', async () => {
      const analysis = await threeWayMatchingService.analyzeThreeWayMatching(
        testPurchaseOrder.id
      )

      expect(analysis).toBeDefined()
      expect(analysis.purchaseOrder.id).toBe(testPurchaseOrder.id)
      expect(analysis.goodsReceipts).toHaveLength(1)
      expect(analysis.supplierInvoices).toHaveLength(1)
      expect(analysis.summary.totalItems).toBe(2)
      expect(analysis.summary.fullyMatched).toBe(2)
      expect(analysis.summary.partiallyMatched).toBe(0)
      expect(analysis.summary.overMatched).toBe(0)
      expect(analysis.summary.underMatched).toBe(0)
      expect(analysis.summary.matchingStatus).toBe('FULLY_MATCHED')
    })

    test('should detect quantity discrepancies', async () => {
      // Create an invoice with over-invoiced quantity
      const overInvoice = await prisma.supplierInvoice.create({
        data: {
          invoiceNumber: 'INV-TWM-OVER',
          supplierId: testSupplier.id,
          invoiceDate: new Date('2024-01-13'),
          dueDate: new Date('2024-02-13'),
          status: 'DRAFT',
          matchingStatus: 'PENDING',
          currency: 'USD',
          subtotal: 500.00,
          taxAmount: 50.00,
          totalAmount: 550.00,
          createdBy: testUser.id,
          items: {
            create: [
              {
                goodsReceiptItemId: testGoodsReceipt.items[0].id,
                description: 'Test Item A',
                quantity: 3, // Over-invoice: received 2, invoicing 3
                unitPrice: 100.00,
                totalAmount: 300.00,
                accountId: testAccount.id
              }
            ]
          }
        }
      })

      const analysis = await threeWayMatchingService.analyzeThreeWayMatching(
        testPurchaseOrder.id
      )

      expect(analysis.summary.overMatched).toBe(1)
      expect(analysis.summary.matchingStatus).toBe('OVER_MATCHED')

      // Find the specific discrepancy
      const discrepancy = analysis.discrepancies.find(d => 
        d.type === 'QUANTITY_OVER_MATCH'
      )
      expect(discrepancy).toBeDefined()
      expect(discrepancy?.item.code).toBe('TIA-001')
      expect(discrepancy?.expectedQuantity).toBe(2)
      expect(discrepancy?.actualQuantity).toBe(3)

      // Cleanup
      await prisma.supplierInvoiceItem.deleteMany({ 
        where: { supplierInvoiceId: overInvoice.id } 
      })
      await prisma.supplierInvoice.delete({ where: { id: overInvoice.id } })
    })

    test('should detect price discrepancies', async () => {
      // Create an invoice with different unit price
      const priceInvoice = await prisma.supplierInvoice.create({
        data: {
          invoiceNumber: 'INV-TWM-PRICE',
          supplierId: testSupplier.id,
          invoiceDate: new Date('2024-01-14'),
          dueDate: new Date('2024-02-14'),
          status: 'DRAFT',
          matchingStatus: 'PENDING',
          currency: 'USD',
          subtotal: 420.00,
          taxAmount: 42.00,
          totalAmount: 462.00,
          createdBy: testUser.id,
          items: {
            create: [
              {
                goodsReceiptItemId: testGoodsReceipt.items[0].id,
                description: 'Test Item A',
                quantity: 2,
                unitPrice: 110.00, // Price variance: PO was 100.00, invoice is 110.00
                totalAmount: 220.00,
                accountId: testAccount.id
              }
            ]
          }
        }
      })

      const analysis = await threeWayMatchingService.analyzeThreeWayMatching(
        testPurchaseOrder.id
      )

      // Find the price discrepancy
      const discrepancy = analysis.discrepancies.find(d => 
        d.type === 'PRICE_VARIANCE'
      )
      expect(discrepancy).toBeDefined()
      expect(discrepancy?.item.code).toBe('TIA-001')
      expect(discrepancy?.expectedPrice).toBe(100.00)
      expect(discrepancy?.actualPrice).toBe(110.00)
      expect(discrepancy?.variance).toBe(10.00)
      expect(discrepancy?.variancePercentage).toBe(10.0)

      // Cleanup
      await prisma.supplierInvoiceItem.deleteMany({ 
        where: { supplierInvoiceId: priceInvoice.id } 
      })
      await prisma.supplierInvoice.delete({ where: { id: priceInvoice.id } })
    })

    test('should calculate matching tolerance', async () => {
      const toleranceAnalysis = await threeWayMatchingService.analyzeWithTolerance(
        testPurchaseOrder.id,
        {
          quantityTolerancePercent: 5.0,
          priceTolerancePercent: 3.0,
          amountTolerancePercent: 2.0
        }
      )

      expect(toleranceAnalysis).toBeDefined()
      expect(toleranceAnalysis.withinTolerance).toBe(true)
      expect(toleranceAnalysis.toleranceExceptions).toHaveLength(0)
    })

    test('should identify missing documents', async () => {
      // Create a PO without goods receipt
      const missingGR_PO = await prisma.purchaseOrder.create({
        data: {
          poNumber: 'PO-TWM-MISSING',
          supplierId: testSupplier.id,
          status: 'CONFIRMED',
          orderDate: new Date('2024-01-01'),
          currency: 'USD',
          subtotal: 100.00,
          taxAmount: 10.00,
          totalAmount: 110.00,
          createdBy: testUser.id,
          items: {
            create: [
              {
                itemId: testItems[0].id,
                quantity: 1,
                unitPrice: 100.00,
                totalPrice: 100.00
              }
            ]
          }
        }
      })

      const analysis = await threeWayMatchingService.analyzeThreeWayMatching(
        missingGR_PO.id
      )

      expect(analysis.goodsReceipts).toHaveLength(0)
      expect(analysis.supplierInvoices).toHaveLength(0)
      expect(analysis.summary.matchingStatus).toBe('PENDING')

      const missingDoc = analysis.discrepancies.find(d => 
        d.type === 'MISSING_GOODS_RECEIPT'
      )
      expect(missingDoc).toBeDefined()

      // Cleanup
      await prisma.purchaseOrderItem.deleteMany({ 
        where: { purchaseOrderId: missingGR_PO.id } 
      })
      await prisma.purchaseOrder.delete({ where: { id: missingGR_PO.id } })
    })
  })

  describe('Matching Resolution', () => {
    test('should approve three-way matching with discrepancies', async () => {
      // Create an invoice with minor price variance
      const varianceInvoice = await prisma.supplierInvoice.create({
        data: {
          invoiceNumber: 'INV-TWM-APPROVE',
          supplierId: testSupplier.id,
          invoiceDate: new Date('2024-01-15'),
          dueDate: new Date('2024-02-15'),
          status: 'DRAFT',
          matchingStatus: 'PENDING',
          currency: 'USD',
          subtotal: 405.00,
          taxAmount: 40.50,
          totalAmount: 445.50,
          createdBy: testUser.id,
          items: {
            create: [
              {
                goodsReceiptItemId: testGoodsReceipt.items[0].id,
                description: 'Test Item A',
                quantity: 2,
                unitPrice: 102.50, // Small variance: 2.5%
                totalAmount: 205.00,
                accountId: testAccount.id
              }
            ]
          }
        }
      })

      const approval = await threeWayMatchingService.approveMatching(
        varianceInvoice.id,
        {
          approvedBy: testUser.id,
          approvalReason: 'Minor price variance within acceptable range',
          overrideDiscrepancies: true
        }
      )

      expect(approval.approved).toBe(true)
      expect(approval.matchingStatus).toBe('APPROVED_WITH_VARIANCE')

      // Verify invoice status was updated
      const updatedInvoice = await prisma.supplierInvoice.findUnique({
        where: { id: varianceInvoice.id }
      })
      expect(updatedInvoice?.matchingStatus).toBe('APPROVED_WITH_VARIANCE')

      // Cleanup
      await prisma.supplierInvoiceItem.deleteMany({ 
        where: { supplierInvoiceId: varianceInvoice.id } 
      })
      await prisma.supplierInvoice.delete({ where: { id: varianceInvoice.id } })
    })

    test('should reject three-way matching with significant discrepancies', async () => {
      // Create an invoice with major discrepancies
      const majorVarianceInvoice = await prisma.supplierInvoice.create({
        data: {
          invoiceNumber: 'INV-TWM-REJECT',
          supplierId: testSupplier.id,
          invoiceDate: new Date('2024-01-16'),
          dueDate: new Date('2024-02-16'),
          status: 'DRAFT',
          matchingStatus: 'PENDING',
          currency: 'USD',
          subtotal: 600.00,
          taxAmount: 60.00,
          totalAmount: 660.00,
          createdBy: testUser.id,
          items: {
            create: [
              {
                goodsReceiptItemId: testGoodsReceipt.items[0].id,
                description: 'Test Item A',
                quantity: 2,
                unitPrice: 150.00, // Major variance: 50%
                totalAmount: 300.00,
                accountId: testAccount.id
              }
            ]
          }
        }
      })

      const rejection = await threeWayMatchingService.rejectMatching(
        majorVarianceInvoice.id,
        {
          rejectedBy: testUser.id,
          rejectionReason: 'Price variance exceeds acceptable tolerance',
          requiredActions: ['Contact supplier for price verification', 'Review purchase order terms']
        }
      )

      expect(rejection.rejected).toBe(true)
      expect(rejection.matchingStatus).toBe('REJECTED')
      expect(rejection.requiredActions).toHaveLength(2)

      // Verify invoice status was updated
      const updatedInvoice = await prisma.supplierInvoice.findUnique({
        where: { id: majorVarianceInvoice.id }
      })
      expect(updatedInvoice?.matchingStatus).toBe('REJECTED')

      // Cleanup
      await prisma.supplierInvoiceItem.deleteMany({ 
        where: { supplierInvoiceId: majorVarianceInvoice.id } 
      })
      await prisma.supplierInvoice.delete({ where: { id: majorVarianceInvoice.id } })
    })
  })

  describe('Bulk Operations', () => {
    test('should perform bulk three-way matching analysis', async () => {
      const bulkAnalysis = await threeWayMatchingService.bulkAnalyzeMatching([
        testPurchaseOrder.id
      ])

      expect(bulkAnalysis).toHaveLength(1)
      expect(bulkAnalysis[0].purchaseOrder.id).toBe(testPurchaseOrder.id)
      expect(bulkAnalysis[0].summary.matchingStatus).toBeDefined()
    })

    test('should generate matching exceptions report', async () => {
      const exceptionsReport = await threeWayMatchingService.generateExceptionsReport({
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
        supplierId: testSupplier.id,
        minVarianceAmount: 10.00
      })

      expect(exceptionsReport).toBeDefined()
      expect(exceptionsReport.summary).toBeDefined()
      expect(exceptionsReport.exceptions).toBeDefined()
      expect(Array.isArray(exceptionsReport.exceptions)).toBe(true)
    })
  })

  describe('Matching Metrics', () => {
    test('should calculate matching performance metrics', async () => {
      const metrics = await threeWayMatchingService.getMatchingMetrics({
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
        supplierId: testSupplier.id
      })

      expect(metrics).toBeDefined()
      expect(metrics.totalTransactions).toBeGreaterThanOrEqual(1)
      expect(metrics.fullyMatchedRate).toBeGreaterThanOrEqual(0)
      expect(metrics.averageMatchingTime).toBeGreaterThanOrEqual(0)
      expect(metrics.commonDiscrepancyTypes).toBeDefined()
    })
  })
})