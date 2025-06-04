import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { CustomerService } from '@/lib/services/customer.service'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { QuotationService } from '@/lib/services/quotation.service'
import { SalesOrderService } from '@/lib/services/sales-order.service'
import { InvoiceService } from '@/lib/services/invoice.service'
import { prisma } from '@/lib/db/prisma'

describe('Order Fulfillment Workflow Integration Tests', () => {
  let customerService: CustomerService
  let salesCaseService: SalesCaseService
  let quotationService: QuotationService
  let salesOrderService: SalesOrderService
  let invoiceService: InvoiceService
  let testUserId: string

  beforeEach(async () => {
    // Initialize services
    customerService = new CustomerService()
    salesCaseService = new SalesCaseService()
    quotationService = new QuotationService()
    salesOrderService = new SalesOrderService()
    invoiceService = new InvoiceService()
    
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        username: 'fulfillmenttest',
        email: 'fulfillment@test.com',
        password: 'hashedPassword',
        role: 'USER'
      }
    })
    testUserId = testUser.id
  })

  afterEach(async () => {
    // Clean up in proper order to avoid foreign key constraints
    const tables = [
      'auditLog',
      'invoiceItem',
      'invoice',
      'salesOrderItem',
      'salesOrder',
      'quotationItem',
      'quotation',
      'salesCase',
      'customer',
      'user'
    ]
    
    for (const table of tables) {
      await (prisma as any)[table].deleteMany()
    }
  })

  describe('Complete Order Lifecycle', () => {
    it('should handle complete order fulfillment workflow', async () => {
      // 1. Create customer and sales case
      const customer = await customerService.createCustomer({
        name: 'Fulfillment Test Customer',
        email: 'customer@fulfillment.test',
        phone: '+1 (555) 123-4567',
        address: '123 Customer St, City, State 12345',
        createdBy: testUserId
      })

      const salesCase = await salesCaseService.createSalesCase({
        customerId: customer.id,
        title: 'Order Fulfillment Test Case',
        description: 'Test complete order fulfillment workflow',
        estimatedValue: 15000,
        createdBy: testUserId
      })

      // 2. Create and accept quotation
      const quotationData = {
        salesCaseId: salesCase.id,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentTerms: 'Net 30 days',
        deliveryTerms: 'FOB Origin',
        notes: 'Test quotation for fulfillment workflow',
        items: [
          {
            itemCode: 'FUL-001',
            description: 'Fulfillment Test Product',
            quantity: 10,
            unitPrice: 1000,
            discount: 0,
            taxRate: 10
          },
          {
            itemCode: 'FUL-002',
            description: 'Fulfillment Test Service',
            quantity: 5,
            unitPrice: 1000,
            discount: 5,
            taxRate: 0
          }
        ],
        createdBy: testUserId
      }

      const quotation = await quotationService.createQuotation(quotationData)
      
      // Send and accept quotation
      await quotationService.sendQuotation(quotation.id, testUserId)
      const acceptedQuotation = await quotationService.acceptQuotation(quotation.id, testUserId)
      
      expect(acceptedQuotation.status).toBe('ACCEPTED')

      // 3. Convert to sales order
      const salesOrderData = {
        quotationId: quotation.id,
        salesCaseId: salesCase.id,
        customerPO: 'PO-FUL-001',
        requestedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        promisedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        paymentTerms: 'Net 30 days',
        shippingTerms: 'FOB Origin',
        shippingAddress: '456 Delivery Ave, City, State 12345',
        billingAddress: '123 Customer St, City, State 12345',
        notes: 'Test sales order for fulfillment',
        items: quotationData.items,
        createdBy: testUserId
      }

      const salesOrder = await salesOrderService.createSalesOrder(salesOrderData)
      
      expect(salesOrder.status).toBe('DRAFT')
      expect(salesOrder.orderNumber).toMatch(/^SO-\d{4}-\d{4}$/)
      expect(salesOrder.items).toHaveLength(2)

      // 4. Approve order (DRAFT → CONFIRMED)
      const approvedOrder = await salesOrderService.approveSalesOrder(
        salesOrder.id,
        testUserId
      )
      
      expect(approvedOrder.status).toBe('CONFIRMED')

      // 5. Create invoice from approved order
      const invoiceData = {
        salesOrderId: salesOrder.id,
        customerId: customer.id,
        type: 'STANDARD' as const,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentTerms: 'Net 30 days',
        notes: 'Invoice from sales order',
        items: salesOrder.items.map(item => ({
          itemCode: item.itemCode,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxRate: item.taxRate
        })),
        createdBy: testUserId
      }

      const invoice = await invoiceService.createInvoice(invoiceData)
      
      expect(invoice.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/)
      expect(invoice.status).toBe('DRAFT')
      expect(invoice.items).toHaveLength(2)

      // Verify total amounts match
      expect(invoice.totalAmount).toBe(salesOrder.totalAmount)

      // 6. Test order cancellation with separate order
      const cancelOrderData = {
        salesCaseId: salesCase.id,
        customerPO: 'PO-CANCEL-TEST',
        items: [{
          itemCode: 'CANCEL-001',
          description: 'Cancellation Test Item',
          quantity: 1,
          unitPrice: 1000,
          discount: 0,
          taxRate: 0
        }],
        createdBy: testUserId
      }

      const cancelOrder = await salesOrderService.createSalesOrder(cancelOrderData)

      const cancelledOrder = await salesOrderService.cancelSalesOrder(
        cancelOrder.id,
        'Test cancellation',
        testUserId
      )
      
      expect(cancelledOrder.status).toBe('CANCELLED')
    })

    it('should handle order cancellation at different stages', async () => {
      // Create minimal order data
      const customer = await customerService.createCustomer({
        name: 'Cancellation Test Customer',
        email: 'cancel@test.com',
        createdBy: testUserId
      })

      const salesCase = await salesCaseService.createSalesCase({
        customerId: customer.id,
        title: 'Cancellation Test Case',
        description: 'Test order cancellation',
        estimatedValue: 5000,
        createdBy: testUserId
      })

      const salesOrderData = {
        salesCaseId: salesCase.id,
        customerPO: 'PO-CANCEL-001',
        items: [{
          itemCode: 'CANCEL-001',
          description: 'Cancellation Test Item',
          quantity: 1,
          unitPrice: 5000,
          discount: 0,
          taxRate: 0
        }],
        createdBy: testUserId
      }

      // Test cancellation from DRAFT status
      const draftOrder = await salesOrderService.createSalesOrder(salesOrderData)
      
      const cancelledFromDraft = await salesOrderService.cancelSalesOrder(
        draftOrder.id,
        'Customer requested cancellation',
        testUserId
      )
      
      expect(cancelledFromDraft.status).toBe('CANCELLED')
      expect(cancelledFromDraft.cancelReason).toBe('Customer requested cancellation')
      expect(cancelledFromDraft.cancelledAt).toBeDefined()

      // Test cancellation from CONFIRMED status
      const confirmedOrder = await salesOrderService.createSalesOrder({
        ...salesOrderData,
        customerPO: 'PO-CANCEL-002'
      })
      
      await salesOrderService.updateOrderStatus(confirmedOrder.id, 'CONFIRMED', testUserId)
      
      const cancelledFromConfirmed = await salesOrderService.cancelSalesOrder(
        confirmedOrder.id,
        'Inventory shortage',
        testUserId
      )
      
      expect(cancelledFromConfirmed.status).toBe('CANCELLED')
      expect(cancelledFromConfirmed.cancelReason).toBe('Inventory shortage')

      // Test that DELIVERED orders cannot be cancelled
      const deliveredOrder = await salesOrderService.createSalesOrder({
        ...salesOrderData,
        customerPO: 'PO-CANCEL-003'
      })
      
      await salesOrderService.updateOrderStatus(deliveredOrder.id, 'CONFIRMED', testUserId)
      await salesOrderService.updateOrderStatus(deliveredOrder.id, 'PROCESSING', testUserId)
      await salesOrderService.markAsShipped(deliveredOrder.id, 'TRACK123', testUserId)
      await salesOrderService.markAsDelivered(deliveredOrder.id, testUserId)

      await expect(
        salesOrderService.cancelSalesOrder(deliveredOrder.id, 'Cannot cancel', testUserId)
      ).rejects.toThrow('Cannot cancel delivered orders')
    })

    it('should track status transitions and timestamps correctly', async () => {
      // Create test data
      const customer = await customerService.createCustomer({
        name: 'Timestamp Test Customer',
        email: 'timestamp@test.com',
        createdBy: testUserId
      })

      const salesCase = await salesCaseService.createSalesCase({
        customerId: customer.id,
        title: 'Timestamp Test Case',
        description: 'Test status transition timestamps',
        estimatedValue: 2000,
        createdBy: testUserId
      })

      const salesOrderData = {
        salesCaseId: salesCase.id,
        customerPO: 'PO-TIMESTAMP-001',
        items: [{
          itemCode: 'TIME-001',
          description: 'Timestamp Test Item',
          quantity: 1,
          unitPrice: 2000,
          discount: 0,
          taxRate: 0
        }],
        createdBy: testUserId
      }

      const order = await salesOrderService.createSalesOrder(salesOrderData)
      const startTime = new Date()

      // Track each status transition
      await new Promise(resolve => setTimeout(resolve, 10)) // Small delay
      const confirmed = await salesOrderService.updateOrderStatus(order.id, 'CONFIRMED', testUserId)
      
      await new Promise(resolve => setTimeout(resolve, 10))
      const processing = await salesOrderService.updateOrderStatus(order.id, 'PROCESSING', testUserId)
      
      await new Promise(resolve => setTimeout(resolve, 10))
      const shipped = await salesOrderService.markAsShipped(order.id, 'TRACK456', testUserId)
      
      await new Promise(resolve => setTimeout(resolve, 10))
      const delivered = await salesOrderService.markAsDelivered(order.id, testUserId)

      // Verify timestamps are in correct order
      expect(new Date(order.createdAt).getTime()).toBeGreaterThanOrEqual(startTime.getTime())
      expect(new Date(confirmed.updatedAt).getTime()).toBeGreaterThan(new Date(order.createdAt).getTime())
      expect(new Date(processing.updatedAt).getTime()).toBeGreaterThan(new Date(confirmed.updatedAt).getTime())
      expect(new Date(shipped.shippedAt!).getTime()).toBeGreaterThan(new Date(processing.updatedAt).getTime())
      expect(new Date(delivered.deliveredAt!).getTime()).toBeGreaterThan(new Date(shipped.shippedAt!).getTime())

      // Verify tracking information
      expect(shipped.trackingNumber).toBe('TRACK456')
      expect(delivered.trackingNumber).toBe('TRACK456')
    })

    it('should prevent invalid status transitions', async () => {
      // Create test order
      const customer = await customerService.createCustomer({
        name: 'Invalid Transition Test',
        email: 'invalid@test.com',
        createdBy: testUserId
      })

      const salesCase = await salesCaseService.createSalesCase({
        customerId: customer.id,
        title: 'Invalid Transition Test',
        description: 'Test invalid status transitions',
        estimatedValue: 1000,
        createdBy: testUserId
      })

      const order = await salesOrderService.createSalesOrder({
        salesCaseId: salesCase.id,
        customerPO: 'PO-INVALID-001',
        items: [{
          itemCode: 'INVALID-001',
          description: 'Invalid Transition Test',
          quantity: 1,
          unitPrice: 1000,
          discount: 0,
          taxRate: 0
        }],
        createdBy: testUserId
      })

      // Test invalid transitions from DRAFT
      await expect(
        salesOrderService.updateOrderStatus(order.id, 'PROCESSING', testUserId)
      ).rejects.toThrow('Invalid status transition')

      await expect(
        salesOrderService.markAsShipped(order.id, 'TRACK789', testUserId)
      ).rejects.toThrow('Invalid status transition')

      await expect(
        salesOrderService.markAsDelivered(order.id, testUserId)
      ).rejects.toThrow('Invalid status transition')

      // Test valid transition to CONFIRMED
      const confirmed = await salesOrderService.updateOrderStatus(order.id, 'CONFIRMED', testUserId)
      expect(confirmed.status).toBe('CONFIRMED')

      // Test invalid transition from CONFIRMED directly to SHIPPED
      await expect(
        salesOrderService.markAsShipped(order.id, 'TRACK999', testUserId)
      ).rejects.toThrow('Invalid status transition')
    })

    // Note: Partial shipments and deliveries would be implemented in a future phase
    // This is a placeholder for advanced fulfillment features
  })

  describe('Order Validation and Business Rules', () => {
    it('should validate order modifications based on status', async () => {
      const customer = await customerService.createCustomer({
        name: 'Validation Test Customer',
        email: 'validation@test.com',
        createdBy: testUserId
      })

      const salesCase = await salesCaseService.createSalesCase({
        customerId: customer.id,
        title: 'Validation Test Case',
        description: 'Test order validation rules',
        estimatedValue: 1000,
        createdBy: testUserId
      })

      const order = await salesOrderService.createSalesOrder({
        salesCaseId: salesCase.id,
        customerPO: 'PO-VALIDATION-001',
        items: [{
          itemCode: 'VALIDATION-001',
          description: 'Validation Test Item',
          quantity: 1,
          unitPrice: 1000,
          discount: 0,
          taxRate: 0
        }],
        createdBy: testUserId
      })

      // Should be able to modify DRAFT orders
      const updatedDraft = await salesOrderService.updateSalesOrder(
        order.id,
        {
          notes: 'Updated notes for draft order',
          items: [{
            itemCode: 'VALIDATION-001',
            description: 'Updated validation test item',
            quantity: 2,
            unitPrice: 1000,
            discount: 0,
            taxRate: 0
          }]
        },
        testUserId
      )

      expect(updatedDraft.notes).toBe('Updated notes for draft order')
      expect(updatedDraft.items[0].quantity).toBe(2)

      // Move to CONFIRMED - should still allow some modifications
      await salesOrderService.updateOrderStatus(order.id, 'CONFIRMED', testUserId)
      
      const updatedConfirmed = await salesOrderService.updateSalesOrder(
        order.id,
        {
          notes: 'Updated notes for confirmed order'
          // Item modifications might be restricted
        },
        testUserId
      )

      expect(updatedConfirmed.notes).toBe('Updated notes for confirmed order')

      // Move to PROCESSING - should restrict modifications
      await salesOrderService.updateOrderStatus(order.id, 'PROCESSING', testUserId)

      await expect(
        salesOrderService.updateSalesOrder(
          order.id,
          {
            items: [{
              itemCode: 'VALIDATION-002',
              description: 'Should not be allowed',
              quantity: 1,
              unitPrice: 2000,
              discount: 0,
              taxRate: 0
            }]
          },
          testUserId
        )
      ).rejects.toThrow('Cannot modify items for orders in PROCESSING status')
    })

    it('should enforce business rules for status transitions', async () => {
      const customer = await customerService.createCustomer({
        name: 'Business Rules Test',
        email: 'business@test.com',
        createdBy: testUserId
      })

      const salesCase = await salesCaseService.createSalesCase({
        customerId: customer.id,
        title: 'Business Rules Test',
        description: 'Test business rule enforcement',
        estimatedValue: 5000,
        createdBy: testUserId
      })

      const order = await salesOrderService.createSalesOrder({
        salesCaseId: salesCase.id,
        customerPO: 'PO-RULES-001',
        items: [{
          itemCode: 'RULES-001',
          description: 'Business Rules Test Item',
          quantity: 1,
          unitPrice: 5000,
          discount: 0,
          taxRate: 0
        }],
        createdBy: testUserId
      })

      // Business rule: Cannot ship without confirming first
      await expect(
        salesOrderService.markAsShipped(order.id, 'TRACK123', testUserId)
      ).rejects.toThrow('Cannot ship order that is not in PROCESSING status')

      // Business rule: Cannot deliver without shipping first
      await expect(
        salesOrderService.markAsDelivered(order.id, testUserId)
      ).rejects.toThrow('Cannot deliver order that is not SHIPPED')

      // Business rule: Must have customer PO for confirmed orders (example)
      const orderWithoutPO = await salesOrderService.createSalesOrder({
        salesCaseId: salesCase.id,
        // customerPO: undefined, // No PO provided
        items: [{
          itemCode: 'RULES-002',
          description: 'No PO Test Item',
          quantity: 1,
          unitPrice: 1000,
          discount: 0,
          taxRate: 0
        }],
        createdBy: testUserId
      })

      await expect(
        salesOrderService.updateOrderStatus(orderWithoutPO.id, 'CONFIRMED', testUserId)
      ).rejects.toThrow('Customer PO is required for confirmed orders')
    })
  })
})