import { prisma } from '@/lib/db/prisma'
import { BaseService } from './base.service'
import { AuditService } from './audit.service'
import { SalesCaseService } from './sales-case.service'
import { taxService } from './tax.service'
import { AuditAction } from '@/lib/validators/audit.validator'
import { 
  Quotation,
  QuotationItem,
  QuotationStatus,
  SalesCaseStatus,
  Prisma
} from '@/lib/generated/prisma'

export interface CreateQuotationInput {
  salesCaseId: string
  validUntil: Date
  paymentTerms?: string
  deliveryTerms?: string
  notes?: string
  internalNotes?: string
  items: CreateQuotationItemInput[]
}

export interface CreateQuotationItemInput {
  itemId?: string // Optional link to inventory item
  itemCode: string
  description: string
  internalDescription?: string
  quantity: number
  unitPrice: number
  cost?: number
  discount?: number
  taxRate?: number
  taxRateId?: string // Link to centralized tax configuration
  sortOrder?: number
  availabilityStatus?: string
  availableQuantity?: number
}

export interface UpdateQuotationInput {
  validUntil?: Date
  paymentTerms?: string
  deliveryTerms?: string
  notes?: string
  internalNotes?: string
  items?: CreateQuotationItemInput[]
}

export interface QuotationWithDetails extends Quotation {
  items: QuotationItem[]
  salesCase: {
    id: string
    caseNumber: string
    customer: {
      id: string
      name: string
      email: string
    }
  }
}

export class QuotationService extends BaseService {
  private auditService: AuditService
  private salesCaseService: SalesCaseService

  constructor() {
    super('QuotationService')
    this.auditService = new AuditService()
    this.salesCaseService = new SalesCaseService()
  }

