import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { SupplierInvoiceService } from '@/lib/services/purchase/supplier-invoice.service'
import { GoodsReceiptService } from '@/lib/services/purchase/goods-receipt.service'
import { PurchaseOrderService } from '@/lib/services/purchase/purchase-order.service'
import { SupplierService } from '@/lib/services/purchase/supplier.service'
import { ItemService } from '@/lib/services/inventory/item.service'
import { JournalEntryService } from '@/lib/services/accounting/journal-entry.service'
import { prisma } from '@/lib/db/prisma'

describe('Supplier Invoice Workflow Integration', () => {
  let supplierInvoiceService: SupplierInvoiceService
  let goodsReceiptService: GoodsReceiptService
  let purchaseOrderService: PurchaseOrderService
  let supplierService: SupplierService
  let itemService: ItemService
  let journalEntryService: JournalEntryService
  
  let testUserId: string
  let testSupplierId: string
  let testItemId: string
  let testPurchaseOrderId: string
  let testGoodsReceiptId: string
  let testSupplierAccountId: string
  
  beforeEach(async () => {
    // Initialize services
    supplierInvoiceService = new SupplierInvoiceService()
    goodsReceiptService = new GoodsReceiptService()
    purchaseOrderService = new PurchaseOrderService()
    supplierService = new SupplierService()
    itemService = new ItemService()
    journalEntryService = new JournalEntryService()
    
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        username: 'testuser-si',
        email: 'testuser-si@test.com',
        password: 'hashedpassword',
        role: 'ADMIN'
      }
    })
    testUserId = testUser.id
    
    // Create test supplier with AP account
    const supplier = await supplierService.createSupplier({
      supplierNumber: 'SUP-SI-001',
      name: 'Test Supplier for Invoice',
      email: 'supplier-si@test.com',
      currency: 'USD',
      paymentTerms: 30,
      createdBy: testUserId
    })
    testSupplierId = supplier.id
    
    // Get the supplier's AP account
    const supplierAccount = await prisma.account.findFirst({
      where: {
        code: { startsWith: `2100-${supplier.id}` }
      }
    })
    testSupplierAccountId = supplierAccount!.id
    
    // Create test inventory item with GL accounts
    const inventoryAccount = await prisma.account.create({
      data: {
        code: '1300-SI',
        name: 'Test Inventory Account SI',
        type: 'ASSET',
        createdBy: testUserId
      }
    })
    
    const cogsAccount = await prisma.account.create({
      data: {
        code: '5100-SI',
        name: 'Test COGS Account SI',
        type: 'EXPENSE',
        createdBy: testUserId
      }
    })
    
    const category = await prisma.category.create({
      data: {
        name: 'Test Category SI',
        code: 'CAT-SI',
        createdBy: testUserId
      }
    })
    
    const uom = await prisma.unitOfMeasure.create({
      data: {
        code: 'PCS-SI',
        name: 'Pieces',
        symbol: 'pcs'
      }
    })
    
    const item = await itemService.createItem({
      code: 'ITEM-SI-001',
      name: 'Test Item for Supplier Invoice',
      categoryId: category.id,
      unitOfMeasureId: uom.id,
      standardCost: 20.00,
      trackInventory: true,
      inventoryAccountId: inventoryAccount.id,
      cogsAccountId: cogsAccount.id,
      createdBy: testUserId
    })
    testItemId = item.id
    
    // Create test purchase order
    const purchaseOrder = await purchaseOrderService.createPurchaseOrder({
      orderNumber: 'PO-SI-001',
      supplierId: testSupplierId,
      orderDate: new Date(),
      currency: 'USD',
      items: [{
        itemId: testItemId,
        quantity: 50,
        unitPrice: 20.00,
        totalPrice: 1000.00
      }],
      subtotal: 1000.00,
      taxAmount: 0,
      shippingAmount: 0,
      totalAmount: 1000.00,
      createdBy: testUserId
    })
    testPurchaseOrderId = purchaseOrder.id
    
    // Create goods receipt
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: testPurchaseOrderId },
      include: { items: true }
    })
    
    const goodsReceipt = await goodsReceiptService.createGoodsReceipt({
      purchaseOrderId: testPurchaseOrderId,
      receiptNumber: 'GR-SI-001',
      receivedDate: new Date(),
      receivedBy: testUserId,
      items: [{
        purchaseOrderItemId: po!.items[0].id,
        quantityReceived: 50,
        quantityRejected: 0,
        unitCost: 20.00,
        qualityStatus: 'ACCEPTED' as const
      }],
      createdBy: testUserId
    })
    testGoodsReceiptId = goodsReceipt.id
  })
  
  afterEach(async () => {
    // Clean up test data
    await prisma.supplierPayment.deleteMany({
      where: { supplierId: testSupplierId }
    })
    await prisma.supplierInvoiceItem.deleteMany()
    await prisma.supplierInvoice.deleteMany({
      where: { supplierId: testSupplierId }
    })
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
      where: { code: { startsWith: 'PCS-SI' } }
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

  test('should create supplier invoice and post to GL', async () => {
    // Arrange
    const invoiceData = {
      supplierId: testSupplierId,
      invoiceNumber: 'INV-SI-001',
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      currency: 'USD',
      items: [{
        goodsReceiptItemId: '', // Will be set after fetching GR
        description: 'Test Item for Supplier Invoice',
        quantity: 50,
        unitPrice: 20.00,
        totalAmount: 1000.00,
        accountId: '', // Will be inventory account
        taxAmount: 0
      }],
      subtotal: 1000.00,
      taxAmount: 0,
      totalAmount: 1000.00,
      createdBy: testUserId
    }
    
    // Get goods receipt item ID
    const gr = await prisma.goodsReceipt.findUnique({
      where: { id: testGoodsReceiptId },
      include: { items: true }
    })
    invoiceData.items[0].goodsReceiptItemId = gr!.items[0].id
    
    // Get inventory account ID
    const inventoryAccount = await prisma.account.findFirst({
      where: { code: '1300-SI' }
    })
    invoiceData.items[0].accountId = inventoryAccount!.id
    
    // Act
    const supplierInvoice = await supplierInvoiceService.createSupplierInvoice(invoiceData)
    
    // Assert
    expect(supplierInvoice).toBeDefined()
    expect(supplierInvoice.invoiceNumber).toBe('INV-SI-001')
    expect(supplierInvoice.status).toBe('POSTED')
    expect(supplierInvoice.items).toHaveLength(1)
    expect(supplierInvoice.items[0].totalAmount).toBe(1000.00)
    
    // Verify journal entry was created for AP
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        description: { contains: 'Supplier Invoice' }
      },
      include: { lines: true }
    })
    
    expect(journalEntries.length).toBeGreaterThan(0)
    
    const journalEntry = journalEntries[0]
    expect(journalEntry.lines).toHaveLength(2)
    
    // Should have debit to inventory and credit to AP
    const debitLine = journalEntry.lines.find(line => line.debitAmount > 0)
    const creditLine = journalEntry.lines.find(line => line.creditAmount > 0)
    
    expect(debitLine).toBeDefined()
    expect(creditLine).toBeDefined()
    expect(debitLine!.debitAmount).toBe(1000)
    expect(creditLine!.creditAmount).toBe(1000)
    expect(creditLine!.accountId).toBe(testSupplierAccountId) // Credit to supplier AP account
  })

  test('should validate three-way matching during invoice creation', async () => {
    // Arrange - Try to invoice more than received
    const invalidInvoiceData = {
      supplierId: testSupplierId,
      invoiceNumber: 'INV-SI-002',
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currency: 'USD',
      items: [{
        goodsReceiptItemId: '',
        description: 'Test Item - Over Invoice',
        quantity: 60, // More than received (50)
        unitPrice: 20.00,
        totalAmount: 1200.00,
        accountId: '',
        taxAmount: 0
      }],
      subtotal: 1200.00,
      taxAmount: 0,
      totalAmount: 1200.00,
      createdBy: testUserId
    }
    
    const gr = await prisma.goodsReceipt.findUnique({
      where: { id: testGoodsReceiptId },
      include: { items: true }
    })
    invalidInvoiceData.items[0].goodsReceiptItemId = gr!.items[0].id
    
    const inventoryAccount = await prisma.account.findFirst({
      where: { code: '1300-SI' }
    })
    invalidInvoiceData.items[0].accountId = inventoryAccount!.id
    
    // Act & Assert
    await expect(
      supplierInvoiceService.createSupplierInvoice(invalidInvoiceData)
    ).rejects.toThrow('Invoice quantity exceeds received quantity')
  })

  test('should handle partial invoicing correctly', async () => {
    // Arrange - Invoice only part of what was received
    const partialInvoiceData = {
      supplierId: testSupplierId,
      invoiceNumber: 'INV-SI-003',
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currency: 'USD',
      items: [{
        goodsReceiptItemId: '',
        description: 'Test Item - Partial Invoice',
        quantity: 30, // Less than received (50)
        unitPrice: 20.00,
        totalAmount: 600.00,
        accountId: '',
        taxAmount: 0
      }],
      subtotal: 600.00,
      taxAmount: 0,
      totalAmount: 600.00,
      createdBy: testUserId
    }
    
    const gr = await prisma.goodsReceipt.findUnique({
      where: { id: testGoodsReceiptId },
      include: { items: true }
    })
    partialInvoiceData.items[0].goodsReceiptItemId = gr!.items[0].id
    
    const inventoryAccount = await prisma.account.findFirst({
      where: { code: '1300-SI' }
    })
    partialInvoiceData.items[0].accountId = inventoryAccount!.id
    
    // Act
    const supplierInvoice = await supplierInvoiceService.createSupplierInvoice(partialInvoiceData)
    
    // Assert
    expect(supplierInvoice.totalAmount).toBe(600.00)
    expect(supplierInvoice.matchingStatus).toBe('PARTIALLY_MATCHED')
    
    // Verify GL posting for partial amount
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        description: { contains: 'INV-SI-003' }
      },
      include: { lines: true }
    })
    
    const creditLine = journalEntries[0].lines.find(line => line.creditAmount > 0)
    expect(creditLine!.creditAmount).toBe(600) // Only the partial amount
  })

  test('should calculate and post tax amounts correctly', async () => {
    // Arrange
    const taxAccount = await prisma.account.create({
      data: {
        code: '2200-SI',
        name: 'Sales Tax Payable',
        type: 'LIABILITY',
        createdBy: testUserId
      }
    })
    
    const invoiceWithTaxData = {
      supplierId: testSupplierId,
      invoiceNumber: 'INV-SI-004',
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currency: 'USD',
      items: [{
        goodsReceiptItemId: '',
        description: 'Test Item with Tax',
        quantity: 50,
        unitPrice: 20.00,
        totalAmount: 1000.00,
        accountId: '',
        taxAmount: 80.00 // 8% tax
      }],
      subtotal: 1000.00,
      taxAmount: 80.00,
      totalAmount: 1080.00,
      taxAccountId: taxAccount.id,
      createdBy: testUserId
    }
    
    const gr = await prisma.goodsReceipt.findUnique({
      where: { id: testGoodsReceiptId },
      include: { items: true }
    })
    invoiceWithTaxData.items[0].goodsReceiptItemId = gr!.items[0].id
    
    const inventoryAccount = await prisma.account.findFirst({
      where: { code: '1300-SI' }
    })
    invoiceWithTaxData.items[0].accountId = inventoryAccount!.id
    
    // Act
    const supplierInvoice = await supplierInvoiceService.createSupplierInvoice(invoiceWithTaxData)
    
    // Assert
    expect(supplierInvoice.taxAmount).toBe(80.00)
    expect(supplierInvoice.totalAmount).toBe(1080.00)
    
    // Verify journal entry includes tax
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        description: { contains: 'INV-SI-004' }
      },
      include: { lines: true }
    })
    
    expect(journalEntries[0].lines).toHaveLength(3) // Inventory, Tax, AP
    
    const taxLine = journalEntries[0].lines.find(line => 
      line.accountId === taxAccount.id
    )
    expect(taxLine).toBeDefined()
    expect(taxLine!.debitAmount).toBe(80) // Tax is debited
  })

  test('should prevent duplicate invoice numbers', async () => {
    // Arrange
    const firstInvoiceData = {
      supplierId: testSupplierId,
      invoiceNumber: 'INV-SI-005',
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currency: 'USD',
      items: [{
        goodsReceiptItemId: '',
        description: 'First Invoice',
        quantity: 25,
        unitPrice: 20.00,
        totalAmount: 500.00,
        accountId: '',
        taxAmount: 0
      }],
      subtotal: 500.00,
      taxAmount: 0,
      totalAmount: 500.00,
      createdBy: testUserId
    }
    
    const gr = await prisma.goodsReceipt.findUnique({
      where: { id: testGoodsReceiptId },
      include: { items: true }
    })
    firstInvoiceData.items[0].goodsReceiptItemId = gr!.items[0].id
    
    const inventoryAccount = await prisma.account.findFirst({
      where: { code: '1300-SI' }
    })
    firstInvoiceData.items[0].accountId = inventoryAccount!.id
    
    // Create first invoice
    await supplierInvoiceService.createSupplierInvoice(firstInvoiceData)
    
    // Try to create duplicate
    const duplicateInvoiceData = { ...firstInvoiceData }
    duplicateInvoiceData.items[0].quantity = 20
    duplicateInvoiceData.items[0].totalAmount = 400.00
    duplicateInvoiceData.subtotal = 400.00
    duplicateInvoiceData.totalAmount = 400.00
    
    // Act & Assert
    await expect(
      supplierInvoiceService.createSupplierInvoice(duplicateInvoiceData)
    ).rejects.toThrow('Invoice number already exists')
  })

  test('should update supplier balance after invoice posting', async () => {
    // Arrange
    const initialBalance = await prisma.account.findUnique({
      where: { id: testSupplierAccountId },
      select: { balance: true }
    })
    
    const invoiceData = {
      supplierId: testSupplierId,
      invoiceNumber: 'INV-SI-006',
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currency: 'USD',
      items: [{
        goodsReceiptItemId: '',
        description: 'Balance Test Invoice',
        quantity: 40,
        unitPrice: 20.00,
        totalAmount: 800.00,
        accountId: '',
        taxAmount: 0
      }],
      subtotal: 800.00,
      taxAmount: 0,
      totalAmount: 800.00,
      createdBy: testUserId
    }
    
    const gr = await prisma.goodsReceipt.findUnique({
      where: { id: testGoodsReceiptId },
      include: { items: true }
    })
    invoiceData.items[0].goodsReceiptItemId = gr!.items[0].id
    
    const inventoryAccount = await prisma.account.findFirst({
      where: { code: '1300-SI' }
    })
    invoiceData.items[0].accountId = inventoryAccount!.id
    
    // Act
    await supplierInvoiceService.createSupplierInvoice(invoiceData)
    
    // Assert
    const updatedBalance = await prisma.account.findUnique({
      where: { id: testSupplierAccountId },
      select: { balance: true }
    })
    
    // AP account should have increased by invoice amount (credit balance)
    expect(updatedBalance!.balance).toBe(
      (initialBalance!.balance || 0) + 800.00
    )
  })
})