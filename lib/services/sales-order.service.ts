import { prisma } from '@/lib/db/prisma'
import { BaseService } from './base.service'
import { AuditService } from './audit.service'
import { QuotationService } from './quotation.service'
import { JournalEntryService } from './accounting/journal-entry.service'
import { CompanySettingsService } from './company-settings.service'
import { taxService } from './tax.service'
import { 
  SalesOrder,
  SalesOrderItem,
  OrderStatus,
  QuotationStatus,
  Prisma
} from '@/lib/generated/prisma'
import { AuditAction, EntityType } from '@/lib/validators/audit.validator'

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
  salesCaseId: string // Required at service level, but API handles creation if needed
  requestedDate?: Date
  promisedDate?: Date
  paymentTerms?: string
  shippingTerms?: string
  shippingAddress?: string
  billingAddress?: string
  customerPO?: string
  notes?: string
  internalNotes?: string
  items: CreateSalesOrderItemInput[]
}

export interface CreateSalesOrderItemInput {
  lineNumber: number
  lineDescription?: string
  isLineHeader: boolean
  itemType: 'PRODUCT' | 'SERVICE'
  itemId?: string
  itemCode: string
  description: string
  internalDescription?: string
  quantity: number
  unitPrice: number
  cost?: number
  discount?: number
  taxRate?: number
  taxRateId?: string // Link to centralized tax configuration
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
  internalNotes?: string
  items?: CreateSalesOrderItemInput[]
}

export class SalesOrderService extends BaseService {
  private auditService: AuditService
  private quotationService: QuotationService
  private journalEntryService: JournalEntryService
  private companySettingsService: CompanySettingsService

  constructor() {
    super('SalesOrderService')
    this.auditService = new AuditService()
    this.quotationService = new QuotationService()
    this.journalEntryService = new JournalEntryService()
    this.companySettingsService = new CompanySettingsService()
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
          // Get quotation directly from the transaction to avoid timeout
          quotation = await tx.quotation.findUnique({
            where: { id: data.quotationId },
            include: { items: true }
          })
          if (!quotation) {
            throw new Error('Quotation not found')
          }
          if (quotation.status !== QuotationStatus.ACCEPTED) {
            throw new Error('Only accepted quotations can be converted to sales orders')
          }
        }

        // Get sales case with customer for tax calculations
        const salesCase = await tx.salesCase.findUnique({
          where: { id: data.salesCaseId },
          include: { customer: true }
        })
        
        if (!salesCase) {
          throw new Error('Sales case not found')
        }