  async createQuotation(
    data: CreateQuotationInput & { createdBy: string }
  ): Promise<QuotationWithDetails> {
    return this.withLogging('createQuotation', async () => {

      // Validate sales case exists and is open
      const salesCase = await this.salesCaseService.getSalesCase(data.salesCaseId)
      if (!salesCase) {
        throw new Error('Sales case not found')
      }
      if (salesCase.status !== SalesCaseStatus.OPEN) {
        throw new Error('Can only create quotations for open sales cases')
      }

      // Validate item references and business rules
      await this.validateQuotationItems(data.items)

      // Check inventory availability
      const itemsWithAvailability = await this.checkInventoryAvailability(data.items)

      // Generate quotation number
      const quotationNumber = await this.generateQuotationNumber()

      // Calculate totals
      const calculations = await this.calculateTotals(data.items, salesCase.customer.id)

      // Create quotation with items in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Pre-calculate item totals for all items
        const itemTotalsArray = await Promise.all(
          itemsWithAvailability.map(item => this.calculateItemTotals(item, salesCase.customer.id))
        )
        
        const quotation = await tx.quotation.create({
          data: {
            quotationNumber,
            salesCaseId: data.salesCaseId,
            version: 1,
            status: QuotationStatus.DRAFT,
            validUntil: data.validUntil,
            paymentTerms: data.paymentTerms,
            deliveryTerms: data.deliveryTerms,
            notes: data.notes,
            internalNotes: data.internalNotes,
            subtotal: calculations.subtotal,
            taxAmount: calculations.taxAmount,
            discountAmount: calculations.discountAmount,
            totalAmount: calculations.totalAmount,
            createdBy: data.createdBy,
            items: {
              create: itemsWithAvailability.map((item, index) => ({
                ...item,
                ...itemTotalsArray[index],
                taxRate: itemTotalsArray[index].effectiveTaxRate, // Store the effective tax rate
                sortOrder: item.sortOrder ?? index
              }))
            }
          },
          include: {
            items: {
              include: {
                item: true // Include linked inventory item data
              },
              orderBy: { sortOrder: 'asc' }
            },
            salesCase: {
              include: {
                customer: true
              }
            }
          }
        })

        // Update sales case status to PROPOSAL_SENT if it's the first quotation
        const quotationCount = await tx.quotation.count({
          where: { salesCaseId: data.salesCaseId }
        })

        if (quotationCount === 1) {
          await tx.salesCase.update({
            where: { id: data.salesCaseId },
            data: { 
              status: SalesCaseStatus.IN_PROGRESS,
              updatedAt: new Date()
            }
          })
        }

        return quotation
      })

      // Audit log
      await this.auditService.logAction({
        userId: data.createdBy,
        action: AuditAction.CREATE,
        entityType: 'Quotation',
        entityId: result.id,
        afterData: result,
      })


      return result
    })
  }

  async createNewVersion(
    quotationId: string,
    data: UpdateQuotationInput & { createdBy: string }
  ): Promise<QuotationWithDetails> {
    const existingQuotation = await this.getQuotation(quotationId)
    if (!existingQuotation) {
      throw new Error('Quotation not found')
    }

    // Generate new quotation number with version
    const newVersion = existingQuotation.version + 1
    const baseNumber = existingQuotation.quotationNumber.split('-v')[0]
    const quotationNumber = `${baseNumber}-v${newVersion}`

    // Use existing items if not provided
    const items = data.items || existingQuotation.items.map(item => ({
      itemCode: item.itemCode,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      taxRate: item.taxRate,
      sortOrder: item.sortOrder
    }))

    // Calculate totals
    const calculations = this.calculateTotals(items)

    // Create new version
    const newQuotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        salesCaseId: existingQuotation.salesCaseId,
        version: newVersion,
        status: QuotationStatus.DRAFT,
        validUntil: data.validUntil ?? existingQuotation.validUntil,
        paymentTerms: data.paymentTerms ?? existingQuotation.paymentTerms,
        deliveryTerms: data.deliveryTerms ?? existingQuotation.deliveryTerms,
        notes: data.notes ?? existingQuotation.notes,
        subtotal: calculations.subtotal,
        taxAmount: calculations.taxAmount,
        discountAmount: calculations.discountAmount,
        totalAmount: calculations.totalAmount,
        createdBy: data.createdBy,
        items: {
          create: items.map((item, index) => ({
            ...item,
            ...this.calculateItemTotals(item),
            sortOrder: item.sortOrder ?? index
          }))
        }
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' }
        },
        salesCase: {
          include: {
            customer: true
          }
        }
      }
    })

    // Audit log
    await this.auditService.logAction({
      userId: data.createdBy,
      action: AuditAction.CREATE,
      entityType: 'Quotation',
      entityId: newQuotation.id,
      metadata: { version: newVersion, previousVersion: existingQuotation.version },
      afterData: newQuotation,
    })

    return newQuotation
  }

  async updateQuotation(
    quotationId: string,
    data: UpdateQuotationInput & { updatedBy: string }
  ): Promise<QuotationWithDetails> {
    const existingQuotation = await this.getQuotation(quotationId)
    if (!existingQuotation) {
      throw new Error('Quotation not found')
    }

    // Only allow updates to draft quotations
    if (existingQuotation.status !== QuotationStatus.DRAFT) {
      throw new Error('Only draft quotations can be updated')
    }

    // Validate items if provided
    if (data.items) {
      await this.validateQuotationItems(data.items)
    }

    // Get customer ID for tax calculations
    const salesCase = await this.salesCaseService.getSalesCase(existingQuotation.salesCaseId)
    const customerId = salesCase?.customer.id

    // Calculate new totals if items are being updated
    let calculations = null
    if (data.items) {
      calculations = await this.calculateTotals(data.items, customerId)
    }

    // Update quotation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // If items are being updated, delete existing items and create new ones
      if (data.items) {
        await tx.quotationItem.deleteMany({
          where: { quotationId }
        })
      }

      // Pre-calculate item totals if items are provided
      let itemTotalsArray: any[] = []
      if (data.items) {
        itemTotalsArray = await Promise.all(
          data.items.map(item => this.calculateItemTotals(item, customerId))
        )
      }

      const updatedQuotation = await tx.quotation.update({
        where: { id: quotationId },
        data: {
          validUntil: data.validUntil,
          paymentTerms: data.paymentTerms,
          deliveryTerms: data.deliveryTerms,
          notes: data.notes,
          ...(calculations && {
            subtotal: calculations.subtotal,
            taxAmount: calculations.taxAmount,
            discountAmount: calculations.discountAmount,
            totalAmount: calculations.totalAmount
          }),
          version: existingQuotation.version + 1,
          updatedAt: new Date(),
          ...(data.items && {
            items: {
              create: data.items.map((item, index) => ({
                ...item,
                ...itemTotalsArray[index],
                taxRate: itemTotalsArray[index].effectiveTaxRate, // Store the effective tax rate
                sortOrder: item.sortOrder ?? index
              }))
            }
          })
        },
        include: {
          items: {
            include: {
              item: true
            },
            orderBy: { sortOrder: 'asc' }
          },
          salesCase: {
            include: {
              customer: true
            }
          }
        }
      })

      return updatedQuotation
    })

    // Audit log
    await this.auditService.logAction({
      userId: data.updatedBy,
      action: AuditAction.UPDATE,
      entityType: 'Quotation',
      entityId: quotationId,
      beforeData: existingQuotation,
      afterData: result,
    })

    return result
  }

  async getQuotationClientView(quotationId: string): Promise<Record<string, unknown>> {
    const quotation = await this.getQuotation(quotationId)
    if (!quotation) {
      throw new Error('Quotation not found')
    }

    // Remove internal fields from quotation
    const clientQuotation = {
      ...quotation,
      internalNotes: undefined,
      items: quotation.items.map(item => ({
        ...item,
        cost: undefined,
        internalDescription: undefined,
        margin: undefined
      }))
    }

    return clientQuotation
  }

  async getQuotationInternalView(quotationId: string): Promise<Record<string, unknown>> {
    const quotation = await this.getQuotation(quotationId)
    if (!quotation) {
      throw new Error('Quotation not found')
    }

    // Calculate margins for items
    const itemsWithMargins = quotation.items.map(item => ({
      ...item,
      // Calculate margin if cost is available
      margin: item.cost && item.unitPrice > 0 ? 
        ((item.unitPrice - item.cost) / item.unitPrice) * 100 : 
        undefined
    }))

    return {
      ...quotation,
      items: itemsWithMargins
    }
  }

  async updateQuotationStatus(
    quotationId: string,
    status: QuotationStatus,
    userId: string
  ): Promise<QuotationWithDetails> {
    const quotation = await this.getQuotation(quotationId)
    if (!quotation) {
      throw new Error('Quotation not found')
    }

    // Validate status transitions
    this.validateStatusTransition(quotation.status, status)

    const updatedQuotation = await prisma.$transaction(async (tx) => {
      const updated = await tx.quotation.update({
        where: { id: quotationId },
        data: {
          status,
          updatedAt: new Date()
        },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' }
          },
          salesCase: {
            include: {
              customer: true
            }
          }
        }
      })

      // Update sales case if quotation is accepted
      if (status === QuotationStatus.ACCEPTED) {
        await tx.salesCase.update({
          where: { id: quotation.salesCaseId },
          data: { 
            status: SalesCaseStatus.IN_PROGRESS,
            actualValue: quotation.totalAmount,
            updatedAt: new Date()
          }
        })
      }

      return updated
    })

    // Audit log
    await this.auditService.logAction({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Quotation',
      entityId: quotationId,
      beforeData: { status: quotation.status },
      afterData: { status },
    })

    return updatedQuotation
  }

  async getQuotation(id: string): Promise<QuotationWithDetails | null> {
    return this.withLogging('getQuotation', async () => {

      const quotation = await prisma.quotation.findUnique({
        where: { id },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' }
          },
          salesCase: {
            include: {
              customer: true
            }
          }
        }
      })

      if (!quotation) {
        // Quotation not found
      } else {
        // Quotation found
      }

      return quotation
    })
  }

  async getQuotationByNumber(quotationNumber: string): Promise<QuotationWithDetails | null> {
    return prisma.quotation.findUnique({
      where: { quotationNumber },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' }
        },
        salesCase: {
          include: {
            customer: true
          }
        }
      }
    })
  }

  async getAllQuotations(options?: {
    salesCaseId?: string
    status?: QuotationStatus
    customerId?: string
    search?: string
    dateFrom?: Date
    dateTo?: Date
    limit?: number
    offset?: number
  }): Promise<QuotationWithDetails[]> {
    const where: Prisma.QuotationWhereInput = {}

    if (options?.salesCaseId) {
      where.salesCaseId = options.salesCaseId
    }

    if (options?.status) {
      where.status = options.status
    }

    if (options?.customerId) {
      where.salesCase = {
        customerId: options.customerId
      }
    }

    if (options?.search) {
      where.OR = [
        { quotationNumber: { contains: options.search } },
        { notes: { contains: options.search } }
      ]
    }

    if (options?.dateFrom || options?.dateTo) {
      where.createdAt = {}
      if (options.dateFrom) {
        where.createdAt.gte = options.dateFrom
      }
      if (options.dateTo) {
        where.createdAt.lte = options.dateTo
      }
    }

    return prisma.quotation.findMany({
      where,
      include: {
        items: {
          orderBy: { sortOrder: 'asc' }
        },
        salesCase: {
          include: {
            customer: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit,
      skip: options?.offset
    })
  }

  async getQuotationVersions(salesCaseId: string): Promise<QuotationWithDetails[]> {
    return prisma.quotation.findMany({
      where: { salesCaseId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' }
        },
        salesCase: {
          include: {
            customer: true
          }
        }
      },
      orderBy: [
        { quotationNumber: 'asc' },
        { version: 'desc' }
      ]
    })
  }

  async sendQuotation(
    quotationId: string,
    userId: string
  ): Promise<QuotationWithDetails> {
    return this.withLogging('sendQuotation', async () => {

      const quotation = await this.getQuotation(quotationId)
      if (!quotation) {
        throw new Error('Quotation not found')
      }

      if (quotation.status !== QuotationStatus.DRAFT) {
        throw new Error('Only draft quotations can be sent')
      }

      const result = await this.updateQuotationStatus(quotationId, QuotationStatus.SENT, userId)


      return result
    })
  }

  async acceptQuotation(
    quotationId: string,
    userId: string
  ): Promise<QuotationWithDetails> {
    return this.withLogging('acceptQuotation', async () => {

      const quotation = await this.getQuotation(quotationId)
      if (!quotation) {
        throw new Error('Quotation not found')
      }

      if (quotation.status !== QuotationStatus.SENT) {
        throw new Error('Only sent quotations can be accepted')
      }

      // Check if quotation is still valid
      if (new Date() > new Date(quotation.validUntil)) {
        throw new Error('Quotation has expired')
      }

      const result = await this.updateQuotationStatus(quotationId, QuotationStatus.ACCEPTED, userId)


      return result
    })
  }

  async rejectQuotation(
    quotationId: string,
    userId: string
  ): Promise<QuotationWithDetails> {
    const quotation = await this.getQuotation(quotationId)
    if (!quotation) {
      throw new Error('Quotation not found')
    }

    if (quotation.status !== QuotationStatus.SENT) {
      throw new Error('Only sent quotations can be rejected')
    }

    return this.updateQuotationStatus(quotationId, QuotationStatus.REJECTED, userId)
  }

  async cancelQuotation(
    quotationId: string,
    userId: string
  ): Promise<QuotationWithDetails> {
    const quotation = await this.getQuotation(quotationId)
    if (!quotation) {
      throw new Error('Quotation not found')
    }

    if (quotation.status === QuotationStatus.ACCEPTED) {
      throw new Error('Cannot cancel accepted quotations')
    }

    if (quotation.status === QuotationStatus.CANCELLED) {
      throw new Error('Quotation is already cancelled')
    }

    return this.updateQuotationStatus(quotationId, QuotationStatus.CANCELLED, userId)
  }

  async checkExpiredQuotations(): Promise<void> {
    const expiredQuotations = await prisma.quotation.findMany({
      where: {
        status: QuotationStatus.SENT,
        validUntil: {
          lt: new Date()
        }
      }
    })

    for (const quotation of expiredQuotations) {
      await prisma.quotation.update({
        where: { id: quotation.id },
        data: { status: QuotationStatus.EXPIRED }
      })
    }
  }

  private async calculateItemTotals(item: CreateQuotationItemInput, customerId?: string) {
    const subtotal = item.quantity * item.unitPrice
    const discountAmount = subtotal * (item.discount || 0) / 100
    const discountedAmount = subtotal - discountAmount
    
    // Calculate tax using centralized tax system
    let taxAmount = 0
    let effectiveTaxRate = item.taxRate || 0
    
    if (item.taxRateId || !item.taxRate) {
      // Use centralized tax calculation
      const taxCalc = await taxService.calculateTax({
        amount: discountedAmount,
        taxRateId: item.taxRateId,
        customerId,
        appliesTo: item.itemId ? 'PRODUCTS' : 'SERVICES'
      })
      
      taxAmount = taxCalc.taxAmount
      effectiveTaxRate = taxCalc.appliedTaxRates[0]?.rate || 0
    } else {
      // Fallback to manual tax rate
      taxAmount = discountedAmount * (item.taxRate || 0) / 100
    }
    
    const totalAmount = discountedAmount + taxAmount

    return {
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      effectiveTaxRate
    }
  }

  private async calculateTotals(items: CreateQuotationItemInput[], customerId?: string) {
    let subtotal = 0
    let discountAmount = 0
    let taxAmount = 0

    for (const item of items) {
      const itemTotals = await this.calculateItemTotals(item, customerId)
      subtotal += itemTotals.subtotal
      discountAmount += itemTotals.discountAmount
      taxAmount += itemTotals.taxAmount
    }

    const totalAmount = subtotal - discountAmount + taxAmount

    return {
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount
    }
  }

  private validateStatusTransition(currentStatus: QuotationStatus, newStatus: QuotationStatus): void {
    const validTransitions: Record<QuotationStatus, QuotationStatus[]> = {
      [QuotationStatus.DRAFT]: [QuotationStatus.SENT, QuotationStatus.CANCELLED],
      [QuotationStatus.SENT]: [QuotationStatus.ACCEPTED, QuotationStatus.REJECTED, QuotationStatus.EXPIRED, QuotationStatus.CANCELLED],
      [QuotationStatus.ACCEPTED]: [],
      [QuotationStatus.REJECTED]: [QuotationStatus.CANCELLED],
      [QuotationStatus.EXPIRED]: [QuotationStatus.CANCELLED],
      [QuotationStatus.CANCELLED]: []
    }

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`)
    }
  }

  private async checkInventoryAvailability(items: CreateQuotationItemInput[]): Promise<(CreateQuotationItemInput & { availabilityStatus?: string; availableQuantity?: number })[]> {
    const ItemService = await import('./inventory/item.service').then(m => m.ItemService)
    const itemService = new ItemService()

    const itemsWithAvailability = []

    for (const item of items) {
      let availabilityStatus: string | undefined
      let availableQuantity: number | undefined

      if (item.itemId) {
        try {
          // Get current stock for the item
          const stockSummary = await itemService.getItemStockSummary(item.itemId)
          
          if (stockSummary) {
            availableQuantity = stockSummary.availableStock
            
            if (item.quantity <= stockSummary.availableStock) {
              availabilityStatus = 'IN_STOCK'
            } else {
              availabilityStatus = 'INSUFFICIENT_STOCK'
            }
          } else {
            // Service items or items without stock tracking
            const itemData = await itemService.getItem(item.itemId)
            if (itemData && !itemData.trackInventory) {
              availabilityStatus = 'IN_STOCK' // Services are always available
              availableQuantity = 0
            } else {
              availabilityStatus = 'OUT_OF_STOCK'
              availableQuantity = 0
            }
          }
        } catch (error) {
          console.error('Error checking item availability:', error);
        }
      }

      itemsWithAvailability.push({
        ...item,
        ...(availabilityStatus && { availabilityStatus }),
        ...(availableQuantity !== undefined && { availableQuantity })
      })
    }

    return itemsWithAvailability
  }

  private async validateQuotationItems(items: CreateQuotationItemInput[]): Promise<void> {
    for (const item of items) {
      // Validate item reference exists if provided
      if (item.itemId) {
        const itemExists = await prisma.item.findUnique({
          where: { id: item.itemId }
        })
        if (!itemExists) {
          throw new Error('Item not found')
        }
      }

      // Validate business rules
      if (item.quantity <= 0) {
        throw new Error('Quantity must be positive')
      }

      if (item.unitPrice < 0) {
        throw new Error('Unit price cannot be negative')
      }

      if (item.discount && (item.discount < 0 || item.discount > 100)) {
        throw new Error('Discount cannot exceed 100%')
      }

      if (item.taxRate && item.taxRate < 0) {
        throw new Error('Tax rate cannot be negative')
      }
    }
  }

  private async generateQuotationNumber(): Promise<string> {
    // Generate a unique quotation number using timestamp and random suffix
    const timestamp = Date.now()
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    
    // First try to get the count of existing quotations for numbering
    const count = await prisma.quotation.count()
    const sequence = (count + 1).toString().padStart(4, '0')
    
    // Create a unique number that combines sequence and timestamp
    const quotationNumber = `QUOT-${sequence}-${timestamp}${randomSuffix}`
    
    // Verify it doesn't exist (extra safety)
    const existing = await prisma.quotation.findUnique({
      where: { quotationNumber }
    })
    
    if (existing) {
      // If by some chance it exists, recursively try again
      return this.generateQuotationNumber()
    }
    
    return quotationNumber
  }
}