import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { PrismaClient } from '@/lib/generated/prisma'
import { SupplierPaymentService } from '@/lib/services/purchase/supplier-payment.service'
import { SupplierInvoiceService } from '@/lib/services/purchase/supplier-invoice.service'
import { ThreeWayMatchingService } from '@/lib/services/purchase/three-way-matching.service'
import { GoodsReceiptService } from '@/lib/services/purchase/goods-receipt.service'

const prisma = new PrismaClient()

describe('End-to-End Procurement-to-Pay Workflow', () => {
  let testSupplier: any
  let testItems: any[]
  let testAccounts: any
  let testUser: any
  let supplierPaymentService: SupplierPaymentService
  let supplierInvoiceService: SupplierInvoiceService
  let threeWayMatchingService: ThreeWayMatchingService
  let goodsReceiptService: GoodsReceiptService

  beforeAll(async () => {
    // Initialize services
    supplierPaymentService = new SupplierPaymentService()
    supplierInvoiceService = new SupplierInvoiceService()
    threeWayMatchingService = new ThreeWayMatchingService()
    goodsReceiptService = new GoodsReceiptService()

    // Create test user with unique identifier
    const timestamp = Date.now()
    testUser = await prisma.user.create({
      data: {
        username: `p2ptest_${timestamp}`,
        email: `p2p_${timestamp}@test.com`,
        password: 'hashedpassword',
        role: 'ACCOUNTANT'
      }
    })

    // Create test accounts with unique codes
    const apAccount = await prisma.account.create({
      data: {
        code: `AP-P2P-${timestamp}`,
        name: 'Test AP Account P2P',
        type: 'LIABILITY',
        createdBy: testUser.id
      }
    })

    const bankAccount = await prisma.account.create({
      data: {
        code: `BANK-P2P-${timestamp}`,
        name: 'Test Bank Account P2P',
        type: 'ASSET',
        createdBy: testUser.id
      }
    })

    const expenseAccount = await prisma.account.create({
      data: {
        code: `EXP-P2P-${timestamp}`,
        name: 'Test Expense Account P2P',
        type: 'EXPENSE',
        createdBy: testUser.id
      }
    })

    testAccounts = {
      ap: apAccount,
      bank: bankAccount,
      expense: expenseAccount
    }

    // Create test supplier
    testSupplier = await prisma.supplier.create({
      data: {
        name: 'End-to-End Test Supplier',
        supplierNumber: `E2E-001-${timestamp}`,
        email: `e2e_${timestamp}@supplier.com`,
        currency: 'USD',
        paymentTerms: 30,
        accountId: apAccount.id,
        createdBy: testUser.id
      }
    })

    // Create unit of measure if it doesn't exist
    let unitOfMeasure = await prisma.unitOfMeasure.findUnique({
      where: { code: 'ea' }
    })
    
    if (!unitOfMeasure) {
      unitOfMeasure = await prisma.unitOfMeasure.create({
        data: {
          code: 'ea',
          name: 'Each',
          symbol: 'ea',
          isBaseUnit: true,
          createdBy: testUser.id
        }
      })
    }

    // Create test items
    const category = await prisma.category.create({
      data: {
        name: 'E2E Test Category',
        code: `E2E-CAT-${timestamp}`,
        description: 'End-to-end test category',
        createdBy: testUser.id
      }
    })

    testItems = await Promise.all([
      prisma.item.create({
        data: {
          name: 'E2E Test Item Alpha',
          code: `E2E-ALPHA-${timestamp}`,
          categoryId: category.id,
          unitOfMeasureId: 'ea',
          standardCost: 250.00,
          listPrice: 375.00,
          createdBy: testUser.id
        }
      }),
      prisma.item.create({
        data: {
          name: 'E2E Test Item Beta',
          code: `E2E-BETA-${timestamp}`,
          categoryId: category.id,
          unitOfMeasureId: 'ea',
          standardCost: 150.00,
          listPrice: 225.00,
          createdBy: testUser.id
        }
      })
    ])
  })

  afterAll(async () => {
    // Clean up test data in reverse order with defensive checks
    try {
      // Clean up supplier payments
      if (testSupplier?.id) {
        await prisma.supplierPayment.deleteMany({ where: { supplierId: testSupplier.id } })
      }
      
      // Clean up supplier invoice items and invoices
      if (testSupplier?.id) {
        await prisma.supplierInvoiceItem.deleteMany({
          where: {
            supplierInvoice: {
              supplierId: testSupplier.id
            }
          }
        })
        await prisma.supplierInvoice.deleteMany({ where: { supplierId: testSupplier.id } })
      }
      
      // Clean up goods receipt items and receipts
      if (testSupplier?.id) {
        await prisma.goodsReceiptItem.deleteMany({
          where: {
            goodsReceipt: {
              supplierId: testSupplier.id
            }
          }
        })
        await prisma.goodsReceipt.deleteMany({ where: { supplierId: testSupplier.id } })
      }
      
      // Clean up purchase order items and orders
      if (testSupplier?.id) {
        await prisma.purchaseOrderItem.deleteMany({
          where: {
            purchaseOrder: {
              supplierId: testSupplier.id
            }
          }
        })
      }
      if (testSupplier?.id) {
        await prisma.purchaseOrder.deleteMany({ where: { supplierId: testSupplier.id } })
      }
      
      // Clean up items
      if (testItems && Array.isArray(testItems) && testItems.length > 0) {
        const itemIds = testItems.filter(item => item?.id).map(item => item.id)
        if (itemIds.length > 0) {
          await prisma.item.deleteMany({ where: { id: { in: itemIds } } })
        }
      }
      
      // Clean up categories
      await prisma.category.deleteMany()
      
      // Clean up supplier
      if (testSupplier?.id) {
        await prisma.supplier.deleteMany({ where: { id: testSupplier.id } })
      }
      
      // Clean up accounts
      if (testAccounts && typeof testAccounts === 'object') {
        const accountIds = Object.values(testAccounts)
          .filter((acc): acc is { id: string } => acc && typeof acc === 'object' && 'id' in acc)
          .map(acc => acc.id)
        if (accountIds.length > 0) {
          await prisma.account.deleteMany({ where: { id: { in: accountIds } } })
        }
      }
      
      // Clean up user
      if (testUser?.id) {
        await prisma.user.deleteMany({ where: { id: testUser.id } })
      }
    } catch (error) {
      // Log cleanup errors but don't fail the test
      console.error('Error during test cleanup:', error)
    } finally {
      // Always disconnect from the database
      await prisma.$disconnect()
    }
  })

  describe('Complete P2P Workflow - Happy Path', () => {
    test('should complete full procurement-to-pay cycle successfully', async () => {
      // STEP 1: Create Purchase Order
      const purchaseOrder = await prisma.purchaseOrder.create({
        data: {
          poNumber: 'PO-E2E-HAPPY',
          supplierId: testSupplier.id,
          status: 'CONFIRMED',
          orderDate: new Date('2024-01-01'),
          expectedDate: new Date('2024-01-15'),
          currency: 'USD',
          subtotal: 800.00,
          taxAmount: 80.00,
          totalAmount: 880.00,
          createdBy: testUser.id,
          items: {
            create: [
              {
                itemId: testItems[0].id,
                quantity: 2,
                unitPrice: 250.00,
                totalPrice: 500.00
              },
              {
                itemId: testItems[1].id,
                quantity: 2,
                unitPrice: 150.00,
                totalPrice: 300.00
              }
            ]
          }
        },
        include: { items: true }
      })

      expect(purchaseOrder.poNumber).toBe('PO-E2E-HAPPY')
      expect(purchaseOrder.totalAmount).toBe(880.00)
      expect(purchaseOrder.items).toHaveLength(2)

      // STEP 2: Create Goods Receipt (Full Receipt)
      const goodsReceiptData = {
        purchaseOrderId: purchaseOrder.id,
        supplierId: testSupplier.id,
        receiptNumber: 'GR-E2E-HAPPY',
        receivedDate: new Date('2024-01-10'),
        receivedBy: testUser.id,
        items: [
          {
            purchaseOrderItemId: purchaseOrder.items[0].id,
            itemId: testItems[0].id,
            quantityReceived: 2, // Full quantity
            quantityRejected: 0,
            unitCost: 250.00,
            qualityStatus: 'ACCEPTED' as const
          },
          {
            purchaseOrderItemId: purchaseOrder.items[1].id,
            itemId: testItems[1].id,
            quantityReceived: 2, // Full quantity
            quantityRejected: 0,
            unitCost: 150.00,
            qualityStatus: 'ACCEPTED' as const
          }
        ],
        createdBy: testUser.id
      }

      const goodsReceipt = await goodsReceiptService.createGoodsReceipt(goodsReceiptData)

      expect(goodsReceipt.receiptNumber).toBe('GR-E2E-HAPPY')
      expect(goodsReceipt.status).toBe('RECEIVED')
      expect(goodsReceipt.items).toHaveLength(2)

      // STEP 3: Three-Way Matching Analysis (Before Invoice)
      const preInvoiceAnalysis = await threeWayMatchingService.analyzeThreeWayMatching(purchaseOrder.id)

      expect(preInvoiceAnalysis.goodsReceipts).toHaveLength(1)
      expect(preInvoiceAnalysis.supplierInvoices).toHaveLength(0)
      expect(preInvoiceAnalysis.summary.matchingStatus).toBe('PENDING') // No invoice yet

      // STEP 4: Create Supplier Invoice (Perfect Match)
      const supplierInvoiceData = {
        supplierId: testSupplier.id,
        invoiceNumber: 'INV-E2E-HAPPY',
        invoiceDate: new Date('2024-01-12'),
        dueDate: new Date('2024-02-12'),
        currency: 'USD',
        items: goodsReceipt.items.map(grItem => ({
          goodsReceiptItemId: grItem.id,
          description: grItem.item.name,
          quantity: grItem.quantityReceived,
          unitPrice: grItem.unitCost,
          totalAmount: grItem.quantityReceived * grItem.unitCost,
          accountId: testAccounts.expense.id,
          taxAmount: 0
        })),
        subtotal: 800.00,
        taxAmount: 80.00,
        totalAmount: 880.00,
        createdBy: testUser.id
      }

      const supplierInvoice = await supplierInvoiceService.createSupplierInvoice(supplierInvoiceData)

      expect(supplierInvoice.invoiceNumber).toBe('INV-E2E-HAPPY')
      expect(supplierInvoice.matchingStatus).toBe('FULLY_MATCHED')
      expect(supplierInvoice.status).toBe('DRAFT')

      // STEP 5: Three-Way Matching Analysis (After Invoice)
      const postInvoiceAnalysis = await threeWayMatchingService.analyzeThreeWayMatching(purchaseOrder.id)

      expect(postInvoiceAnalysis.goodsReceipts).toHaveLength(1)
      expect(postInvoiceAnalysis.supplierInvoices).toHaveLength(1)
      expect(postInvoiceAnalysis.summary.matchingStatus).toBe('FULLY_MATCHED')
      expect(postInvoiceAnalysis.discrepancies).toHaveLength(0) // No discrepancies

      // STEP 6: Post Supplier Invoice
      const postedInvoice = await supplierInvoiceService.postSupplierInvoice(supplierInvoice.id, testUser.id)

      expect(postedInvoice.status).toBe('POSTED')
      expect(postedInvoice.journalEntryId).toBeDefined()

      // STEP 7: Create Full Payment
      const paymentData = {
        supplierId: testSupplier.id,
        supplierInvoiceId: supplierInvoice.id,
        amount: 880.00, // Full amount
        paymentDate: new Date('2024-01-25'),
        paymentMethod: 'BANK_TRANSFER' as const,
        reference: 'WIRE-E2E-HAPPY',
        notes: 'Full payment for E2E test invoice',
        currency: 'USD',
        bankAccountId: testAccounts.bank.id,
        createdBy: testUser.id
      }

      const payment = await supplierPaymentService.createSupplierPayment(paymentData)

      expect(payment.amount).toBe(880.00)
      expect(payment.paymentNumber).toMatch(/^SPY-\d+$/)
      expect(payment.journalEntryId).toBeDefined()

      // STEP 8: Verify Invoice Paid Status
      const finalInvoice = await prisma.supplierInvoice.findUnique({
        where: { id: supplierInvoice.id }
      })

      expect(finalInvoice?.paidAmount).toBe(880.00)
      expect(finalInvoice?.balanceAmount).toBe(0.00)
      expect(finalInvoice?.status).toBe('PAID')

      // STEP 9: Verify Supplier Balance
      const supplierBalance = await supplierPaymentService.getSupplierBalance(testSupplier.id)

      expect(supplierBalance.totalOutstanding).toBe(0.00) // Fully paid
      expect(supplierBalance.totalPaid).toBe(880.00)
      expect(supplierBalance.openInvoices).toBe(0)

      // STEP 10: Final Three-Way Matching Metrics
      const finalMetrics = await threeWayMatchingService.getMatchingMetrics({
        supplierId: testSupplier.id
      })

      expect(finalMetrics.totalTransactions).toBeGreaterThanOrEqual(1)
      expect(finalMetrics.fullyMatchedRate).toBeGreaterThanOrEqual(100) // Perfect match
    })
  })

  describe('Complete P2P Workflow - With Discrepancies', () => {
    test('should handle P2P cycle with price variance and approval', async () => {
      // STEP 1: Create Purchase Order
      const purchaseOrder = await prisma.purchaseOrder.create({
        data: {
          poNumber: 'PO-E2E-VARIANCE',
          supplierId: testSupplier.id,
          status: 'CONFIRMED',
          orderDate: new Date('2024-02-01'),
          expectedDate: new Date('2024-02-15'),
          currency: 'USD',
          subtotal: 400.00,
          taxAmount: 40.00,
          totalAmount: 440.00,
          createdBy: testUser.id,
          items: {
            create: [
              {
                itemId: testItems[0].id,
                quantity: 1,
                unitPrice: 250.00,
                totalPrice: 250.00
              },
              {
                itemId: testItems[1].id,
                quantity: 1,
                unitPrice: 150.00,
                totalPrice: 150.00
              }
            ]
          }
        },
        include: { items: true }
      })

      // STEP 2: Create Goods Receipt
      const goodsReceipt = await goodsReceiptService.createGoodsReceipt({
        purchaseOrderId: purchaseOrder.id,
        supplierId: testSupplier.id,
        receiptNumber: 'GR-E2E-VARIANCE',
        receivedDate: new Date('2024-02-10'),
        receivedBy: testUser.id,
        items: [
          {
            purchaseOrderItemId: purchaseOrder.items[0].id,
            itemId: testItems[0].id,
            quantityReceived: 1,
            quantityRejected: 0,
            unitCost: 250.00,
            qualityStatus: 'ACCEPTED' as const
          },
          {
            purchaseOrderItemId: purchaseOrder.items[1].id,
            itemId: testItems[1].id,
            quantityReceived: 1,
            quantityRejected: 0,
            unitCost: 150.00,
            qualityStatus: 'ACCEPTED' as const
          }
        ],
        createdBy: testUser.id
      })

      // STEP 3: Create Supplier Invoice with Price Variance
      const supplierInvoice = await supplierInvoiceService.createSupplierInvoice({
        supplierId: testSupplier.id,
        invoiceNumber: 'INV-E2E-VARIANCE',
        invoiceDate: new Date('2024-02-12'),
        dueDate: new Date('2024-03-12'),
        currency: 'USD',
        items: [
          {
            goodsReceiptItemId: goodsReceipt.items[0].id,
            description: testItems[0].name,
            quantity: 1,
            unitPrice: 275.00, // 10% price increase!
            totalAmount: 275.00,
            accountId: testAccounts.expense.id,
            taxAmount: 0
          },
          {
            goodsReceiptItemId: goodsReceipt.items[1].id,
            description: testItems[1].name,
            quantity: 1,
            unitPrice: 150.00, // Correct price
            totalAmount: 150.00,
            accountId: testAccounts.expense.id,
            taxAmount: 0
          }
        ],
        subtotal: 425.00,
        taxAmount: 42.50,
        totalAmount: 467.50,
        createdBy: testUser.id
      })

      // STEP 4: Three-Way Matching Analysis (Should Show Discrepancies)
      const analysis = await threeWayMatchingService.analyzeThreeWayMatching(purchaseOrder.id)

      expect(analysis.discrepancies.length).toBeGreaterThan(0)
      
      const priceVariance = analysis.discrepancies.find(d => d.type === 'PRICE_VARIANCE')
      expect(priceVariance).toBeDefined()
      expect(priceVariance?.variancePercentage).toBe(10.0)
      expect(priceVariance?.severity).toBe('MEDIUM') // 10% variance

      // STEP 5: Approve Matching with Variance
      const approval = await threeWayMatchingService.approveMatching(supplierInvoice.id, {
        approvedBy: testUser.id,
        approvalReason: 'Price increase approved due to material cost inflation',
        overrideDiscrepancies: true
      })

      expect(approval.approved).toBe(true)
      expect(approval.matchingStatus).toBe('APPROVED_WITH_VARIANCE')

      // STEP 6: Post Invoice After Approval
      await supplierInvoiceService.postSupplierInvoice(supplierInvoice.id, testUser.id)

      // STEP 7: Create Partial Payment
      const partialPayment = await supplierPaymentService.createSupplierPayment({
        supplierId: testSupplier.id,
        supplierInvoiceId: supplierInvoice.id,
        amount: 250.00, // Partial payment
        paymentDate: new Date('2024-02-20'),
        paymentMethod: 'CHECK' as const,
        reference: 'CHK-E2E-001',
        currency: 'USD',
        bankAccountId: testAccounts.bank.id,
        createdBy: testUser.id
      })

      expect(partialPayment.amount).toBe(250.00)

      // STEP 8: Create Final Payment
      const finalPayment = await supplierPaymentService.createSupplierPayment({
        supplierId: testSupplier.id,
        supplierInvoiceId: supplierInvoice.id,
        amount: 217.50, // Remaining balance
        paymentDate: new Date('2024-02-25'),
        paymentMethod: 'BANK_TRANSFER' as const,
        reference: 'WIRE-E2E-FINAL',
        currency: 'USD',
        bankAccountId: testAccounts.bank.id,
        createdBy: testUser.id
      })

      expect(finalPayment.amount).toBe(217.50)

      // STEP 9: Verify Final Invoice Status
      const finalInvoice = await prisma.supplierInvoice.findUnique({
        where: { id: supplierInvoice.id }
      })

      expect(finalInvoice?.paidAmount).toBe(467.50)
      expect(finalInvoice?.balanceAmount).toBe(0.00)
      expect(finalInvoice?.status).toBe('PAID')
      expect(finalInvoice?.matchingStatus).toBe('APPROVED_WITH_VARIANCE')
    })
  })

  describe('Complete P2P Workflow - Partial Receipts', () => {
    test('should handle P2P cycle with partial receipts and multiple invoices', async () => {
      // STEP 1: Create Purchase Order
      const purchaseOrder = await prisma.purchaseOrder.create({
        data: {
          poNumber: 'PO-E2E-PARTIAL',
          supplierId: testSupplier.id,
          status: 'CONFIRMED',
          orderDate: new Date('2024-03-01'),
          expectedDate: new Date('2024-03-15'),
          currency: 'USD',
          subtotal: 1000.00,
          taxAmount: 100.00,
          totalAmount: 1100.00,
          createdBy: testUser.id,
          items: {
            create: [
              {
                itemId: testItems[0].id,
                quantity: 4, // Will receive in multiple shipments
                unitPrice: 250.00,
                totalPrice: 1000.00
              }
            ]
          }
        },
        include: { items: true }
      })

      // STEP 2: First Partial Goods Receipt
      const firstGoodsReceipt = await goodsReceiptService.createGoodsReceipt({
        purchaseOrderId: purchaseOrder.id,
        supplierId: testSupplier.id,
        receiptNumber: 'GR-E2E-PARTIAL-1',
        receivedDate: new Date('2024-03-10'),
        receivedBy: testUser.id,
        items: [
          {
            purchaseOrderItemId: purchaseOrder.items[0].id,
            itemId: testItems[0].id,
            quantityReceived: 2, // Partial: 2 of 4
            quantityRejected: 0,
            unitCost: 250.00,
            qualityStatus: 'ACCEPTED' as const
          }
        ],
        createdBy: testUser.id
      })

      // STEP 3: First Supplier Invoice (for first receipt)
      const firstInvoice = await supplierInvoiceService.createSupplierInvoice({
        supplierId: testSupplier.id,
        invoiceNumber: 'INV-E2E-PARTIAL-1',
        invoiceDate: new Date('2024-03-12'),
        dueDate: new Date('2024-04-12'),
        currency: 'USD',
        items: [
          {
            goodsReceiptItemId: firstGoodsReceipt.items[0].id,
            description: testItems[0].name,
            quantity: 2,
            unitPrice: 250.00,
            totalAmount: 500.00,
            accountId: testAccounts.expense.id,
            taxAmount: 0
          }
        ],
        subtotal: 500.00,
        taxAmount: 50.00,
        totalAmount: 550.00,
        createdBy: testUser.id
      })

      // STEP 4: Second Partial Goods Receipt
      const secondGoodsReceipt = await goodsReceiptService.createGoodsReceipt({
        purchaseOrderId: purchaseOrder.id,
        supplierId: testSupplier.id,
        receiptNumber: 'GR-E2E-PARTIAL-2',
        receivedDate: new Date('2024-03-20'),
        receivedBy: testUser.id,
        items: [
          {
            purchaseOrderItemId: purchaseOrder.items[0].id,
            itemId: testItems[0].id,
            quantityReceived: 2, // Remaining: 2 of 4
            quantityRejected: 0,
            unitCost: 250.00,
            qualityStatus: 'ACCEPTED' as const
          }
        ],
        createdBy: testUser.id
      })

      // STEP 5: Second Supplier Invoice (for second receipt)
      const secondInvoice = await supplierInvoiceService.createSupplierInvoice({
        supplierId: testSupplier.id,
        invoiceNumber: 'INV-E2E-PARTIAL-2',
        invoiceDate: new Date('2024-03-22'),
        dueDate: new Date('2024-04-22'),
        currency: 'USD',
        items: [
          {
            goodsReceiptItemId: secondGoodsReceipt.items[0].id,
            description: testItems[0].name,
            quantity: 2,
            unitPrice: 250.00,
            totalAmount: 500.00,
            accountId: testAccounts.expense.id,
            taxAmount: 0
          }
        ],
        subtotal: 500.00,
        taxAmount: 50.00,
        totalAmount: 550.00,
        createdBy: testUser.id
      })

      // STEP 6: Three-Way Matching Analysis (Should Show Fully Matched)
      const finalAnalysis = await threeWayMatchingService.analyzeThreeWayMatching(purchaseOrder.id)

      expect(finalAnalysis.goodsReceipts).toHaveLength(2)
      expect(finalAnalysis.supplierInvoices).toHaveLength(2)
      expect(finalAnalysis.summary.matchingStatus).toBe('FULLY_MATCHED')

      // STEP 7: Post Both Invoices
      await supplierInvoiceService.postSupplierInvoice(firstInvoice.id, testUser.id)
      await supplierInvoiceService.postSupplierInvoice(secondInvoice.id, testUser.id)

      // STEP 8: Pay Both Invoices
      await supplierPaymentService.createSupplierPayment({
        supplierId: testSupplier.id,
        supplierInvoiceId: firstInvoice.id,
        amount: 550.00,
        paymentDate: new Date('2024-03-25'),
        paymentMethod: 'BANK_TRANSFER' as const,
        currency: 'USD',
        bankAccountId: testAccounts.bank.id,
        createdBy: testUser.id
      })

      await supplierPaymentService.createSupplierPayment({
        supplierId: testSupplier.id,
        supplierInvoiceId: secondInvoice.id,
        amount: 550.00,
        paymentDate: new Date('2024-03-30'),
        paymentMethod: 'BANK_TRANSFER' as const,
        currency: 'USD',
        bankAccountId: testAccounts.bank.id,
        createdBy: testUser.id
      })

      // STEP 9: Verify Final Supplier Balance
      const supplierBalance = await supplierPaymentService.getSupplierBalance(testSupplier.id)

      expect(supplierBalance.totalPaid).toBeGreaterThanOrEqual(1100.00) // From multiple workflows
      expect(supplierBalance.openInvoices).toBe(0) // All paid
    })
  })

  describe('P2P Workflow Error Handling', () => {
    test('should reject invoice with excessive variance', async () => {
      // Create PO and GR
      const purchaseOrder = await prisma.purchaseOrder.create({
        data: {
          poNumber: 'PO-E2E-REJECT',
          supplierId: testSupplier.id,
          status: 'CONFIRMED',
          orderDate: new Date('2024-04-01'),
          currency: 'USD',
          subtotal: 250.00,
          taxAmount: 25.00,
          totalAmount: 275.00,
          createdBy: testUser.id,
          items: {
            create: [
              {
                itemId: testItems[0].id,
                quantity: 1,
                unitPrice: 250.00,
                totalPrice: 250.00
              }
            ]
          }
        },
        include: { items: true }
      })

      const goodsReceipt = await goodsReceiptService.createGoodsReceipt({
        purchaseOrderId: purchaseOrder.id,
        supplierId: testSupplier.id,
        receiptNumber: 'GR-E2E-REJECT',
        receivedDate: new Date('2024-04-05'),
        receivedBy: testUser.id,
        items: [
          {
            purchaseOrderItemId: purchaseOrder.items[0].id,
            itemId: testItems[0].id,
            quantityReceived: 1,
            quantityRejected: 0,
            unitCost: 250.00,
            qualityStatus: 'ACCEPTED' as const
          }
        ],
        createdBy: testUser.id
      })

      // Create invoice with excessive price variance
      const supplierInvoice = await supplierInvoiceService.createSupplierInvoice({
        supplierId: testSupplier.id,
        invoiceNumber: 'INV-E2E-REJECT',
        invoiceDate: new Date('2024-04-07'),
        dueDate: new Date('2024-05-07'),
        currency: 'USD',
        items: [
          {
            goodsReceiptItemId: goodsReceipt.items[0].id,
            description: testItems[0].name,
            quantity: 1,
            unitPrice: 400.00, // 60% increase!
            totalAmount: 400.00,
            accountId: testAccounts.expense.id,
            taxAmount: 0
          }
        ],
        subtotal: 400.00,
        taxAmount: 40.00,
        totalAmount: 440.00,
        createdBy: testUser.id
      })

      // Analyze discrepancies
      const analysis = await threeWayMatchingService.analyzeThreeWayMatching(purchaseOrder.id)
      
      const priceVariance = analysis.discrepancies.find(d => d.type === 'PRICE_VARIANCE')
      expect(priceVariance?.severity).toBe('HIGH') // 60% variance
      expect(priceVariance?.requiresApproval).toBe(true)

      // Reject the matching
      const rejection = await threeWayMatchingService.rejectMatching(supplierInvoice.id, {
        rejectedBy: testUser.id,
        rejectionReason: 'Price variance exceeds acceptable tolerance without justification',
        requiredActions: [
          'Contact supplier for price justification',
          'Review original purchase order terms',
          'Obtain management approval for price increase'
        ]
      })

      expect(rejection.rejected).toBe(true)
      expect(rejection.matchingStatus).toBe('REJECTED')
      expect(rejection.requiredActions).toHaveLength(3)

      // Verify invoice status
      const rejectedInvoice = await prisma.supplierInvoice.findUnique({
        where: { id: supplierInvoice.id }
      })

      expect(rejectedInvoice?.matchingStatus).toBe('REJECTED')

      // Should not be able to post rejected invoice
      await expect(
        supplierInvoiceService.postSupplierInvoice(supplierInvoice.id, testUser.id)
      ).rejects.toThrow('Cannot post rejected invoice')
    })
  })
})