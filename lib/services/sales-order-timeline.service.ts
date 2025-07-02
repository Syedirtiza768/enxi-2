import { prisma } from '@/lib/db/prisma'
import { BaseService } from './base.service'
import { AuditAction, EntityType } from '@/lib/validators/audit.validator'

export interface TimelineEvent {
  id: string
  type: 'created' | 'updated' | 'approved' | 'shipped' | 'delivered' | 'invoiced' | 'cancelled' | 'shipment_created' | 'invoice_created' | 'payment_received' | 'status_changed'
  timestamp: Date
  title: string
  description: string
  metadata?: Record<string, any>
  user?: {
    id: string
    name: string
    email: string
  }
  relatedEntity?: {
    type: 'shipment' | 'invoice' | 'payment'
    id: string
    number: string
  }
}

export class SalesOrderTimelineService extends BaseService {
  constructor() {
    super('SalesOrderTimelineService')
  }

  async getTimeline(salesOrderId: string): Promise<TimelineEvent[]> {
    return this.withLogging('getTimeline', async () => {
      const events: TimelineEvent[] = []

      // Get sales order with all related data
      const salesOrder = await prisma.salesOrder.findUnique({
        where: { id: salesOrderId },
        include: {
          shipments: {
            orderBy: { createdAt: 'asc' }
          },
          invoices: {
            orderBy: { createdAt: 'asc' }
          }
        }
      })

      if (!salesOrder) {
        throw new Error('Sales order not found')
      }

      // Get audit logs for this sales order
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entityType: EntityType.SALES_ORDER,
          entityId: salesOrderId
        },
        include: {
          user: true
        },
        orderBy: { timestamp: 'asc' }
      })

      // Process audit logs into timeline events
      for (const log of auditLogs) {
        let event: TimelineEvent | null = null

        switch (log.action) {
          case AuditAction.CREATE:
            event = {
              id: log.id,
              type: 'created',
              timestamp: log.timestamp,
              title: 'Sales Order Created',
              description: `Sales order ${salesOrder.orderNumber} was created`,
              metadata: log.metadata as Record<string, any>,
              user: {
                id: log.user.id,
                name: log.user.username,
                email: log.user.email
              }
            }
            break

          case AuditAction.UPDATE:
            event = {
              id: log.id,
              type: 'updated',
              timestamp: log.timestamp,
              title: 'Sales Order Updated',
              description: this.getUpdateDescription(log.metadata as Record<string, any>),
              metadata: log.metadata as Record<string, any>,
              user: {
                id: log.user.id,
                name: log.user.username,
                email: log.user.email
              }
            }
            break

          case AuditAction.APPROVE:
            event = {
              id: log.id,
              type: 'approved',
              timestamp: log.timestamp,
              title: 'Sales Order Approved',
              description: 'Sales order has been approved and is ready for processing',
              metadata: log.metadata as Record<string, any>,
              user: {
                id: log.user.id,
                name: log.user.username,
                email: log.user.email
              }
            }
            break

          case AuditAction.CANCEL:
            event = {
              id: log.id,
              type: 'cancelled',
              timestamp: log.timestamp,
              title: 'Sales Order Cancelled',
              description: `Sales order was cancelled: ${(log.metadata as any)?.cancellationReason || 'No reason provided'}`,
              metadata: log.metadata as Record<string, any>,
              user: {
                id: log.user.id,
                name: log.user.username,
                email: log.user.email
              }
            }
            break
        }

        if (event) {
          events.push(event)
        }
      }

