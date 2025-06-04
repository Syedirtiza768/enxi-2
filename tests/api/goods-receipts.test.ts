import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/goods-receipts/route'
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

describe('/api/goods-receipts', () => {
  let testUserId: string
  let testSupplierId: string
  let testItemId: string
  let testPurchaseOrderId: string
  let testPurchaseOrderItemId: string

  beforeEach(async () => {
    // Create test data
    const testUser = await prisma.user.create({
      data: {
        username: 'testuser-gr-api',
        email: 'testuser-gr-api@test.com',
        password: 'hashedpassword',
        role: 'ADMIN'
      }
    })
    testUserId = testUser.id

    // Create supplier
    const supplier = await prisma.supplier.create({
      data: {
        supplierNumber: 'SUP-API-001',
        name: 'Test Supplier API',
        email: 'supplier-api@test.com',
        currency: 'USD',
        paymentTerms: 30,
        createdBy: testUserId
      }
    })
    testSupplierId = supplier.id

    // Create category and UOM
    const category = await prisma.category.create({
      data: {
        name: 'Test Category API',
        code: 'CAT-API',
        createdBy: testUserId
      }
    })

    const uom = await prisma.unitOfMeasure.create({
      data: {
        code: 'PCS-API',
        name: 'Pieces',
        symbol: 'pcs'
      }
    })

    // Create GL accounts
    const inventoryAccount = await prisma.account.create({
      data: {
        code: '1300-API',
        name: 'Test Inventory Account API',
        type: 'ASSET',
        createdBy: testUserId
      }
    })

    const cogsAccount = await prisma.account.create({
      data: {
        code: '5100-API',
        name: 'Test COGS Account API',
        type: 'EXPENSE',
        createdBy: testUserId
      }
    })

    // Create item
    const item = await prisma.item.create({
      data: {
        code: 'ITEM-API-001',
        name: 'Test Item API',
        categoryId: category.id,
        unitOfMeasureId: uom.id,
        standardCost: 15.00,
        trackInventory: true,
        inventoryAccountId: inventoryAccount.id,
        cogsAccountId: cogsAccount.id,
        createdBy: testUserId
      }
    })
    testItemId = item.id

    // Create purchase order
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        orderNumber: 'PO-API-001',
        supplierId: testSupplierId,
        orderDate: new Date(),
        currency: 'USD',
        status: 'CONFIRMED',
        subtotal: 1500.00,
        taxAmount: 0,
        shippingAmount: 0,
        totalAmount: 1500.00,
        createdBy: testUserId
      }
    })
    testPurchaseOrderId = purchaseOrder.id

    // Create purchase order item
    const poItem = await prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: testPurchaseOrderId,
        itemId: testItemId,
        quantity: 100,
        unitPrice: 15.00,
        totalPrice: 1500.00
      }
    })
    testPurchaseOrderItemId = poItem.id
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
    await prisma.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: testPurchaseOrderId }
    })
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
      where: { code: { startsWith: 'PCS-API' } }
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

  describe('GET /api/goods-receipts', () => {
    test('should return empty array when no receipts exist', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/goods-receipts')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.data).toEqual([])
    })

    test('should return goods receipts with filtering', async () => {
      // Arrange - Create a goods receipt first
      const goodsReceipt = await prisma.goodsReceipt.create({
        data: {
          receiptNumber: 'GR-API-001',
          purchaseOrderId: testPurchaseOrderId,
          receivedDate: new Date(),
          receivedBy: testUserId,
          status: 'RECEIVED',
          totalReceived: 1200.00,
          createdBy: testUserId
        }
      })

      await prisma.goodsReceiptItem.create({
        data: {
          goodsReceiptId: goodsReceipt.id,
          purchaseOrderItemId: testPurchaseOrderItemId,
          quantityReceived: 80,
          quantityRejected: 0,
          unitCost: 15.00,
          qualityStatus: 'ACCEPTED'
        }
      })

      const request = new NextRequest('http://localhost:3000/api/goods-receipts')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].receiptNumber).toBe('GR-API-001')
      expect(data.data[0].status).toBe('RECEIVED')
    })

    test('should filter by purchase order ID', async () => {
      // Arrange
      const goodsReceipt = await prisma.goodsReceipt.create({
        data: {
          receiptNumber: 'GR-API-002',
          purchaseOrderId: testPurchaseOrderId,
          receivedDate: new Date(),
          receivedBy: testUserId,
          status: 'RECEIVED',
          totalReceived: 750.00,
          createdBy: testUserId
        }
      })

      const url = `http://localhost:3000/api/goods-receipts?purchaseOrderId=${testPurchaseOrderId}`
      const request = new NextRequest(url)

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].purchaseOrderId).toBe(testPurchaseOrderId)
    })
  })

  describe('POST /api/goods-receipts', () => {
    test('should create a new goods receipt successfully', async () => {
      // Arrange
      const receiptData = {
        purchaseOrderId: testPurchaseOrderId,
        receiptNumber: 'GR-API-003',
        receivedDate: new Date().toISOString(),
        receivedBy: testUserId,
        items: [{
          purchaseOrderItemId: testPurchaseOrderItemId,
          quantityReceived: 100,
          quantityRejected: 0,
          unitCost: 15.00,
          qualityStatus: 'ACCEPTED',
          notes: 'All items received in perfect condition'
        }],
        notes: 'Complete delivery as expected'
      }

      const request = new NextRequest('http://localhost:3000/api/goods-receipts', {
        method: 'POST',
        body: JSON.stringify(receiptData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.data.receiptNumber).toBe('GR-API-003')
      expect(data.data.status).toBe('RECEIVED')
      expect(data.data.items).toHaveLength(1)
      expect(data.data.items[0].quantityReceived).toBe(100)
      expect(data.data.totalReceived).toBe(1500.00) // 100 * 15.00

      // Verify database record
      const dbReceipt = await prisma.goodsReceipt.findUnique({
        where: { id: data.data.id },
        include: { items: true }
      })
      expect(dbReceipt).toBeDefined()
      expect(dbReceipt!.items).toHaveLength(1)
    })

    test('should reject receipt with missing required fields', async () => {
      // Arrange
      const incompleteData = {
        purchaseOrderId: testPurchaseOrderId,
        // Missing receiptNumber, receivedDate, etc.
        items: []
      }

      const request = new NextRequest('http://localhost:3000/api/goods-receipts', {
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

    test('should reject receipt with invalid purchase order', async () => {
      // Arrange
      const invalidReceiptData = {
        purchaseOrderId: 'invalid-po-id',
        receiptNumber: 'GR-API-004',
        receivedDate: new Date().toISOString(),
        receivedBy: testUserId,
        items: [{
          purchaseOrderItemId: testPurchaseOrderItemId,
          quantityReceived: 50,
          quantityRejected: 0,
          unitCost: 15.00,
          qualityStatus: 'ACCEPTED'
        }]
      }

      const request = new NextRequest('http://localhost:3000/api/goods-receipts', {
        method: 'POST',
        body: JSON.stringify(invalidReceiptData),
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

    test('should handle auto-generated receipt numbers', async () => {
      // Arrange
      const receiptData = {
        purchaseOrderId: testPurchaseOrderId,
        // No receiptNumber provided - should auto-generate
        receivedDate: new Date().toISOString(),
        receivedBy: testUserId,
        items: [{
          purchaseOrderItemId: testPurchaseOrderItemId,
          quantityReceived: 75,
          quantityRejected: 0,
          unitCost: 15.00,
          qualityStatus: 'ACCEPTED'
        }]
      }

      const request = new NextRequest('http://localhost:3000/api/goods-receipts', {
        method: 'POST',
        body: JSON.stringify(receiptData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.data.receiptNumber).toMatch(/^GR-\d{4}$/)
    })

    test('should update purchase order status after receipt', async () => {
      // Arrange
      const receiptData = {
        purchaseOrderId: testPurchaseOrderId,
        receiptNumber: 'GR-API-005',
        receivedDate: new Date().toISOString(),
        receivedBy: testUserId,
        items: [{
          purchaseOrderItemId: testPurchaseOrderItemId,
          quantityReceived: 100, // Full quantity
          quantityRejected: 0,
          unitCost: 15.00,
          qualityStatus: 'ACCEPTED'
        }]
      }

      const request = new NextRequest('http://localhost:3000/api/goods-receipts', {
        method: 'POST',
        body: JSON.stringify(receiptData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(201)

      // Verify PO status updated
      const updatedPO = await prisma.purchaseOrder.findUnique({
        where: { id: testPurchaseOrderId }
      })
      expect(updatedPO!.status).toBe('RECEIVED')
    })
  })
})