import { prisma } from '@/lib/db/prisma'
import { BaseService } from './base.service'
import { AuditService } from './audit.service'
import { AuditAction, EntityType } from '@/lib/validators/audit.validator'
import { SalesCaseService } from './sales-case.service'
import { taxService } from './tax.service'
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
  lineNumber: number // Groups items into lines
  lineDescription?: string // Description for the line (shown to client)
  isLineHeader: boolean // First item in each line
  itemType: 'PRODUCT' | 'SERVICE'
  itemId?: string // Optional link to inventory item
  itemCode: string
  description: string
  internalDescription?: string
  quantity: number
  unitPrice: number
  unitOfMeasureId?: string
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
      // Validate header fields
      await this.validateQuotationHeader(data)

      // Validate sales case exists and is open
      const salesCase = await this.salesCaseService.getSalesCase(data.salesCaseId)
      if (!salesCase) {
        throw new Error('Sales case not found')
      }
      if (salesCase.status !== SalesCaseStatus.OPEN && salesCase.status !== SalesCaseStatus.IN_PROGRESS) {
        throw new Error('Can only create quotations for open or in-progress sales cases')
      }

      // Validate and enrich items with line grouping
      await this.validateQuotationItems(data.items)
      const enrichedItems = await this.enrichQuotationItems(data.items)

      // Check inventory availability and calculate FIFO costs
      const itemsWithAvailability = await this.checkInventoryAvailability(enrichedItems)

      // Generate quotation number
      const quotationNumber = await this.generateQuotationNumber()

      // Calculate totals
      const calculations = await this.calculateTotals(itemsWithAvailability, salesCase.customer.id)

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
        entityType: EntityType.QUOTATION,
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
    return this.withLogging('createNewVersion', async () => {
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
      entityType: EntityType.QUOTATION,
      entityId: newQuotation.id,
      metadata: { version: newVersion, previousVersion: existingQuotation.version },
      afterData: newQuotation,
    })

      return newQuotation
    })
  }

  async updateQuotation(
    quotationId: string,
    data: UpdateQuotationInput & { updatedBy: string }
  ): Promise<QuotationWithDetails> {
    return this.withLogging('updateQuotation', async () => {
      const existingQuotation = await this.getQuotation(quotationId)
      if (!existingQuotation) {
        throw new Error('Quotation not found')
      }

    // Only allow updates to draft quotations
    if (existingQuotation.status !== QuotationStatus.DRAFT) {
      throw new Error('Only draft quotations can be updated')
    }

    // Validate header fields if provided
    if (data.validUntil || data.paymentTerms || data.deliveryTerms || data.notes || data.internalNotes) {
      await this.validateQuotationHeader({
        salesCaseId: existingQuotation.salesCaseId,
        validUntil: data.validUntil || existingQuotation.validUntil,
        paymentTerms: data.paymentTerms,
        deliveryTerms: data.deliveryTerms,
        notes: data.notes,
        internalNotes: data.internalNotes,
        items: [] // Items validated separately
      })
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
      let itemTotalsArray: Awaited<ReturnType<typeof this.calculateItemTotals>>[] = []
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
        entityType: EntityType.QUOTATION,
        entityId: quotationId,
        beforeData: existingQuotation,
        afterData: result,
      })

      return result
    })
  }

  async getQuotationClientView(quotationId: string): Promise<Record<string, unknown>> {
    return this.withLogging('getQuotationClientView', async () => {
      const quotation = await this.getQuotation(quotationId)
      if (!quotation) {
        throw new Error('Quotation not found')
      }

    // Group items by line number for client view
    const lineGroups = new Map<number, any[]>()
    
    quotation.items.forEach(item => {
      if (!lineGroups.has(item.lineNumber)) {
        lineGroups.set(item.lineNumber, [])
      }
      lineGroups.get(item.lineNumber)?.push(item)
    })

    // Create client-friendly line structure
    const clientLines = Array.from(lineGroups.entries()).map(([lineNumber, items]) => {
      const lineHeader = items.find(item => item.isLineHeader)
      const lineTotal = items.reduce((sum, item) => sum + item.totalAmount, 0)
      
      return {
        lineNumber,
        lineDescription: lineHeader?.lineDescription || '',
        quantity: lineHeader?.quantity || 1,
        totalAmount: lineTotal,
        // Don't show individual items or internal details
      }
    })

    // Remove internal fields from quotation
    const clientQuotation = {
      ...quotation,
      internalNotes: undefined,
      lines: clientLines,
      items: undefined // Remove detailed items from client view
    }

      return clientQuotation
    })
  }

  async getQuotationInternalView(quotationId: string): Promise<Record<string, unknown>> {
    return this.withLogging('getQuotationInternalView', async () => {
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
    })
  }

  async updateQuotationStatus(
    quotationId: string,
    status: QuotationStatus,
    userId: string
  ): Promise<QuotationWithDetails> {
    return this.withLogging('updateQuotationStatus', async () => {
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
        entityType: EntityType.QUOTATION,
        entityId: quotationId,
        beforeData: { status: quotation.status },
        afterData: { status },
      })

      return updatedQuotation
    })
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
    return this.withLogging('getQuotationByNumber', async () => {
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
    return this.withLogging('getAllQuotations', async () => {
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
    })
  }

  async getQuotationVersions(salesCaseId: string): Promise<QuotationWithDetails[]> {
    return this.withLogging('getQuotationVersions', async () => {
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
    return this.withLogging('rejectQuotation', async () => {
      const quotation = await this.getQuotation(quotationId)
      if (!quotation) {
        throw new Error('Quotation not found')
      }

      if (quotation.status !== QuotationStatus.SENT) {
        throw new Error('Only sent quotations can be rejected')
      }

      return this.updateQuotationStatus(quotationId, QuotationStatus.REJECTED, userId)
    })
  }

  async cancelQuotation(
    quotationId: string,
    userId: string
  ): Promise<QuotationWithDetails> {
    return this.withLogging('cancelQuotation', async () => {
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
    })
  }

  async checkExpiredQuotations(): Promise<void> {
    return this.withLogging('checkExpiredQuotations', async () => {
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
    })
  }

  private async calculateItemTotals(item: CreateQuotationItemInput, customerId?: string): Promise<{
    subtotal: number
    discountAmount: number
    taxAmount: number
    totalAmount: number
    effectiveTaxRate: number
  }> {
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

  private async calculateTotals(items: CreateQuotationItemInput[], customerId?: string): Promise<{
    subtotal: number
    discountAmount: number
    taxAmount: number
    totalAmount: number
  }> {
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

  private async enrichQuotationItems(items: CreateQuotationItemInput[]): Promise<CreateQuotationItemInput[]> {
    return this.withLogging('enrichQuotationItems', async () => {
      const ItemService = await import('./inventory/item.service').then(m => m.ItemService)
      const itemService = new ItemService()

    const enrichedItems = []

    for (const item of items) {
      let enrichedItem = { ...item }

      if (item.itemId) {
        try {
          // Get item details
          const itemData = await itemService.getItem(item.itemId)
          if (itemData) {
            // Use item master data if not provided
            enrichedItem.itemCode = item.itemCode || itemData.code
            enrichedItem.description = item.description || itemData.name
            enrichedItem.unitOfMeasureId = item.unitOfMeasureId || itemData.unitOfMeasureId
            
            // Set default cost from standard cost if not provided
            if (!enrichedItem.cost && itemData.standardCost) {
              enrichedItem.cost = itemData.standardCost
            }
          }
        } catch (error) {
          console.error('Error enriching item:', error)
        }
      }

      enrichedItems.push(enrichedItem)
    }

      return enrichedItems
    })
  }

  private async checkInventoryAvailability(items: CreateQuotationItemInput[]): Promise<(CreateQuotationItemInput & { availabilityStatus?: string; availableQuantity?: number; fifoCost?: number })[]> {
    return this.withLogging('checkInventoryAvailability', async () => {
      const ItemService = await import('./inventory/item.service').then(m => m.ItemService)
      const InventoryService = await import('./inventory/inventory.service').then(m => m.InventoryService)
      const itemService = new ItemService()
      const inventoryService = new InventoryService()

    const itemsWithAvailability = []

    for (const item of items) {
      let availabilityStatus: string | undefined
      let availableQuantity: number | undefined
      let fifoCost: number | undefined

      if (item.itemId && item.itemType === 'PRODUCT') {
        try {
          // Get current stock for the item
          const stockSummary = await itemService.getItemStockSummary(item.itemId)
          
          if (stockSummary) {
            availableQuantity = stockSummary.availableStock
            
            if (item.quantity <= stockSummary.availableStock) {
              availabilityStatus = 'IN_STOCK'
              
              // Calculate FIFO cost for products
              try {
                const fifoCostData = await inventoryService.calculateFIFOCost(item.itemId, item.quantity)
                fifoCost = fifoCostData.averageCost
              } catch (error) {
                // Use standard cost if FIFO calculation fails
                console.error('FIFO calculation failed, using standard cost:', error)
              }
            } else {
              availabilityStatus = 'INSUFFICIENT_STOCK'
            }
          } else {
            availabilityStatus = 'OUT_OF_STOCK'
            availableQuantity = 0
          }
        } catch (error) {
          console.error('Error checking item availability:', error);
        }
      } else if (item.itemType === 'SERVICE') {
        // Services are always available
        availabilityStatus = 'IN_STOCK'
        availableQuantity = undefined
      }

      itemsWithAvailability.push({
        ...item,
        ...(availabilityStatus && { availabilityStatus }),
        ...(availableQuantity !== undefined && { availableQuantity }),
        ...(fifoCost !== undefined && { cost: fifoCost }) // Update cost with FIFO cost
      })
    }

      return itemsWithAvailability
    })
  }

  private async validateQuotationHeader(data: CreateQuotationInput): Promise<void> {
    // Validate salesCaseId
    if (!data.salesCaseId) {
      throw new Error('Sales case ID is required')
    }
    
    // Validate validUntil date
    if (!data.validUntil) {
      throw new Error('Valid until date is required')
    }
    
    const validUntilDate = new Date(data.validUntil)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (validUntilDate <= today) {
      throw new Error('Valid until date must be in the future')
    }
    
    // Maximum 180 days in future
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 180)
    if (validUntilDate > maxDate) {
      throw new Error('Valid until date should not be more than 6 months in the future')
    }
    
    // Validate payment terms
    if (data.paymentTerms && data.paymentTerms.length > 100) {
      throw new Error('Payment terms must be 100 characters or less')
    }
    
    // Validate delivery terms
    if (data.deliveryTerms && data.deliveryTerms.length > 200) {
      throw new Error('Delivery terms must be 200 characters or less')
    }
    
    // Validate notes
    if (data.notes && data.notes.length > 1000) {
      throw new Error('Notes must be 1000 characters or less')
    }
    
    // Validate internal notes
    if (data.internalNotes && data.internalNotes.length > 1000) {
      throw new Error('Internal notes must be 1000 characters or less')
    }
  }

  private async validateQuotationItems(items: CreateQuotationItemInput[]): Promise<void> {
    if (!items || items.length === 0) {
      throw new Error('At least one quotation item is required')
    }

    // Track item codes for duplicate checking
    const itemCodes = new Map<string, number>()
    
    for (const [index, item] of items.entries()) {
      const lineContext = `Line ${item.lineNumber}, Item ${index + 1}`
      
      // Validate item code
      if (!item.itemCode || item.itemCode.trim().length === 0) {
        throw new Error(`${lineContext}: Item code is required`)
      }
      if (item.itemCode.length > 50) {
        throw new Error(`${lineContext}: Item code must be 50 characters or less`)
      }
      
      // Check for duplicate item codes within same line
      const codeKey = `${item.lineNumber}-${item.itemCode.toLowerCase().trim()}`
      if (itemCodes.has(codeKey)) {
        throw new Error(`${lineContext}: Duplicate item code "${item.itemCode}" found in line ${item.lineNumber}`)
      }
      itemCodes.set(codeKey, index)
      
      // Validate description
      if (!item.description || item.description.trim().length === 0) {
        throw new Error(`${lineContext}: Description is required`)
      }
      if (item.description.length > 500) {
        throw new Error(`${lineContext}: Description must be 500 characters or less`)
      }
      
      // Validate line description
      if (item.lineDescription && item.lineDescription.length > 200) {
        throw new Error(`${lineContext}: Line description must be 200 characters or less`)
      }
      
      // Validate internal description
      if (item.internalDescription && item.internalDescription.length > 1000) {
        throw new Error(`${lineContext}: Internal description must be 1000 characters or less`)
      }
      
      // Validate item reference exists if provided
      if (item.itemId) {
        const itemExists = await prisma.item.findUnique({
          where: { id: item.itemId }
        })
        if (!itemExists) {
          throw new Error(`${lineContext}: Referenced inventory item not found`)
        }
      }

      // Validate business rules
      if (!item.quantity || item.quantity <= 0) {
        throw new Error(`${lineContext}: Quantity must be greater than 0`)
      }
      if (item.quantity > 999999) {
        throw new Error(`${lineContext}: Quantity must be less than 1,000,000`)
      }
      if (!Number.isFinite(item.quantity)) {
        throw new Error(`${lineContext}: Quantity must be a valid number`)
      }

      if (item.unitPrice < 0) {
        throw new Error(`${lineContext}: Unit price cannot be negative`)
      }
      if (item.unitPrice > 9999999.99) {
        throw new Error(`${lineContext}: Unit price must be less than 10,000,000`)
      }
      if (!Number.isFinite(item.unitPrice)) {
        throw new Error(`${lineContext}: Unit price must be a valid number`)
      }

      if (item.discount !== undefined && item.discount !== null) {
        if (item.discount < 0 || item.discount > 100) {
          throw new Error(`${lineContext}: Discount must be between 0% and 100%`)
        }
        if (!Number.isFinite(item.discount)) {
          throw new Error(`${lineContext}: Discount must be a valid number`)
        }
      }

      if (item.taxRate !== undefined && item.taxRate !== null) {
        if (item.taxRate < 0 || item.taxRate > 100) {
          throw new Error(`${lineContext}: Tax rate must be between 0% and 100%`)
        }
        if (!Number.isFinite(item.taxRate)) {
          throw new Error(`${lineContext}: Tax rate must be a valid number`)
        }
      }
      
      if (item.cost !== undefined && item.cost !== null) {
        if (item.cost < 0) {
          throw new Error(`${lineContext}: Cost cannot be negative`)
        }
        if (item.cost > 9999999.99) {
          throw new Error(`${lineContext}: Cost must be less than 10,000,000`)
        }
        if (!Number.isFinite(item.cost)) {
          throw new Error(`${lineContext}: Cost must be a valid number`)
        }
        
        // Business rule: Check margin if selling below cost
        if (item.cost > 0 && item.unitPrice > 0) {
          const margin = ((item.unitPrice - item.cost) / item.unitPrice) * 100
          if (margin < -100) {
            throw new Error(`${lineContext}: Selling price is significantly below cost`)
          }
        }
      }
      
      // Validate tax rate reference if provided
      if (item.taxRateId) {
        const taxRateExists = await taxService.getActiveTaxRates()
        if (!taxRateExists.some(tr => tr.id === item.taxRateId)) {
          throw new Error(`${lineContext}: Invalid tax rate reference`)
        }
      }
    }
  }

  private async generateQuotationNumber(): Promise<string> {
    return this.withLogging('generateQuotationNumber', async () => {
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
    })
  }
}