        // Calculate totals
        const { subtotal, taxAmount, discountAmount, totalAmount } = await this.calculateTotals(data.items, salesCase.customer.id)

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
            internalNotes: data.internalNotes,
            createdBy: data.createdBy
          }
        })

        // Create sales order items
        const _items = await Promise.all(
          data.items.map(async (itemData, index) => {
            const itemCalculations = await this.calculateItemTotals(itemData, salesCase.customer.id)
            
            return await tx.salesOrderItem.create({
              data: {
                salesOrderId: salesOrder.id,
                lineNumber: itemData.lineNumber,
                lineDescription: itemData.lineDescription,
                isLineHeader: itemData.isLineHeader,
                itemType: itemData.itemType,
                itemId: itemData.itemId,
                itemCode: itemData.itemCode,
                description: itemData.description,
                internalDescription: itemData.internalDescription,
                quantity: itemData.quantity,
                unitPrice: itemData.unitPrice,
                cost: itemData.cost,
                discount: itemData.discount || 0,
                taxRate: itemCalculations.effectiveTaxRate, // Use the effective tax rate from calculation
                taxRateId: itemData.taxRateId, // Store the tax rate ID reference
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
          action: AuditAction.CREATE,
          entityType: EntityType.SALES_ORDER,
          entityId: salesOrder.id,
          metadata: {
            orderNumber: salesOrder.orderNumber,
            totalAmount: salesOrder.totalAmount,
            quotationId: data.quotationId
          }
        })


        return this.getSalesOrder(salesOrder.id, tx)
      }, {
        maxWait: 10000, // 10 seconds max wait time
        timeout: 20000  // 20 seconds timeout
      })
    })
  }

  async getSalesOrder(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<SalesOrderWithDetails | null> {
    return this.withLogging('getSalesOrder', async () => {
      console.log('Getting sales order with ID:', id)

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
        console.log('Sales order not found for ID:', id)
      } else {
        console.log('Sales order found:', salesOrder.orderNumber)
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
    return this.withLogging('getAllSalesOrders', async () => {
      const where: Prisma.SalesOrderWhereInput = {}

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
    })
  }

  async updateSalesOrder(
    id: string,
    data: UpdateSalesOrderInput & { updatedBy: string }
  ): Promise<SalesOrderWithDetails> {
    return this.withLogging('updateSalesOrder', async () => {
      const existingOrder = await this.getSalesOrder(id)
      if (!existingOrder) {
        throw new Error('Sales order not found')
      }

    // Allow updates for PENDING and APPROVED orders
    if (!['PENDING', 'APPROVED'].includes(existingOrder.status)) {
      throw new Error('Only pending or approved orders can be updated')
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
        internalNotes: data.internalNotes,
        updatedAt: new Date()
      }

      if (data.items) {
        // Delete existing items
        await tx.salesOrderItem.deleteMany({
          where: { salesOrderId: id }
        })

        // Get customer ID for tax calculations
        const salesCase = await tx.salesCase.findUnique({
          where: { id: existingOrder.salesCase.id },
          select: { customerId: true }
        })
        
        // Calculate new totals
        const { subtotal, taxAmount, discountAmount, totalAmount } = await this.calculateTotals(data.items, salesCase?.customerId)
        
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
            const itemCalculations = await this.calculateItemTotals(itemData, salesCase?.customerId)
            
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
        action: AuditAction.UPDATE,
        entityType: EntityType.SALES_ORDER,
        entityId: id,
        metadata: {
          orderNumber: existingOrder.orderNumber,
          changes: Object.keys(data).filter(key => key !== 'updatedBy')
        }
      })

        return this.getSalesOrder(id, tx) as Promise<SalesOrderWithDetails>
      })
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

      // Debug OrderStatus
      console.log('OrderStatus enum:', OrderStatus);
      console.log('Current status:', salesOrder.status);
      console.log('PENDING value:', OrderStatus.PENDING);
      
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
        action: AuditAction.APPROVE,
        entityType: EntityType.SALES_ORDER,
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
    return this.withLogging('cancelSalesOrder', async () => {
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
      action: AuditAction.CANCEL,
      entityType: EntityType.SALES_ORDER,
      entityId: id,
      metadata: {
        orderNumber: salesOrder.orderNumber,
        previousStatus: salesOrder.status,
        cancellationReason: reason
      }
    })

      return this.getSalesOrder(id) as Promise<SalesOrderWithDetails>
    })
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
        lineNumber: item.lineNumber,
        lineDescription: item.lineDescription,
        isLineHeader: item.isLineHeader,
        sortOrder: item.sortOrder,
        itemType: item.itemType,
        itemId: item.itemId,
        itemCode: item.itemCode,
        description: item.description,
        internalDescription: item.internalDescription,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxRate: item.taxRate,
        taxRateId: item.taxRateId, // Include tax rate ID reference
        unitOfMeasureId: item.unitOfMeasureId
      }))

      const salesOrderData: CreateSalesOrderInput & { createdBy: string } = {
        quotationId,
        salesCaseId: quotation.salesCaseId,
        paymentTerms: quotation.paymentTerms,
        notes: quotation.notes,
        internalNotes: quotation.internalNotes,
        items,
        ...additionalData
      }


      const result = await this.createSalesOrder(salesOrderData)


      return result
    })
  }

  async createFromQuotation(
    quotationId: string,
    additionalData: {
      customerPO?: string
      createdBy: string
    }
  ): Promise<SalesOrderWithDetails> {
    return this.withLogging('createFromQuotation', async () => {
      return this.convertQuotationToSalesOrder(quotationId, additionalData)
    })
  }

  // Private helper methods

  private async calculateTotals(items: CreateSalesOrderItemInput[], customerId?: string): Promise<{
    subtotal: number
    taxAmount: number
    discountAmount: number
    totalAmount: number
  }> {
    let subtotal = 0
    let taxAmount = 0
    let discountAmount = 0

    for (const item of items) {
      const itemCalculations = await this.calculateItemTotals(item, customerId)
      subtotal += itemCalculations.subtotal
      taxAmount += itemCalculations.taxAmount
      discountAmount += itemCalculations.discountAmount
    }

    const totalAmount = subtotal - discountAmount + taxAmount

    return { subtotal, taxAmount, discountAmount, totalAmount }
  }

  private async calculateItemTotals(item: CreateSalesOrderItemInput, customerId?: string): Promise<{
    subtotal: number
    discountAmount: number
    taxAmount: number
    totalAmount: number
    effectiveTaxRate: number
  }> {
    const subtotal = item.quantity * item.unitPrice
    const discountAmount = subtotal * ((item.discount || 0) / 100)
    const afterDiscount = subtotal - discountAmount
    
    // Calculate tax using centralized tax system
    let taxAmount = 0
    let effectiveTaxRate = item.taxRate || 0
    
    if (item.taxRateId || !item.taxRate) {
      // Use centralized tax calculation
      const taxCalc = await taxService.calculateTax({
        amount: afterDiscount,
        taxRateId: item.taxRateId,
        customerId,
        appliesTo: item.itemId ? 'PRODUCTS' : 'SERVICES'
      })
      
      taxAmount = taxCalc.taxAmount
      effectiveTaxRate = taxCalc.appliedTaxRates[0]?.rate || 0
    } else {
      // Fallback to manual tax rate
      taxAmount = afterDiscount * ((item.taxRate || 0) / 100)
    }
    
    const totalAmount = afterDiscount + taxAmount

    return { subtotal, discountAmount, taxAmount, totalAmount, effectiveTaxRate }
  }

  private async generateOrderNumber(tx?: Prisma.TransactionClient): Promise<string> {
    // Use the configured order number generation
    return await this.companySettingsService.generateSalesOrderNumber()
  }

  async createSalesOrderFromTemplate(
    templateId: string,
    data: {
      salesCaseId: string
      customerPO?: string
      requestedDate?: Date
      promisedDate?: Date
      shippingAddress?: string
      billingAddress?: string
      notes?: string
      createdBy: string
    }
  ): Promise<SalesOrderWithDetails> {
    return this.withLogging('createSalesOrderFromTemplate', async () => {
      const templateService = new (await import('./sales-order-template.service')).SalesOrderTemplateService()
      
      // Get template with items
      const template = await templateService.getTemplate(templateId)
      if (!template) {
        throw new Error('Sales order template not found')
      }

      // Map template items to sales order items
      const items: CreateSalesOrderItemInput[] = template.items.map(item => ({
        lineNumber: item.lineNumber,
        lineDescription: item.lineDescription,
        isLineHeader: item.isLineHeader,
        itemType: item.itemType,
        itemId: item.itemId,
        itemCode: item.itemCode,
        description: item.description,
        internalDescription: item.internalDescription,
        quantity: item.defaultQuantity,
        unitPrice: item.defaultUnitPrice,
        cost: 0, // Will be calculated based on inventory
        discount: item.defaultDiscount || 0,
        taxRate: item.defaultTaxRate,
        taxRateId: item.taxRateId,
        unitOfMeasureId: item.unitOfMeasureId
      }))

      // Calculate promised date based on template lead days
      const promisedDate = data.promisedDate || new Date(Date.now() + template.defaultLeadDays * 24 * 60 * 60 * 1000)

      // Create sales order
      return await this.createSalesOrder({
        salesCaseId: data.salesCaseId,
        customerPO: data.customerPO,
        requestedDate: data.requestedDate,
        promisedDate,
        paymentTerms: template.paymentTerms || undefined,
        shippingTerms: template.shippingTerms || undefined,
        shippingAddress: data.shippingAddress || template.shippingAddress,
        billingAddress: data.billingAddress || template.billingAddress,
        notes: data.notes || template.notes,
        items,
        createdBy: data.createdBy
      })
    })
  }

  async cloneSalesOrder(
    orderId: string,
    data: {
      salesCaseId?: string // Optional - use same sales case if not provided
      createdBy: string
    }
  ): Promise<SalesOrderWithDetails> {
    return this.withLogging('cloneSalesOrder', async () => {
      // Get existing order with all details
      const existingOrder = await this.getSalesOrder(orderId)
      if (!existingOrder) {
        throw new Error('Sales order not found')
      }

      // Map existing items
      const items: CreateSalesOrderItemInput[] = existingOrder.items.map(item => ({
        lineNumber: item.lineNumber,
        lineDescription: item.lineDescription,
        isLineHeader: item.isLineHeader,
        itemType: item.itemType,
        itemId: item.itemId,
        itemCode: item.itemCode,
        description: item.description,
        internalDescription: item.internalDescription,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        cost: item.cost || 0,
        discount: item.discount,
        taxRate: item.taxRate,
        taxRateId: item.taxRateId,
        unitOfMeasureId: item.unitOfMeasureId
      }))

      // Create new order
      return await this.createSalesOrder({
        salesCaseId: data.salesCaseId || existingOrder.salesCaseId,
        requestedDate: existingOrder.requestedDate || undefined,
        promisedDate: existingOrder.promisedDate || undefined,
        paymentTerms: existingOrder.paymentTerms || undefined,
        shippingTerms: existingOrder.shippingTerms || undefined,
        shippingAddress: existingOrder.shippingAddress || undefined,
        billingAddress: existingOrder.billingAddress || undefined,
        customerPO: existingOrder.customerPO ? `${existingOrder.customerPO} (Clone)` : undefined,
        notes: existingOrder.notes || undefined,
        internalNotes: existingOrder.internalNotes || undefined,
        items,
        createdBy: data.createdBy
      })
    })
  }

  async sendSalesOrder(
    id: string,
    userId: string
  ): Promise<SalesOrderWithDetails> {
    return this.withLogging('sendSalesOrder', async () => {

      const salesOrder = await this.getSalesOrder(id)
      if (!salesOrder) {
        throw new Error('Sales order not found')
      }

      if (salesOrder.status !== OrderStatus.APPROVED) {
        throw new Error('Only approved sales orders can be sent')
      }

      const _updatedOrder = await prisma.salesOrder.update({
        where: { id },
        data: {
          status: OrderStatus.PROCESSING,
          sentAt: new Date(),
          sentBy: userId
        }
      })

      // Audit log
      await this.auditService.logAction({
        userId,
        action: AuditAction.UPDATE,
        entityType: EntityType.SALES_ORDER,
        entityId: id,
        metadata: {
          orderNumber: salesOrder.orderNumber,
          previousStatus: OrderStatus.APPROVED,
          newStatus: OrderStatus.PROCESSING,
          action: 'sent'
        }
      })

      return this.getSalesOrder(id)
    })
  }
}