import { prisma } from '@/lib/db/prisma'
import { BaseService } from './base.service'
import { AuditService } from './audit.service'
import { QuotationService } from './quotation.service'
import { JournalEntryService } from './accounting/journal-entry.service'
import { 
  SalesOrder,
  SalesOrderItem,
  OrderStatus,
  QuotationStatus,
  Prisma
} from '@/lib/generated/prisma'

export interface SalesOrderWithDetails extends SalesOrder {
  salesCase: {
    id: string
    caseNumber: string
    title: string
    customer: {
      id: string
      name: string
      email: string
      phone?: string | null
      address?: string | null
    }
  }
  quotation?: {
    id: string
    quotationNumber: string
  } | null
  items: SalesOrderItem[]
}

export interface CreateSalesOrderInput {
  quotationId?: string
  salesCaseId: string
  requestedDate?: Date
  promisedDate?: Date
  paymentTerms?: string
  shippingTerms?: string
  shippingAddress?: string
  billingAddress?: string
  customerPO?: string
  notes?: string
  items: CreateSalesOrderItemInput[]
}

export interface CreateSalesOrderItemInput {
  itemId?: string
  itemCode: string
  description: string
  quantity: number
  unitPrice: number
  discount?: number
  taxRate?: number
  unitOfMeasureId?: string
}

export interface UpdateSalesOrderInput {
  requestedDate?: Date
  promisedDate?: Date
  paymentTerms?: string
  shippingTerms?: string
  shippingAddress?: string
  billingAddress?: string
  customerPO?: string
  notes?: string
  items?: CreateSalesOrderItemInput[]
}

export class SalesOrderService extends BaseService {
  private auditService: AuditService
  private quotationService: QuotationService
  private journalEntryService: JournalEntryService

  constructor() {
    super('SalesOrderService')
    this.auditService = new AuditService()
    this.quotationService = new QuotationService()
    this.journalEntryService = new JournalEntryService()
  }

  async createSalesOrder(
    data: CreateSalesOrderInput & { createdBy: string }
  ): Promise<SalesOrderWithDetails> {
    return this.withLogging('createSalesOrder', async () => {

      return await prisma.$transaction(async (tx) => {
        // Generate unique order number
        const orderNumber = await this.generateOrderNumber(tx)

        // If converting from quotation, validate it
        let quotation = null
        if (data.quotationId) {
          quotation = await this.quotationService.getQuotation(data.quotationId)
          if (!quotation) {
            throw new Error('Quotation not found')
          }
          if (quotation.status !== QuotationStatus.ACCEPTED) {
            throw new Error('Only accepted quotations can be converted to sales orders')
          }
        }

        // Calculate totals
        const { subtotal, taxAmount, discountAmount, totalAmount } = this.calculateTotals(data.items)

        // Create sales order
        const salesOrder = await tx.salesOrder.create({
          data: {
            orderNumber,
            quotationId: data.quotationId,
            salesCaseId: data.salesCaseId,
            status: OrderStatus.PENDING,
            orderDate: new Date(),
            requestedDate: data.requestedDate,
            promisedDate: data.promisedDate,
            subtotal,
            taxAmount,
            discountAmount,
            totalAmount,
            paymentTerms: data.paymentTerms,
            shippingTerms: data.shippingTerms,
            shippingAddress: data.shippingAddress,
            billingAddress: data.billingAddress,
            customerPO: data.customerPO,
            notes: data.notes,
            createdBy: data.createdBy
          }
        })

        // Create sales order items
        const _items = await Promise.all(
          data.items.map(async (itemData, index) => {
            const itemCalculations = this.calculateItemTotals(itemData)
            
            return await tx.salesOrderItem.create({
              data: {
                salesOrderId: salesOrder.id,
                itemId: itemData.itemId,
                itemCode: itemData.itemCode,
                description: itemData.description,
                quantity: itemData.quantity,
                unitPrice: itemData.unitPrice,
                discount: itemData.discount || 0,
                taxRate: itemData.taxRate || 0,
                unitOfMeasureId: itemData.unitOfMeasureId,
                subtotal: itemCalculations.subtotal,
                discountAmount: itemCalculations.discountAmount,
                taxAmount: itemCalculations.taxAmount,
                totalAmount: itemCalculations.totalAmount,
                sortOrder: index
              }
            })
          })
        )

        // Update quotation status if converting from quotation
        if (data.quotationId) {
          await tx.quotation.update({
            where: { id: data.quotationId },
            data: { status: QuotationStatus.ACCEPTED }
          })
        }

        // Audit log
        await this.auditService.logAction({
          userId: data.createdBy,
          action: 'CREATE',
          entityType: 'SalesOrder',
          entityId: salesOrder.id,
          metadata: {
            orderNumber: salesOrder.orderNumber,
            totalAmount: salesOrder.totalAmount,
            quotationId: data.quotationId
          }
        })


        return this.getSalesOrder(salesOrder.id, tx)
      })
    })
  }

