import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { GoodsReceiptService } from '@/lib/services/purchase/goods-receipt.service'
import { PurchaseOrderService } from '@/lib/services/purchase/purchase-order.service'
import { SupplierService } from '@/lib/services/purchase/supplier.service'
import { ItemService } from '@/lib/services/inventory/item.service'
import { StockMovementService } from '@/lib/services/inventory/stock-movement.service'
import { JournalEntryService } from '@/lib/services/accounting/journal-entry.service'
import { prisma } from '@/lib/db/prisma'
import { MovementType } from "@prisma/client"

describe('Goods Receipt Workflow Integration', () => {
  let goodsReceiptService: GoodsReceiptService
  let purchaseOrderService: PurchaseOrderService
  let supplierService: SupplierService
  let itemService: ItemService
  let stockMovementService: StockMovementService
  let journalEntryService: JournalEntryService
  
  let testUserId: string
  let testSupplierId: string
  let testItemId: string
  let testPurchaseOrderId: string
  
  beforeEach(async () => {
    // Initialize services
    goodsReceiptService = new GoodsReceiptService()
    purchaseOrderService = new PurchaseOrderService()
    supplierService = new SupplierService()
    itemService = new ItemService()
    stockMovementService = new StockMovementService()
    journalEntryService = new JournalEntryService()
    
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        username: 'testuser-gr',
        email: 'testuser-gr@test.com',
        password: 'hashedpassword',
        role: 'ADMIN'
      }
    })
    testUserId = testUser.id
    
    // Create test supplier with AP account
    const supplier = await supplierService.createSupplier({
      supplierNumber: 'SUP-GR-001',
      name: 'Test Supplier for GR',
      email: 'supplier-gr@test.com',
      currency: 'USD',
      paymentTerms: 30,
      createdBy: testUserId
    })
    testSupplierId = supplier.id
    
    // Create test inventory item with GL accounts
    const inventoryAccount = await prisma.account.create({
      data: {
        code: '1300-GR',
        name: 'Test Inventory Account',
        type: 'ASSET',
        createdBy: testUserId
      }
    })
    
    const cogsAccount = await prisma.account.create({
      data: {
        code: '5100-GR',
        name: 'Test COGS Account', 
        type: 'EXPENSE',
        createdBy: testUserId
      }
    })
    
    const category = await prisma.category.create({
      data: {
        name: 'Test Category GR',
        code: 'CAT-GR',
        createdBy: testUserId
      }
    })
    
    const uom = await prisma.unitOfMeasure.create({
      data: {
        code: 'PCS-GR',
        name: 'Pieces',
        symbol: 'pcs'
      }
    })
    
    const item = await itemService.createItem({
      code: 'ITEM-GR-001',
      name: 'Test Item for Goods Receipt',
      categoryId: category.id,
      unitOfMeasureId: uom.id,
      standardCost: 10.00,
      trackInventory: true,
      inventoryAccountId: inventoryAccount.id,
      cogsAccountId: cogsAccount.id,
      createdBy: testUserId
    })
    testItemId = item.id
    
    // Create test purchase order
    const purchaseOrder = await purchaseOrderService.createPurchaseOrder({
      orderNumber: 'PO-GR-001',
      supplierId: testSupplierId,
      orderDate: new Date(),
      currency: 'USD',
      items: [{
        itemId: testItemId,
        quantity: 100,
        unitPrice: 10.00,
        totalPrice: 1000.00
      }],
      subtotal: 1000.00,
      taxAmount: 0,
      shippingAmount: 0,
      totalAmount: 1000.00,
      createdBy: testUserId
    })
    testPurchaseOrderId = purchaseOrder.id
  })
  
  afterEach(async () => {
    // Clean up test data
    await prisma.stockMovement.deleteMany({
      where: { createdBy: testUserId }
    })
    await prisma.stockLot.deleteMany({
      where: { createdBy: testUserId }
    })
    await prisma.goodsReceiptItem.deleteMany()
    await prisma.goodsReceipt.deleteMany({
      where: { createdBy: testUserId }
    })
    await prisma.purchaseOrderItem.deleteMany()
    await prisma.purchaseOrder.deleteMany({
      where: { createdBy: testUserId }
    })
    await prisma.item.deleteMany({
      where: { createdBy: testUserId }
    })
    await prisma.category.deleteMany({
      where: { createdBy: testUserId }
    })
    await prisma.unitOfMeasure.deleteMany({
      where: { code: { startsWith: 'PCS-GR' } }
    })
    await prisma.supplier.deleteMany({
      where: { createdBy: testUserId }
    })
    await prisma.journalEntryLine.deleteMany()
    await prisma.journalEntry.deleteMany({
      where: { createdBy: testUserId }
    })
    await prisma.account.deleteMany({
      where: { createdBy: testUserId }
    })
    await prisma.user.deleteMany({
      where: { id: testUserId }
    })
  })

  test('should create goods receipt from purchase order', async () => {
    // Arrange
    const receiptData = {
      purchaseOrderId: testPurchaseOrderId,
      receiptNumber: 'GR-001',
      receivedDate: new Date(),
      receivedBy: testUserId,
      items: [{
        purchaseOrderItemId: '',  // Will be set after fetching PO
        quantityReceived: 100,
        quantityRejected: 0,
        unitCost: 10.00,
        qualityStatus: 'ACCEPTED' as const,
        notes: 'All items received in good condition'
      }],
      notes: 'First test goods receipt',
      createdBy: testUserId
    }
    
    // Get PO item ID
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: testPurchaseOrderId },
      include: { items: true }
    })
    receiptData.items[0].purchaseOrderItemId = po!.items[0].id
    
    // Act
    const goodsReceipt = await goodsReceiptService.createGoodsReceipt(receiptData)
    
    // Assert
    expect(goodsReceipt).toBeDefined()
    expect(goodsReceipt.receiptNumber).toBe('GR-001')
    expect(goodsReceipt.items).toHaveLength(1)
    expect(goodsReceipt.items[0].quantityReceived).toBe(100)
    expect(goodsReceipt.status).toBe('RECEIVED')
    
    // Verify stock movement was created
    const stockMovements = await prisma.stockMovement.findMany({
      where: {
        referenceType: 'PURCHASE',
        referenceId: goodsReceipt.id
      }
    })
    expect(stockMovements).toHaveLength(1)
    expect(stockMovements[0].movementType).toBe(MovementType.STOCK_IN)
    expect(stockMovements[0].quantity).toBe(100)
    
    // Verify stock lot was created
    const stockLots = await prisma.stockLot.findMany({
      where: { itemId: testItemId }
    })
    expect(stockLots).toHaveLength(1)
    expect(stockLots[0].availableQty).toBe(100)
    expect(stockLots[0].unitCost).toBe(10.00)
  })

  test('should create journal entries for goods receipt', async () => {
    // Arrange
    const receiptData = {
      purchaseOrderId: testPurchaseOrderId,
      receiptNumber: 'GR-002',
      receivedDate: new Date(),
      receivedBy: testUserId,
      items: [{
        purchaseOrderItemId: '',
        quantityReceived: 50,
        quantityRejected: 0,
        unitCost: 10.00,
        qualityStatus: 'ACCEPTED' as const
      }],
      createdBy: testUserId
    }
    
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: testPurchaseOrderId },
      include: { items: true }
    })
    receiptData.items[0].purchaseOrderItemId = po!.items[0].id
    
    // Act
    const goodsReceipt = await goodsReceiptService.createGoodsReceipt(receiptData)
    
    // Assert - Verify journal entry was created
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        description: { contains: 'Stock in' }
      },
      include: { lines: true }
    })
    
    expect(journalEntries.length).toBeGreaterThan(0)
    
    const journalEntry = journalEntries[0]
    expect(journalEntry.lines).toHaveLength(2)
    
    // Should have debit to inventory and credit to inventory adjustment
    const debitLine = journalEntry.lines.find(line => line.debitAmount > 0)
    const creditLine = journalEntry.lines.find(line => line.creditAmount > 0)
    
    expect(debitLine).toBeDefined()
    expect(creditLine).toBeDefined()
    expect(debitLine!.debitAmount).toBe(500) // 50 * 10.00
    expect(creditLine!.creditAmount).toBe(500)
  })

  test('should handle partial receipts correctly', async () => {
    // Arrange - Receive only 60 out of 100 ordered
    const receiptData = {
      purchaseOrderId: testPurchaseOrderId,
      receiptNumber: 'GR-003',
      receivedDate: new Date(),
      receivedBy: testUserId,
      items: [{
        purchaseOrderItemId: '',
        quantityReceived: 60,
        quantityRejected: 0,
        unitCost: 10.00,
        qualityStatus: 'ACCEPTED' as const
      }],
      createdBy: testUserId
    }
    
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: testPurchaseOrderId },
      include: { items: true }
    })
    receiptData.items[0].purchaseOrderItemId = po!.items[0].id
    
    // Act
    const goodsReceipt = await goodsReceiptService.createGoodsReceipt(receiptData)
    
    // Assert
    expect(goodsReceipt.items[0].quantityReceived).toBe(60)
    
    // Verify PO status updated to partially received
    const updatedPO = await prisma.purchaseOrder.findUnique({
      where: { id: testPurchaseOrderId }
    })
    expect(updatedPO!.status).toBe('PARTIALLY_RECEIVED')
    
    // Verify stock movement for partial quantity
    const stockMovements = await prisma.stockMovement.findMany({
      where: { itemId: testItemId }
    })
    expect(stockMovements[0].quantity).toBe(60)
  })

  test('should handle rejected items correctly', async () => {
    // Arrange - Receive 80, reject 20
    const receiptData = {
      purchaseOrderId: testPurchaseOrderId,
      receiptNumber: 'GR-004',
      receivedDate: new Date(),
      receivedBy: testUserId,
      items: [{
        purchaseOrderItemId: '',
        quantityReceived: 80,
        quantityRejected: 20,
        unitCost: 10.00,
        qualityStatus: 'PARTIALLY_ACCEPTED' as const,
        rejectionReason: 'Quality issues with 20 units'
      }],
      createdBy: testUserId
    }
    
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: testPurchaseOrderId },
      include: { items: true }
    })
    receiptData.items[0].purchaseOrderItemId = po!.items[0].id
    
    // Act
    const goodsReceipt = await goodsReceiptService.createGoodsReceipt(receiptData)
    
    // Assert
    expect(goodsReceipt.items[0].quantityReceived).toBe(80)
    expect(goodsReceipt.items[0].quantityRejected).toBe(20)
    expect(goodsReceipt.items[0].qualityStatus).toBe('PARTIALLY_ACCEPTED')
    
    // Verify only accepted quantity goes to inventory
    const stockLots = await prisma.stockLot.findMany({
      where: { itemId: testItemId }
    })
    expect(stockLots[0].availableQty).toBe(80) // Only accepted quantity
  })

  test('should validate goods receipt against purchase order', async () => {
    // Arrange - Try to receive more than ordered
    const receiptData = {
      purchaseOrderId: testPurchaseOrderId,
      receiptNumber: 'GR-005',
      receivedDate: new Date(),
      receivedBy: testUserId,
      items: [{
        purchaseOrderItemId: '',
        quantityReceived: 150, // More than ordered (100)
        quantityRejected: 0,
        unitCost: 10.00,
        qualityStatus: 'ACCEPTED' as const
      }],
      createdBy: testUserId
    }
    
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: testPurchaseOrderId },
      include: { items: true }
    })
    receiptData.items[0].purchaseOrderItemId = po!.items[0].id
    
    // Act & Assert
    await expect(
      goodsReceiptService.createGoodsReceipt(receiptData)
    ).rejects.toThrow('Cannot receive more than ordered quantity')
  })

  test('should update purchase order status when fully received', async () => {
    // Arrange - Receive full quantity
    const receiptData = {
      purchaseOrderId: testPurchaseOrderId,
      receiptNumber: 'GR-006',
      receivedDate: new Date(),
      receivedBy: testUserId,
      items: [{
        purchaseOrderItemId: '',
        quantityReceived: 100, // Full quantity
        quantityRejected: 0,
        unitCost: 10.00,
        qualityStatus: 'ACCEPTED' as const
      }],
      createdBy: testUserId
    }
    
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: testPurchaseOrderId },
      include: { items: true }
    })
    receiptData.items[0].purchaseOrderItemId = po!.items[0].id
    
    // Act
    await goodsReceiptService.createGoodsReceipt(receiptData)
    
    // Assert
    const updatedPO = await prisma.purchaseOrder.findUnique({
      where: { id: testPurchaseOrderId }
    })
    expect(updatedPO!.status).toBe('RECEIVED')
  })

  test('should generate sequential receipt numbers', async () => {
    // Arrange & Act - Create multiple receipts
    const receipt1Data = {
      purchaseOrderId: testPurchaseOrderId,
      receivedDate: new Date(),
      receivedBy: testUserId,
      items: [{
        purchaseOrderItemId: '',
        quantityReceived: 30,
        quantityRejected: 0,
        unitCost: 10.00,
        qualityStatus: 'ACCEPTED' as const
      }],
      createdBy: testUserId
    }
    
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: testPurchaseOrderId },
      include: { items: true }
    })
    receipt1Data.items[0].purchaseOrderItemId = po!.items[0].id
    
    const receipt1 = await goodsReceiptService.createGoodsReceipt(receipt1Data)
    
    const receipt2Data = { ...receipt1Data }
    receipt2Data.items[0].quantityReceived = 30
    
    const receipt2 = await goodsReceiptService.createGoodsReceipt(receipt2Data)
    
    // Assert
    expect(receipt1.receiptNumber).toMatch(/^GR-\d{4}$/)
    expect(receipt2.receiptNumber).toMatch(/^GR-\d{4}$/)
    expect(receipt1.receiptNumber).not.toBe(receipt2.receiptNumber)
    
    // Extract numbers and verify sequence
    const num1 = parseInt(receipt1.receiptNumber.split('-')[1])
    const num2 = parseInt(receipt2.receiptNumber.split('-')[1])
    expect(num2).toBe(num1 + 1)
  })
})