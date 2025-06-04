import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/supplier-invoices/route'
import { prisma } from '@/lib/db/prisma'

// Mock JWT verification
jest.mock('@/lib/auth/server-auth', () => ({
  verifyJWTFromRequest: jest.fn().mockResolvedValue({
    id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    role: 'ADMIN'
  })
}))

describe('/api/supplier-invoices', () => {
  let testUserId: string
  let testSupplierId: string
  let testItemId: string
  let testGoodsReceiptId: string
  let testGoodsReceiptItemId: string
  let testSupplierAccountId: string
  let testInventoryAccountId: string

  beforeEach(async () => {
    // Create test data
    const testUser = await prisma.user.create({
      data: {
        username: 'testuser-si-api',
        email: 'testuser-si-api@test.com',
        password: 'hashedpassword',
        role: 'ADMIN'
      }
    })
    testUserId = testUser.id

    // Create supplier with AP account
    const supplier = await prisma.supplier.create({
      data: {
        supplierNumber: 'SUP-API-SI-001',
        name: 'Test Supplier SI API',
        email: 'supplier-si-api@test.com',
        currency: 'USD',
        paymentTerms: 30,
        createdBy: testUserId
      }
    })
    testSupplierId = supplier.id

    // Create supplier AP account
    const supplierAccount = await prisma.account.create({
      data: {
        code: `2100-${supplier.id}`,
        name: `Accounts Payable - ${supplier.name}`,
        type: 'LIABILITY',
        parentAccountId: null,
        createdBy: testUserId
      }
    })
    testSupplierAccountId = supplierAccount.id

    // Create inventory account
    const inventoryAccount = await prisma.account.create({
      data: {
        code: '1300-API-SI',
        name: 'Test Inventory Account SI API',
        type: 'ASSET',
        createdBy: testUserId
      }
    })
    testInventoryAccountId = inventoryAccount.id

    // Create category and UOM
    const category = await prisma.category.create({
      data: {
        name: 'Test Category SI API',
        code: 'CAT-SI-API',
        createdBy: testUserId
      }
    })

    const uom = await prisma.unitOfMeasure.create({
      data: {
        code: 'PCS-SI-API',
        name: 'Pieces',
        symbol: 'pcs'
      }
    })

    // Create item
    const item = await prisma.item.create({
      data: {
        code: 'ITEM-SI-API-001',
        name: 'Test Item SI API',
        categoryId: category.id,
        unitOfMeasureId: uom.id,
        standardCost: 25.00,
        trackInventory: true,
        inventoryAccountId: inventoryAccount.id,
        createdBy: testUserId
      }
    })
    testItemId = item.id

    // Create purchase order
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        orderNumber: 'PO-SI-API-001',
        supplierId: testSupplierId,
        orderDate: new Date(),
        currency: 'USD',
        status: 'CONFIRMED',
        subtotal: 2500.00,
        taxAmount: 0,
        shippingAmount: 0,
        totalAmount: 2500.00,
        createdBy: testUserId
      }
    })

    const poItem = await prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: purchaseOrder.id,
        itemId: testItemId,
        quantity: 100,
        unitPrice: 25.00,
        totalPrice: 2500.00
      }
    })

    // Create goods receipt
    const goodsReceipt = await prisma.goodsReceipt.create({
      data: {
        receiptNumber: 'GR-SI-API-001',
        purchaseOrderId: purchaseOrder.id,
        receivedDate: new Date(),
        receivedBy: testUserId,
        status: 'RECEIVED',
        totalReceived: 2500.00,
        createdBy: testUserId
      }
    })
    testGoodsReceiptId = goodsReceipt.id

    const grItem = await prisma.goodsReceiptItem.create({
      data: {
        goodsReceiptId: goodsReceipt.id,
        purchaseOrderItemId: poItem.id,
        quantityReceived: 100,
        quantityRejected: 0,
        unitCost: 25.00,
        qualityStatus: 'ACCEPTED'
      }
    })
    testGoodsReceiptItemId = grItem.id
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.supplierInvoiceItem.deleteMany()
    await prisma.supplierInvoice.deleteMany({
      where: { supplierId: testSupplierId }
    })
    await prisma.goodsReceiptItem.deleteMany({
      where: { goodsReceiptId: testGoodsReceiptId }
    })
    await prisma.goodsReceipt.deleteMany({
      where: { id: testGoodsReceiptId }
    })
    await prisma.purchaseOrderItem.deleteMany()
    await prisma.purchaseOrder.deleteMany({
      where: { supplierId: testSupplierId }
    })
    await prisma.item.deleteMany({
      where: { createdBy: testUserId }
    })
    await prisma.category.deleteMany({
      where: { createdBy: testUserId }
    })
    await prisma.unitOfMeasure.deleteMany({
      where: { code: { startsWith: 'PCS-SI-API' } }
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

  describe('GET /api/supplier-invoices', () => {
    test('should return empty array when no invoices exist', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/supplier-invoices')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.data).toEqual([])
    })

    test('should return supplier invoices with filtering', async () => {
      // Arrange - Create a supplier invoice first
      const supplierInvoice = await prisma.supplierInvoice.create({
        data: {
          invoiceNumber: 'INV-API-001',
          supplierId: testSupplierId,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          currency: 'USD',
          status: 'POSTED',
          matchingStatus: 'FULLY_MATCHED',
          subtotal: 2500.00,
          taxAmount: 0,
          totalAmount: 2500.00,
          supplierAccountId: testSupplierAccountId,
          createdBy: testUserId
        }
      })

      await prisma.supplierInvoiceItem.create({
        data: {
          supplierInvoiceId: supplierInvoice.id,
          goodsReceiptItemId: testGoodsReceiptItemId,
          description: 'Test Item SI API',
          quantity: 100,
          unitPrice: 25.00,
          totalAmount: 2500.00,
          accountId: testInventoryAccountId,
          taxAmount: 0
        }
      })

      const request = new NextRequest('http://localhost:3000/api/supplier-invoices')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].invoiceNumber).toBe('INV-API-001')
      expect(data.data[0].status).toBe('POSTED')
      expect(data.data[0].totalAmount).toBe(2500.00)
    })

    test('should filter by supplier ID', async () => {
      // Arrange
      const supplierInvoice = await prisma.supplierInvoice.create({
        data: {
          invoiceNumber: 'INV-API-002',
          supplierId: testSupplierId,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          currency: 'USD',
          status: 'POSTED',
          matchingStatus: 'FULLY_MATCHED',
          subtotal: 1250.00,
          taxAmount: 0,
          totalAmount: 1250.00,
          supplierAccountId: testSupplierAccountId,
          createdBy: testUserId
        }
      })

      const url = `http://localhost:3000/api/supplier-invoices?supplierId=${testSupplierId}`
      const request = new NextRequest(url)

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].supplierId).toBe(testSupplierId)
    })

    test('should filter by status', async () => {
      // Arrange
      await prisma.supplierInvoice.createMany({
        data: [
          {
            invoiceNumber: 'INV-API-003',
            supplierId: testSupplierId,
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            currency: 'USD',
            status: 'DRAFT',
            matchingStatus: 'PENDING',
            subtotal: 500.00,
            taxAmount: 0,
            totalAmount: 500.00,
            supplierAccountId: testSupplierAccountId,
            createdBy: testUserId
          },
          {
            invoiceNumber: 'INV-API-004',
            supplierId: testSupplierId,
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            currency: 'USD',
            status: 'POSTED',
            matchingStatus: 'FULLY_MATCHED',
            subtotal: 750.00,
            taxAmount: 0,
            totalAmount: 750.00,
            supplierAccountId: testSupplierAccountId,
            createdBy: testUserId
          }
        ]
      })

      const url = 'http://localhost:3000/api/supplier-invoices?status=POSTED'
      const request = new NextRequest(url)

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].status).toBe('POSTED')
    })
  })

  describe('POST /api/supplier-invoices', () => {
    test('should create a new supplier invoice successfully', async () => {
      // Arrange
      const invoiceData = {
        supplierId: testSupplierId,
        invoiceNumber: 'INV-API-005',
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'USD',
        items: [{
          goodsReceiptItemId: testGoodsReceiptItemId,
          description: 'Test Item for API Invoice',
          quantity: 100,
          unitPrice: 25.00,
          totalAmount: 2500.00,
          accountId: testInventoryAccountId,
          taxAmount: 0
        }],
        subtotal: 2500.00,
        taxAmount: 0,
        totalAmount: 2500.00,
        notes: 'Test supplier invoice via API'
      }

      const request = new NextRequest('http://localhost:3000/api/supplier-invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.data.invoiceNumber).toBe('INV-API-005')
      expect(data.data.status).toBe('POSTED')
      expect(data.data.items).toHaveLength(1)
      expect(data.data.items[0].totalAmount).toBe(2500.00)
      expect(data.data.totalAmount).toBe(2500.00)

      // Verify database record
      const dbInvoice = await prisma.supplierInvoice.findUnique({
        where: { id: data.data.id },
        include: { items: true }
      })
      expect(dbInvoice).toBeDefined()
      expect(dbInvoice!.items).toHaveLength(1)
    })

    test('should reject invoice with missing required fields', async () => {
      // Arrange
      const incompleteData = {
        supplierId: testSupplierId,
        // Missing invoiceNumber, invoiceDate, etc.
        items: []
      }

      const request = new NextRequest('http://localhost:3000/api/supplier-invoices', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toContain('required')
    })

    test('should reject invoice with invalid supplier', async () => {
      // Arrange
      const invalidInvoiceData = {
        supplierId: 'invalid-supplier-id',
        invoiceNumber: 'INV-API-006',
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'USD',
        items: [{
          goodsReceiptItemId: testGoodsReceiptItemId,
          description: 'Invalid supplier invoice',
          quantity: 50,
          unitPrice: 25.00,
          totalAmount: 1250.00,
          accountId: testInventoryAccountId,
          taxAmount: 0
        }],
        subtotal: 1250.00,
        taxAmount: 0,
        totalAmount: 1250.00
      }

      const request = new NextRequest('http://localhost:3000/api/supplier-invoices', {
        method: 'POST',
        body: JSON.stringify(invalidInvoiceData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    test('should validate three-way matching', async () => {
      // Arrange - Try to invoice more than received
      const overInvoiceData = {
        supplierId: testSupplierId,
        invoiceNumber: 'INV-API-007',
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'USD',
        items: [{
          goodsReceiptItemId: testGoodsReceiptItemId,
          description: 'Over-invoice test',
          quantity: 150, // More than received (100)
          unitPrice: 25.00,
          totalAmount: 3750.00,
          accountId: testInventoryAccountId,
          taxAmount: 0
        }],
        subtotal: 3750.00,
        taxAmount: 0,
        totalAmount: 3750.00
      }

      const request = new NextRequest('http://localhost:3000/api/supplier-invoices', {
        method: 'POST',
        body: JSON.stringify(overInvoiceData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toContain('exceeds received quantity')
    })

    test('should handle duplicate invoice numbers', async () => {
      // Arrange - Create first invoice
      const firstInvoiceData = {
        supplierId: testSupplierId,
        invoiceNumber: 'INV-API-008',
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'USD',
        items: [{
          goodsReceiptItemId: testGoodsReceiptItemId,
          description: 'First invoice',
          quantity: 50,
          unitPrice: 25.00,
          totalAmount: 1250.00,
          accountId: testInventoryAccountId,
          taxAmount: 0
        }],
        subtotal: 1250.00,
        taxAmount: 0,
        totalAmount: 1250.00
      }

      const firstRequest = new NextRequest('http://localhost:3000/api/supplier-invoices', {
        method: 'POST',
        body: JSON.stringify(firstInvoiceData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      await POST(firstRequest) // Create first invoice

      // Try to create duplicate
      const duplicateRequest = new NextRequest('http://localhost:3000/api/supplier-invoices', {
        method: 'POST',
        body: JSON.stringify(firstInvoiceData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Act
      const response = await POST(duplicateRequest)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toContain('already exists')
    })

    test('should create journal entry for GL posting', async () => {
      // Arrange
      const invoiceData = {
        supplierId: testSupplierId,
        invoiceNumber: 'INV-API-009',
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'USD',
        items: [{
          goodsReceiptItemId: testGoodsReceiptItemId,
          description: 'GL posting test',
          quantity: 80,
          unitPrice: 25.00,
          totalAmount: 2000.00,
          accountId: testInventoryAccountId,
          taxAmount: 0
        }],
        subtotal: 2000.00,
        taxAmount: 0,
        totalAmount: 2000.00
      }

      const request = new NextRequest('http://localhost:3000/api/supplier-invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(201)

      // Verify journal entry was created
      const journalEntries = await prisma.journalEntry.findMany({
        where: {
          description: { contains: 'INV-API-009' }
        },
        include: { lines: true }
      })

      expect(journalEntries).toHaveLength(1)
      expect(journalEntries[0].lines).toHaveLength(2) // Inventory debit + AP credit

      const debitLine = journalEntries[0].lines.find(line => line.debitAmount > 0)
      const creditLine = journalEntries[0].lines.find(line => line.creditAmount > 0)

      expect(debitLine!.accountId).toBe(testInventoryAccountId)
      expect(creditLine!.accountId).toBe(testSupplierAccountId)
      expect(debitLine!.debitAmount).toBe(2000)
      expect(creditLine!.creditAmount).toBe(2000)
    })
  })
})