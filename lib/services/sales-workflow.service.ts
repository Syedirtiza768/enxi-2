import { BaseService } from './base.service'
import { prisma } from '@/lib/db/prisma'
import { SalesOrderService } from './sales-order.service'
import { InvoiceService } from './invoice.service'
import { ShipmentService } from './shipment.service'
import { StockMovementService } from './inventory/stock-movement.service'
import { 
  OrderStatus, 
  ShipmentStatus, 
  InvoiceStatus,
  InvoiceType,
  StockMovementType,
  SalesOrder,
  Shipment,
  Invoice
} from '@/lib/generated/prisma'

/**
 * Sales Workflow Orchestration Service
 * Coordinates automatic actions across the sales-to-cash process
 */
export class SalesWorkflowService extends BaseService {
  private salesOrderService: SalesOrderService
  private invoiceService: InvoiceService
  private shipmentService: ShipmentService
  private stockMovementService: StockMovementService

  constructor() {
    super('SalesWorkflowService')
    this.salesOrderService = new SalesOrderService()
    this.invoiceService = new InvoiceService()
    this.shipmentService = new ShipmentService()
    this.stockMovementService = new StockMovementService()
  }

  /**
   * Orchestrate actions when a sales order is approved
   */
  async onOrderApproved(orderId: string, userId: string): Promise<{
    stockAllocated: boolean
    stockReservations: any[]
    shipmentCreated?: string
    notifications?: string[]
  }> {
    return this.withLogging('onOrderApproved', async () => {
      const order = await prisma.salesOrder.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              item: true
            }
          },
          salesCase: {
            include: {
              customer: true
            }
          }
        }
      })

      if (!order) {
        throw new Error('Sales order not found')
      }

      if (order.status !== OrderStatus.APPROVED) {
        throw new Error('Order must be approved to trigger workflow')
      }

      const results = {
        stockAllocated: false,
        stockReservations: [] as any[],
        notifications: [] as string[]
      }

      // Step 1: Allocate stock for all items
      try {
        const stockAllocation = await this.allocateStockForOrder(order, userId)
        results.stockAllocated = stockAllocation.success
        results.stockReservations = stockAllocation.reservations

        if (stockAllocation.success) {
          // Step 2: Update order status to PROCESSING
          await prisma.salesOrder.update({
            where: { id: orderId },
            data: { 
              status: OrderStatus.PROCESSING,
              updatedAt: new Date()
            }
          })

          // Step 3: Create shipment preparation
          const shipment = await this.createShipmentForOrder(order, userId)
          if (shipment) {
            results.shipmentCreated = shipment.id
          }

          results.notifications.push('Order approved and stock allocated successfully')
        } else {
          // Handle partial allocation
          await prisma.salesOrder.update({
            where: { id: orderId },
            data: { 
              status: OrderStatus.ON_HOLD,
              updatedAt: new Date()
            }
          })
          results.notifications.push('Order on hold due to insufficient stock')
        }
      } catch (error) {
        console.error('Error in order approval workflow:', error)
        throw new Error(`Failed to process order approval: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      return results
    })
  }

  /**
   * Orchestrate actions when a shipment is delivered
   */
  async onShipmentDelivered(shipmentId: string, userId: string): Promise<{
    invoiceCreated: boolean
    invoiceId?: string
    orderStatusUpdated: boolean
    glEntriesCreated: boolean
  }> {
    return this.withLogging('onShipmentDelivered', async () => {
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          salesOrder: {
            include: {
              items: true,
              salesCase: {
                include: {
                  customer: true
                }
              }
            }
          },
          items: true
        }
      })

      if (!shipment) {
        throw new Error('Shipment not found')
      }

      if (shipment.status !== ShipmentStatus.DELIVERED) {
        throw new Error('Shipment must be delivered to trigger workflow')
      }

      const results = {
        invoiceCreated: false,
        orderStatusUpdated: false,
        glEntriesCreated: false
      }

      try {
        // Step 1: Update sales order status to DELIVERED
        await prisma.salesOrder.update({
          where: { id: shipment.salesOrderId },
          data: { 
            status: OrderStatus.DELIVERED,
            updatedAt: new Date()
          }
        })
        results.orderStatusUpdated = true

        // Step 2: Auto-generate invoice if configured
        if (await this.shouldAutoInvoiceOnDelivery(shipment.salesOrder)) {
          const invoice = await this.createInvoiceFromShipment(shipment, userId)
          if (invoice) {
            results.invoiceCreated = true
            results.invoiceId = invoice.id
          }
        }

        // Step 3: Create GL entries for delivered goods
        await this.createDeliveryGLEntries(shipment, userId)
        results.glEntriesCreated = true

        return results
      } catch (error) {
        console.error('Error in shipment delivery workflow:', error)
        throw new Error(`Failed to process shipment delivery: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    })
  }

  /**
   * Orchestrate actions when payment is received
   */
  async onPaymentReceived(invoiceId: string, paymentAmount: number, userId: string): Promise<{
    balanceUpdated: boolean
    invoiceStatusUpdated: boolean
    orderCompleted: boolean
  }> {
    return this.withLogging('onPaymentReceived', async () => {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          salesOrder: true,
          customer: true,
          payments: true
        }
      })

      if (!invoice) {
        throw new Error('Invoice not found')
      }

      const results = {
        balanceUpdated: false,
        invoiceStatusUpdated: false,
        orderCompleted: false
      }

      try {
        // Step 1: Update customer balance
        await this.updateCustomerBalance(invoice.customerId, paymentAmount, userId)
        results.balanceUpdated = true

        // Step 2: Check if invoice is fully paid
        const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0) + paymentAmount
        if (totalPaid >= invoice.totalAmount) {
          await prisma.invoice.update({
            where: { id: invoiceId },
            data: { 
              status: InvoiceStatus.PAID,
              updatedAt: new Date()
            }
          })
          results.invoiceStatusUpdated = true

          // Step 3: Complete the sales order if invoice is fully paid
          if (invoice.salesOrder) {
            await prisma.salesOrder.update({
              where: { id: invoice.salesOrder.id },
              data: { 
                status: OrderStatus.COMPLETED,
                updatedAt: new Date()
              }
            })
            results.orderCompleted = true
          }
        }

        return results
      } catch (error) {
        console.error('Error in payment received workflow:', error)
        throw new Error(`Failed to process payment: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    })
  }

  /**
   * Allocate stock for all items in a sales order
   */
  private async allocateStockForOrder(order: SalesOrder & { items: any[] }, userId: string) {
    const reservations = []
    let allItemsAllocated = true

    for (const orderItem of order.items) {
      if (orderItem.item && orderItem.item.trackStock) {
        try {
          // Check available stock
          const availableStock = await this.getAvailableStock(orderItem.itemId)
          
          if (availableStock >= orderItem.quantity) {
            // Create stock reservation
            const reservation = await prisma.stockReservation.create({
              data: {
                itemId: orderItem.itemId,
                salesOrderId: order.id,
                salesOrderItemId: orderItem.id,
                quantityReserved: orderItem.quantity,
                reservedBy: userId,
                status: 'ACTIVE'
              }
            })
            reservations.push(reservation)

            // Update order item with reserved quantity
            await prisma.salesOrderItem.update({
              where: { id: orderItem.id },
              data: { quantityReserved: orderItem.quantity }
            })
          } else {
            allItemsAllocated = false
            console.warn(`Insufficient stock for item ${orderItem.itemCode}: need ${orderItem.quantity}, available ${availableStock}`)
          }
        } catch (error) {
          console.error(`Error allocating stock for item ${orderItem.itemCode}:`, error)
          allItemsAllocated = false
        }
      }
    }

    return {
      success: allItemsAllocated,
      reservations
    }
  }

  /**
   * Create a shipment for an approved order
   */
  private async createShipmentForOrder(order: SalesOrder & { items: any[], salesCase: any }, userId: string) {
    try {
      return await this.shipmentService.createShipmentFromOrder(order.id, {
        items: order.items.map(item => ({
          salesOrderItemId: item.id,
          quantity: item.quantity
        })),
        shipFromAddress: 'Default Warehouse', // TODO: Make configurable
        createdBy: userId
      })
    } catch (error) {
      console.error('Error creating shipment for order:', error)
      return null
    }
  }

  /**
   * Check if auto-invoice should be created on delivery
   */
  private async shouldAutoInvoiceOnDelivery(salesOrder: SalesOrder): Promise<boolean> {
    // TODO: Make this configurable per customer or system setting
    return true // For now, always auto-invoice on delivery
  }

  /**
   * Create invoice from delivered shipment
   */
  private async createInvoiceFromShipment(shipment: Shipment & { salesOrder: any }, userId: string) {
    try {
      return await this.invoiceService.createInvoiceFromSalesOrder(shipment.salesOrderId, {
        type: InvoiceType.SALES,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        notes: `Auto-generated from shipment ${shipment.shipmentNumber}`,
        createdBy: userId
      })
    } catch (error) {
      console.error('Error creating invoice from shipment:', error)
      return null
    }
  }

  /**
   * Create GL entries for delivered goods
   */
  private async createDeliveryGLEntries(shipment: Shipment & { salesOrder: any, items: any[] }, userId: string) {
    // TODO: Implement GL entries for delivery
    // This should create entries for:
    // - Revenue recognition
    // - Cost of goods sold
    // - Inventory reduction
    console.log('GL entries for delivery would be created here')
  }

  /**
   * Update customer balance when payment is received
   */
  private async updateCustomerBalance(customerId: string, paymentAmount: number, userId: string) {
    // TODO: Implement customer balance tracking
    // This should update customer's outstanding balance
    console.log(`Customer ${customerId} balance would be updated by ${paymentAmount}`)
  }

  /**
   * Get available stock for an item (considering reservations)
   */
  private async getAvailableStock(itemId: string): Promise<number> {
    const stockSummary = await prisma.item.findUnique({
      where: { id: itemId },
      select: {
        stockOnHand: true,
        stockReserved: true
      }
    })

    if (!stockSummary) {
      return 0
    }

    return stockSummary.stockOnHand - stockSummary.stockReserved
  }
}