  async getSalesOrder(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<SalesOrderWithDetails | null> {
    return this.withLogging('getSalesOrder', async () => {

      const client = tx || prisma

      const salesOrder = await client.salesOrder.findUnique({
        where: { id },
        include: {
          salesCase: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  address: true
                }
              }
            }
          },
          quotation: {
            select: {
              id: true,
              quotationNumber: true
            }
          },
          items: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      })

      if (!salesOrder) {
        // Sales order not found
      } else {
        // Sales order found
      }

      return salesOrder as SalesOrderWithDetails | null
    })
  }

  async getAllSalesOrders(filters: {
    status?: OrderStatus
    customerId?: string
    salesCaseId?: string
    dateFrom?: Date
    dateTo?: Date
  } = {}): Promise<SalesOrderWithDetails[]> {
    const where: Record<string, unknown> = {}

    if (filters.status) where.status = filters.status
    if (filters.salesCaseId) where.salesCaseId = filters.salesCaseId
    
    if (filters.customerId) {
      where.salesCase = {
        customerId: filters.customerId
      }
    }

    if (filters.dateFrom || filters.dateTo) {
      where.orderDate = {}
      if (filters.dateFrom) where.orderDate.gte = filters.dateFrom
      if (filters.dateTo) where.orderDate.lte = filters.dateTo
    }

    const salesOrders = await prisma.salesOrder.findMany({
      where,
      include: {
        salesCase: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true
              }
            }
          }
        },
        quotation: {
          select: {
            id: true,
            quotationNumber: true
          }
        },
        items: {
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { orderDate: 'desc' }
    })

    return salesOrders as SalesOrderWithDetails[]
  }

  async updateSalesOrder(
    id: string,
    data: UpdateSalesOrderInput & { updatedBy: string }
  ): Promise<SalesOrderWithDetails> {
    const existingOrder = await this.getSalesOrder(id)
    if (!existingOrder) {
      throw new Error('Sales order not found')
    }

    if (existingOrder.status !== OrderStatus.PENDING) {
      throw new Error('Only pending orders can be updated')
    }

    return await prisma.$transaction(async (tx) => {
      // Calculate new totals if items are provided
      let updateData: Record<string, unknown> = {
        requestedDate: data.requestedDate,
        promisedDate: data.promisedDate,
        paymentTerms: data.paymentTerms,
        shippingTerms: data.shippingTerms,
        shippingAddress: data.shippingAddress,
        billingAddress: data.billingAddress,
        customerPO: data.customerPO,
        notes: data.notes,
        updatedAt: new Date()
      }

      if (data.items) {
        // Delete existing items
        await tx.salesOrderItem.deleteMany({
          where: { salesOrderId: id }
        })

        // Calculate new totals
        const { subtotal, taxAmount, discountAmount, totalAmount } = this.calculateTotals(data.items)
        
        updateData = {
          ...updateData,
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount
        }

        // Create new items
        await Promise.all(
          data.items.map(async (itemData, index) => {
            const itemCalculations = this.calculateItemTotals(itemData)
            
            return await tx.salesOrderItem.create({
              data: {
                salesOrderId: id,
                itemId: itemData.itemId,
                itemCode: itemData.itemCode,
                description: itemData.description,
                quantity: itemData.quantity,
                unitPrice: itemData.unitPrice,
                discount: itemData.discount || 0,
                taxRate: itemData.taxRate || 0,
                unitOfMeasureId: itemData.unitOfMeasureId,
                subtotal: itemCalculations.subtotal,
                discountAmount: itemCalculations.discountAmount,
                taxAmount: itemCalculations.taxAmount,
                totalAmount: itemCalculations.totalAmount,
                sortOrder: index
              }
            })
          })
        )
      }

      // Update sales order
      await tx.salesOrder.update({
        where: { id },
        data: updateData
      })

      // Audit log
      await this.auditService.logAction({
        userId: data.updatedBy,
        action: 'UPDATE',
        entityType: 'SalesOrder',
        entityId: id,
        metadata: {
          orderNumber: existingOrder.orderNumber,
          changes: Object.keys(data).filter(key => key !== 'updatedBy')
        }
      })

      return this.getSalesOrder(id, tx)
    })
  }

  async approveSalesOrder(
    id: string,
    userId: string
  ): Promise<SalesOrderWithDetails> {
    return this.withLogging('approveSalesOrder', async () => {

      const salesOrder = await this.getSalesOrder(id)
      if (!salesOrder) {
        throw new Error('Sales order not found')
      }

      if (salesOrder.status !== OrderStatus.PENDING) {
        throw new Error('Only pending orders can be approved')
      }

      const _updatedOrder = await prisma.salesOrder.update({
        where: { id },
        data: {
          status: OrderStatus.APPROVED,
          approvedBy: userId,
          approvedAt: new Date()
        }
      })

      // Audit log
      await this.auditService.logAction({
        userId,
        action: 'APPROVE',
        entityType: 'SalesOrder',
        entityId: id,
        metadata: {
          orderNumber: salesOrder.orderNumber,
          previousStatus: OrderStatus.PENDING,
          newStatus: OrderStatus.APPROVED
        }
      })


      return this.getSalesOrder(id)
    })
  }

  async cancelSalesOrder(
    id: string,
    reason: string,
    userId: string
  ): Promise<SalesOrderWithDetails> {
    const salesOrder = await this.getSalesOrder(id)
    if (!salesOrder) {
      throw new Error('Sales order not found')
    }

    if ([OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.COMPLETED].includes(salesOrder.status)) {
      throw new Error('Cannot cancel shipped, delivered, or completed orders')
    }

    const _updatedOrder = await prisma.salesOrder.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledBy: userId,
        cancelledAt: new Date(),
        cancellationReason: reason
      }
    })

    // Audit log
    await this.auditService.logAction({
      userId,
      action: 'CANCEL',
      entityType: 'SalesOrder',
      entityId: id,
      metadata: {
        orderNumber: salesOrder.orderNumber,
        previousStatus: salesOrder.status,
        cancellationReason: reason
      }
    })

    return this.getSalesOrder(id)
  }

  async convertQuotationToSalesOrder(
    quotationId: string,
    additionalData: Partial<CreateSalesOrderInput> & { createdBy: string }
  ): Promise<SalesOrderWithDetails> {
    return this.withLogging('convertQuotationToSalesOrder', async () => {

      const quotation = await this.quotationService.getQuotation(quotationId)
      if (!quotation) {
        throw new Error('Quotation not found')
      }

      if (quotation.status !== QuotationStatus.ACCEPTED) {
        throw new Error('Only accepted quotations can be converted to sales orders')
      }

      // Convert quotation items to sales order items
      const items: CreateSalesOrderItemInput[] = quotation.items.map(item => ({
        itemId: item.itemId,
        itemCode: item.itemCode,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxRate: item.taxRate,
        unitOfMeasureId: item.unitOfMeasureId
      }))

      const salesOrderData: CreateSalesOrderInput & { createdBy: string } = {
        quotationId,
        salesCaseId: quotation.salesCaseId,
        paymentTerms: quotation.paymentTerms,
        notes: quotation.notes,
        items,
        ...additionalData
      }


      const result = await this.createSalesOrder(salesOrderData)


      return result
    })
  }

  // Private helper methods

  private calculateTotals(items: CreateSalesOrderItemInput[]) {
    let subtotal = 0
    let taxAmount = 0
    let discountAmount = 0

    for (const item of items) {
      const itemCalculations = this.calculateItemTotals(item)
      subtotal += itemCalculations.subtotal
      taxAmount += itemCalculations.taxAmount
      discountAmount += itemCalculations.discountAmount
    }

    const totalAmount = subtotal - discountAmount + taxAmount

    return { subtotal, taxAmount, discountAmount, totalAmount }
  }

  private calculateItemTotals(item: CreateSalesOrderItemInput) {
    const subtotal = item.quantity * item.unitPrice
    const discountAmount = subtotal * ((item.discount || 0) / 100)
    const afterDiscount = subtotal - discountAmount
    const taxAmount = afterDiscount * ((item.taxRate || 0) / 100)
    const totalAmount = afterDiscount + taxAmount

    return { subtotal, discountAmount, taxAmount, totalAmount }
  }

  private async generateOrderNumber(tx?: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `SO${year}`
    
    const client = tx || prisma
    
    // Get the latest order number for this year
    const latestOrder = await client.salesOrder.findFirst({
      where: {
        orderNumber: {
          startsWith: prefix
        }
      },
      orderBy: {
        orderNumber: 'desc'
      }
    })

    let nextNumber = 1
    if (latestOrder) {
      const currentNumber = parseInt(latestOrder.orderNumber.substring(prefix.length))
      nextNumber = currentNumber + 1
    }

    return `${prefix}${nextNumber.toString().padStart(6, '0')}`
  }
}