      // Add shipment events
      for (const shipment of salesOrder.shipments) {
        // Shipment created
        events.push({
          id: `shipment-created-${shipment.id}`,
          type: 'shipment_created',
          timestamp: shipment.createdAt,
          title: 'Shipment Created',
          description: `Shipment ${shipment.shipmentNumber} was created`,
          metadata: {
            carrier: shipment.carrier,
            trackingNumber: shipment.trackingNumber,
            shippingMethod: shipment.shippingMethod
          },
          relatedEntity: {
            type: 'shipment',
            id: shipment.id,
            number: shipment.shipmentNumber
          }
        })

        // Shipment shipped
        if (shipment.shippedAt) {
          events.push({
            id: `shipment-shipped-${shipment.id}`,
            type: 'shipped',
            timestamp: shipment.shippedAt,
            title: 'Order Shipped',
            description: `Shipment ${shipment.shipmentNumber} was dispatched`,
            metadata: {
              carrier: shipment.carrier,
              trackingNumber: shipment.trackingNumber
            },
            relatedEntity: {
              type: 'shipment',
              id: shipment.id,
              number: shipment.shipmentNumber
            }
          })
        }

        // Shipment delivered
        if (shipment.deliveredAt) {
          events.push({
            id: `shipment-delivered-${shipment.id}`,
            type: 'delivered',
            timestamp: shipment.deliveredAt,
            title: 'Order Delivered',
            description: `Shipment ${shipment.shipmentNumber} was delivered to customer`,
            relatedEntity: {
              type: 'shipment',
              id: shipment.id,
              number: shipment.shipmentNumber
            }
          })
        }
      }

      // Add invoice events
      for (const invoice of salesOrder.invoices) {
        events.push({
          id: `invoice-created-${invoice.id}`,
          type: 'invoice_created',
          timestamp: invoice.createdAt,
          title: 'Invoice Created',
          description: `Invoice ${invoice.invoiceNumber} was generated`,
          metadata: {
            amount: invoice.totalAmount,
            dueDate: invoice.dueDate,
            status: invoice.status
          },
          relatedEntity: {
            type: 'invoice',
            id: invoice.id,
            number: invoice.invoiceNumber
          }
        })

        // Get payments for this invoice
        const payments = await prisma.payment.findMany({
          where: { invoiceId: invoice.id },
          orderBy: { paymentDate: 'asc' }
        })

        for (const payment of payments) {
          events.push({
            id: `payment-received-${payment.id}`,
            type: 'payment_received',
            timestamp: payment.paymentDate,
            title: 'Payment Received',
            description: `Payment of ${payment.amount} received for invoice ${invoice.invoiceNumber}`,
            metadata: {
              amount: payment.amount,
              paymentMethod: payment.paymentMethod,
              reference: payment.reference
            },
            relatedEntity: {
              type: 'payment',
              id: payment.id,
              number: payment.paymentNumber
            }
          })
        }
      }

      // Sort events by timestamp (newest first)
      events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

      return events
    })
  }

  private getUpdateDescription(metadata: Record<string, any>): string {
    const changes = metadata.changes as string[] || []
    
    if (changes.includes('status')) {
      const prevStatus = metadata.previousStatus || 'Unknown'
      const newStatus = metadata.newStatus || 'Unknown'
      return `Status changed from ${prevStatus} to ${newStatus}`
    }
    
    if (changes.length === 1) {
      return `${this.formatFieldName(changes[0])} was updated`
    }
    
    if (changes.length > 1) {
      return `Multiple fields were updated: ${changes.map(c => this.formatFieldName(c)).join(', ')}`
    }
    
    return 'Sales order details were updated'
  }

  private formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  async addTimelineEvent(
    salesOrderId: string,
    event: {
      type: TimelineEvent['type']
      title: string
      description: string
      metadata?: Record<string, any>
      userId: string
      relatedEntity?: TimelineEvent['relatedEntity']
    }
  ): Promise<void> {
    return this.withLogging('addTimelineEvent', async () => {
      // For custom events, we can create audit log entries
      await prisma.auditLog.create({
        data: {
          userId: event.userId,
          action: this.mapEventTypeToAction(event.type),
          entityType: EntityType.SALES_ORDER,
          entityId: salesOrderId,
          metadata: {
            ...event.metadata,
            eventType: event.type,
            title: event.title,
            description: event.description,
            relatedEntity: event.relatedEntity
          }
        }
      })
    })
  }

  private mapEventTypeToAction(eventType: TimelineEvent['type']): AuditAction {
    const mapping: Record<string, AuditAction> = {
      'status_changed': AuditAction.UPDATE,
      'shipment_created': AuditAction.CREATE,
      'invoice_created': AuditAction.CREATE,
      'payment_received': AuditAction.UPDATE
    }

    return mapping[eventType] || AuditAction.UPDATE
  }
}