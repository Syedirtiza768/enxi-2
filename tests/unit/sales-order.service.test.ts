import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { SalesOrderService } from '@/lib/services/sales-order.service'
import { QuotationService } from '@/lib/services/quotation.service'
import { CustomerService } from '@/lib/services/customer.service'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { OrderStatus, QuotationStatus } from '@/lib/generated/prisma'
import { prisma } from '@/lib/db/prisma'

describe('Sales Order Service', () => {
  jest.setTimeout(30000)
  let service: SalesOrderService
  let quotationService: QuotationService
  let customerService: CustomerService
  let salesCaseService: SalesCaseService
  let testUserId: string
  let testCustomerId: string
  let testSalesCaseId: string
  let testQuotationId: string

  beforeEach(async () => {
    service = new SalesOrderService()
    quotationService = new QuotationService()
    customerService = new CustomerService()
    salesCaseService = new SalesCaseService()
    
    // Create a test user with unique identifier
    const timestamp = Date.now()
    const testUser = await prisma.user.create({
      data: {
        username: `salesordertest_${timestamp}`,
        email: `salesorder_${timestamp}@test.com`,
        password: 'hashedPassword',
        role: 'USER'
      }
    })
    testUserId = testUser.id

    // Create a test customer
    const testCustomer = await customerService.createCustomer({
      name: 'Sales Order Test Customer',
      email: 'customer@salesordertest.com',
      createdBy: testUserId
    })
    testCustomerId = testCustomer.id

    // Create a test sales case
    const testSalesCase = await salesCaseService.createSalesCase({
      customerId: testCustomerId,
      title: 'Sales Order Test Case',
      description: 'Test case for sales orders',
      estimatedValue: 50000,
      createdBy: testUserId
    })
    testSalesCaseId = testSalesCase.id

    // Create a test quotation
    const testQuotation = await quotationService.createQuotation({
      salesCaseId: testSalesCaseId,
      validUntil: new Date('2024-12-31'),
      items: [
        {
          itemCode: 'SO-001',
          description: 'Sales Order Test Item',
          quantity: 10,
          unitPrice: 100,
          discount: 5,
          taxRate: 10
        }
      ],
      createdBy: testUserId
    })
    testQuotationId = testQuotation.id

    // Accept the quotation
    await quotationService.sendQuotation(testQuotationId, testUserId)
    await prisma.quotation.update({
      where: { id: testQuotationId },
      data: { status: QuotationStatus.ACCEPTED }
    })
  })

  afterEach(async () => {
    // Clean up test data in correct order
    await prisma.auditLog.deleteMany()
    await prisma.salesOrderItem.deleteMany()
    await prisma.salesOrder.deleteMany()
    await prisma.quotationItem.deleteMany()
    await prisma.quotation.deleteMany()
    await prisma.salesCase.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Sales Order Creation', () => {
    it('should create a sales order from scratch', async () => {
      const orderData = {
        salesCaseId: testSalesCaseId,
        paymentTerms: 'Net 30',
        shippingTerms: 'FOB Origin',
        notes: 'Test sales order',
        items: [
          {
            itemCode: 'ITEM-001',
            description: 'Test Item 1',
            quantity: 5,
            unitPrice: 200,
            discount: 10,
            taxRate: 8.5
          },
          {
            itemCode: 'ITEM-002',
            description: 'Test Item 2',
            quantity: 3,
            unitPrice: 150,
            discount: 0,
            taxRate: 8.5
          }
        ],
        createdBy: testUserId
      }

      const salesOrder = await service.createSalesOrder(orderData)

      expect(salesOrder).toBeDefined()
      expect(salesOrder.orderNumber).toMatch(/^SO\d{4}\d{6}$/)
      expect(salesOrder.status).toBe(OrderStatus.PENDING)
      expect(salesOrder.salesCaseId).toBe(testSalesCaseId)
      expect(salesOrder.items).toHaveLength(2)
      expect(salesOrder.totalAmount).toBeGreaterThan(0)
    })

    it('should create a sales order from accepted quotation', async () => {
      const orderData = {
        quotationId: testQuotationId,
        salesCaseId: testSalesCaseId,
        customerPO: 'PO-12345',
        shippingAddress: '123 Customer Street',
        items: [
          {
            itemCode: 'SO-001',
            description: 'Sales Order Test Item',
            quantity: 10,
            unitPrice: 100,
            discount: 5,
            taxRate: 10
          }
        ],
        createdBy: testUserId
      }

      const salesOrder = await service.createSalesOrder(orderData)

      expect(salesOrder).toBeDefined()
      expect(salesOrder.quotationId).toBe(testQuotationId)
      expect(salesOrder.customerPO).toBe('PO-12345')
      expect(salesOrder.items).toHaveLength(1)
      expect(salesOrder.items[0].itemCode).toBe('SO-001')
    })

    it('should calculate totals correctly', async () => {
      const orderData = {
        salesCaseId: testSalesCaseId,
        items: [
          {
            itemCode: 'CALC-001',
            description: 'Calculation Test Item',
            quantity: 10,
            unitPrice: 100, // Subtotal: 1000
            discount: 10,    // Discount: 100
            taxRate: 8.5     // Tax on 900: 76.5
          }
        ],
        createdBy: testUserId
      }

      const salesOrder = await service.createSalesOrder(orderData)

      expect(salesOrder.subtotal).toBe(1000)
      expect(salesOrder.discountAmount).toBe(100)
      expect(salesOrder.taxAmount).toBe(76.5)
      expect(salesOrder.totalAmount).toBe(976.5) // 1000 - 100 + 76.5
    })

    it('should reject non-accepted quotations', async () => {
      // Reset quotation to SENT status
      await prisma.quotation.update({
        where: { id: testQuotationId },
        data: { status: QuotationStatus.SENT }
      })

      const orderData = {
        quotationId: testQuotationId,
        salesCaseId: testSalesCaseId,
        items: [
          {
            itemCode: 'SO-001',
            description: 'Test Item',
            quantity: 1,
            unitPrice: 100
          }
        ],
        createdBy: testUserId
      }

      await expect(service.createSalesOrder(orderData))
        .rejects.toThrow('Only accepted quotations can be converted to sales orders')
    })
  })

  describe('Sales Order Management', () => {
    let testSalesOrderId: string

    beforeEach(async () => {
      const orderData = {
        salesCaseId: testSalesCaseId,
        items: [
          {
            itemCode: 'MGMT-001',
            description: 'Management Test Item',
            quantity: 5,
            unitPrice: 200
          }
        ],
        createdBy: testUserId
      }

      const salesOrder = await service.createSalesOrder(orderData)
      testSalesOrderId = salesOrder.id
    })

    it('should get sales order by id', async () => {
      const salesOrder = await service.getSalesOrder(testSalesOrderId)

      expect(salesOrder).toBeDefined()
      expect(salesOrder!.id).toBe(testSalesOrderId)
      expect(salesOrder!.salesCase.customer.name).toBe('Sales Order Test Customer')
    })

    it('should update pending sales order', async () => {
      const updateData = {
        customerPO: 'UPDATED-PO-123',
        notes: 'Updated notes',
        items: [
          {
            itemCode: 'UPDATED-001',
            description: 'Updated Item',
            quantity: 3,
            unitPrice: 300
          }
        ],
        updatedBy: testUserId
      }

      const updatedOrder = await service.updateSalesOrder(testSalesOrderId, updateData)

      expect(updatedOrder.customerPO).toBe('UPDATED-PO-123')
      expect(updatedOrder.notes).toBe('Updated notes')
      expect(updatedOrder.items).toHaveLength(1)
      expect(updatedOrder.items[0].itemCode).toBe('UPDATED-001')
      expect(updatedOrder.totalAmount).toBe(900) // 3 * 300
    })

    it('should approve pending sales order', async () => {
      const approvedOrder = await service.approveSalesOrder(testSalesOrderId, testUserId)

      expect(approvedOrder.status).toBe(OrderStatus.APPROVED)
      expect(approvedOrder.approvedBy).toBe(testUserId)
      expect(approvedOrder.approvedAt).toBeDefined()
    })

    it('should cancel sales order with reason', async () => {
      const cancellationReason = 'Customer requested cancellation'
      const cancelledOrder = await service.cancelSalesOrder(
        testSalesOrderId,
        cancellationReason,
        testUserId
      )

      expect(cancelledOrder.status).toBe(OrderStatus.CANCELLED)
      expect(cancelledOrder.cancelledBy).toBe(testUserId)
      expect(cancelledOrder.cancelledAt).toBeDefined()
      expect(cancelledOrder.cancellationReason).toBe(cancellationReason)
    })

    it('should not update approved sales order', async () => {
      // First approve the order
      await service.approveSalesOrder(testSalesOrderId, testUserId)

      // Try to update
      await expect(service.updateSalesOrder(testSalesOrderId, {
        notes: 'Should not work',
        updatedBy: testUserId
      })).rejects.toThrow('Only pending orders can be updated')
    })

    it('should not approve already approved order', async () => {
      // First approve the order
      await service.approveSalesOrder(testSalesOrderId, testUserId)

      // Try to approve again
      await expect(service.approveSalesOrder(testSalesOrderId, testUserId))
        .rejects.toThrow('Only pending orders can be approved')
    })
  })

  describe('Quotation Conversion', () => {
    it('should convert accepted quotation to sales order', async () => {
      const additionalData = {
        customerPO: 'CONV-PO-123',
        shippingAddress: '456 Shipping Ave',
        requestedDate: new Date('2024-02-01'),
        createdBy: testUserId
      }

      const salesOrder = await service.convertQuotationToSalesOrder(
        testQuotationId,
        additionalData
      )

      expect(salesOrder).toBeDefined()
      expect(salesOrder.quotationId).toBe(testQuotationId)
      expect(salesOrder.customerPO).toBe('CONV-PO-123')
      expect(salesOrder.shippingAddress).toBe('456 Shipping Ave')
      expect(salesOrder.items).toHaveLength(1)
      expect(salesOrder.items[0].itemCode).toBe('SO-001')
    })

    it('should reject conversion of non-accepted quotation', async () => {
      // Reset quotation to DRAFT status
      await prisma.quotation.update({
        where: { id: testQuotationId },
        data: { status: QuotationStatus.DRAFT }
      })

      await expect(service.convertQuotationToSalesOrder(testQuotationId, {
        createdBy: testUserId
      })).rejects.toThrow('Only accepted quotations can be converted to sales orders')
    })
  })

  describe('Sales Order Filtering', () => {
    let pendingOrderId: string
    let approvedOrderId: string

    beforeEach(async () => {
      // Create pending order
      const pendingOrder = await service.createSalesOrder({
        salesCaseId: testSalesCaseId,
        notes: 'Pending order',
        items: [
          {
            itemCode: 'FILTER-001',
            description: 'Filter Test Item 1',
            quantity: 1,
            unitPrice: 100
          }
        ],
        createdBy: testUserId
      })
      pendingOrderId = pendingOrder.id

      // Create and approve another order
      const approvedOrder = await service.createSalesOrder({
        salesCaseId: testSalesCaseId,
        notes: 'Approved order',
        items: [
          {
            itemCode: 'FILTER-002',
            description: 'Filter Test Item 2',
            quantity: 2,
            unitPrice: 150
          }
        ],
        createdBy: testUserId
      })
      approvedOrderId = approvedOrder.id
      await service.approveSalesOrder(approvedOrderId, testUserId)
    })

    it('should filter by status', async () => {
      const pendingOrders = await service.getAllSalesOrders({ status: OrderStatus.PENDING })
      const approvedOrders = await service.getAllSalesOrders({ status: OrderStatus.APPROVED })

      expect(pendingOrders.some(o => o.id === pendingOrderId)).toBe(true)
      expect(approvedOrders.some(o => o.id === approvedOrderId)).toBe(true)
      expect(pendingOrders.some(o => o.id === approvedOrderId)).toBe(false)
    })

    it('should filter by customer', async () => {
      const customerOrders = await service.getAllSalesOrders({ customerId: testCustomerId })

      expect(customerOrders.length).toBeGreaterThanOrEqual(2)
      expect(customerOrders.every(o => o.salesCase.customer.id === testCustomerId)).toBe(true)
    })

    it('should filter by sales case', async () => {
      const caseOrders = await service.getAllSalesOrders({ salesCaseId: testSalesCaseId })

      expect(caseOrders.length).toBeGreaterThanOrEqual(2)
      expect(caseOrders.every(o => o.salesCaseId === testSalesCaseId)).toBe(true)
    })
  })

  describe('Order Number Generation', () => {
    it('should generate unique order numbers', async () => {
      const orderNumbers = new Set()

      for (let i = 0; i < 5; i++) {
        const order = await service.createSalesOrder({
          salesCaseId: testSalesCaseId,
          items: [
            {
              itemCode: `UNIQUE-${i}`,
              description: `Unique Item ${i}`,
              quantity: 1,
              unitPrice: 100
            }
          ],
          createdBy: testUserId
        })

        orderNumbers.add(order.orderNumber)
      }

      expect(orderNumbers.size).toBe(5) // All unique
    })

    it('should follow naming convention', async () => {
      const order = await service.createSalesOrder({
        salesCaseId: testSalesCaseId,
        items: [
          {
            itemCode: 'CONVENTION-001',
            description: 'Convention Test Item',
            quantity: 1,
            unitPrice: 100
          }
        ],
        createdBy: testUserId
      })

      const currentYear = new Date().getFullYear()
      expect(order.orderNumber).toMatch(new RegExp(`^SO${currentYear}\\d{6}$`))
    })
  })
})