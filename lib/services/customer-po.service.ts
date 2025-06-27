import { prisma } from '@/lib/db/prisma'
import { AuditService } from './audit.service'
import { QuotationService } from './quotation.service'
import { SalesOrderService, SalesOrderWithDetails } from './sales-order.service'
import { CompanySettingsService } from './company-settings.service'
import { 
  CustomerPO
} from '@prisma/client'

export interface CreateCustomerPOInput {
  poNumber: string
  customerId: string
  quotationId?: string
  poDate: Date
  poAmount: number
  currency?: string
  attachmentUrl?: string
  notes?: string
}

export interface UpdateCustomerPOInput {
  poAmount?: number
  currency?: string
  attachmentUrl?: string
  notes?: string
}

export interface CustomerPOWithDetails extends CustomerPO {
  customer: {
    id: string
    name: string
    email: string
  }
  quotation: {
    id: string
    quotationNumber: string
    totalAmount: number
  }
  salesCase: {
    id: string
    caseNumber: string
    title: string
  }
  salesOrder?: {
    id: string
    orderNumber: string
    status: string
  } | null
}

export class CustomerPOService {
  private auditService: AuditService
  private quotationService: QuotationService
  private salesOrderService: SalesOrderService
  private companySettingsService: CompanySettingsService

  constructor() {
    this.auditService = new AuditService()
    this.quotationService = new QuotationService()
    this.salesOrderService = new SalesOrderService()
    this.companySettingsService = new CompanySettingsService()
  }

  async createCustomerPO(
    data: CreateCustomerPOInput & { createdBy: string }
  ): Promise<CustomerPOWithDetails> {
    let quotation = null
    let salesCaseId = null

    // If quotationId provided, validate it
    if (data.quotationId) {
      quotation = await this.quotationService.getQuotation(data.quotationId)
      if (!quotation) {
        throw new Error('Quotation not found')
      }

      if (quotation.salesCase.customer.id !== data.customerId) {
        throw new Error('Quotation does not belong to this customer')
      }

      if (quotation.status !== 'SENT' && quotation.status !== 'ACCEPTED') {
        throw new Error('Quotation must be sent to customer before receiving PO')
      }

      salesCaseId = quotation.salesCaseId
    }

    // Check if PO number already exists
    const existingPO = await prisma.customerPO.findUnique({
      where: { poNumber: data.poNumber }
    })

    if (existingPO) {
      throw new Error('PO number already exists')
    }

    // Get company settings for default currency
    const companySettings = await this.companySettingsService.getSettings()
    const defaultCurrency = companySettings.defaultCurrency

    // Calculate exchange rate if needed
    const exchangeRate = data.currency && data.currency !== defaultCurrency ? 1.0 : 1.0 // TODO: Get actual rate

    const customerPO = await prisma.customerPO.create({
      data: {
        poNumber: data.poNumber,
        customerId: data.customerId,
        quotationId: data.quotationId,
        salesCaseId: salesCaseId,
        poDate: data.poDate,
        poAmount: data.poAmount,
        currency: data.currency || defaultCurrency,
        exchangeRate,
        attachmentUrl: data.attachmentUrl,
        notes: data.notes,
        createdBy: data.createdBy
      },
      include: this.getDetailedInclude()
    })

    // Update quotation status to ACCEPTED if quotation exists and not already accepted
    if (data.quotationId && quotation && quotation.status !== 'ACCEPTED') {
      await this.quotationService.updateQuotationStatus(
        data.quotationId,
        'ACCEPTED',
        data.createdBy
      )
    }

    await this.auditService.logAction({
      userId: data.createdBy,
      action: 'CREATE',
      entityType: 'CustomerPO',
      entityId: customerPO.id,
      metadata: {
        poNumber: data.poNumber,
        quotationId: data.quotationId,
        amount: data.poAmount
      }
    })

    return customerPO as CustomerPOWithDetails
  }

  async updateCustomerPO(
    id: string,
    data: UpdateCustomerPOInput & { updatedBy: string }
  ): Promise<CustomerPOWithDetails> {
    const existingPO = await this.getCustomerPO(id)
    if (!existingPO) {
      throw new Error('Customer PO not found')
    }

    if (existingPO.isAccepted) {
      throw new Error('Cannot update accepted PO')
    }

    const customerPO = await prisma.customerPO.update({
      where: { id },
      data: {
        poAmount: data.poAmount,
        currency: data.currency,
        attachmentUrl: data.attachmentUrl,
        notes: data.notes
      },
      include: this.getDetailedInclude()
    })

    await this.auditService.logAction({
      userId: data.updatedBy,
      action: 'UPDATE',
      entityType: 'CustomerPO',
      entityId: id,
      beforeData: existingPO,
      afterData: customerPO
    })

    return customerPO as CustomerPOWithDetails
  }

  async acceptCustomerPO(
    id: string,
    acceptedBy: string,
    createSalesOrder: boolean = true
  ): Promise<{
    customerPO: CustomerPOWithDetails
    salesOrder?: SalesOrderWithDetails
  }> {
    const customerPO = await this.getCustomerPO(id)
    if (!customerPO) {
      throw new Error('Customer PO not found')
    }

    if (customerPO.isAccepted) {
      throw new Error('PO has already been accepted')
    }

    // Execute operations outside transaction first to avoid nested transaction issues
    let salesOrder
    
    try {
      // Mark PO as accepted
      const updatedPO = await prisma.customerPO.update({
        where: { id },
        data: {
          isAccepted: true,
          acceptedAt: new Date(),
          acceptedBy
        },
        include: this.getDetailedInclude()
      })

      if (createSalesOrder && customerPO.quotationId) {
        // First, update the quotation status to ACCEPTED if not already
        const quotation = await this.quotationService.getQuotation(customerPO.quotationId)
        if (quotation && quotation.status !== 'ACCEPTED') {
          await this.quotationService.updateQuotationStatus(
            customerPO.quotationId,
            'ACCEPTED',
            acceptedBy
          )
        }
        
        // Convert quotation to sales order
        salesOrder = await this.salesOrderService.convertQuotationToSalesOrder(
          customerPO.quotationId,
          {
            poNumber: customerPO.poNumber,
            poDate: customerPO.poDate,
            poAmount: customerPO.poAmount,
            createdBy: acceptedBy
          }
        )

        // Link sales order to PO
        await prisma.customerPO.update({
          where: { id },
          data: {
            salesOrderId: salesOrder.id
          }
        })
      }

      await this.auditService.logAction({
        userId: acceptedBy,
        action: 'ACCEPT',
        entityType: 'CustomerPO',
        entityId: id,
        metadata: {
          salesOrderId: salesOrder?.id
        }
      })

      // Get final updated PO with all relationships
      const finalPO = await this.getCustomerPO(id)
      if (!finalPO) {
        throw new Error('Failed to retrieve updated Customer PO')
      }

      return {
        customerPO: finalPO,
        salesOrder
      }
    } catch (error) {
      // If something fails, revert the PO acceptance
      if (customerPO && !customerPO.isAccepted) {
        await prisma.customerPO.update({
          where: { id },
          data: {
            isAccepted: false,
            acceptedAt: null,
            acceptedBy: null
          }
        }).catch(console.error)
      }
      throw error
    }
  }

  async getCustomerPO(id: string): Promise<CustomerPOWithDetails | null> {
    const customerPO = await prisma.customerPO.findUnique({
      where: { id },
      include: this.getDetailedInclude()
    })

    return customerPO as CustomerPOWithDetails | null
  }

  async getCustomerPOByNumber(poNumber: string): Promise<CustomerPOWithDetails | null> {
    const customerPO = await prisma.customerPO.findUnique({
      where: { poNumber },
      include: this.getDetailedInclude()
    })

    return customerPO as CustomerPOWithDetails | null
  }

  async getAllCustomerPOs(filters: {
    customerId?: string
    quotationId?: string
    salesCaseId?: string
    isAccepted?: boolean
    dateFrom?: Date
    dateTo?: Date
  } = {}): Promise<CustomerPOWithDetails[]> {
    const where: Record<string, unknown> = {}

    if (filters.customerId) where.customerId = filters.customerId
    if (filters.quotationId) where.quotationId = filters.quotationId
    if (filters.salesCaseId) where.salesCaseId = filters.salesCaseId
    if (filters.isAccepted !== undefined) where.isAccepted = filters.isAccepted

    if (filters.dateFrom || filters.dateTo) {
      where.poDate = {}
      if (filters.dateFrom) where.poDate.gte = filters.dateFrom
      if (filters.dateTo) where.poDate.lte = filters.dateTo
    }

    const customerPOs = await prisma.customerPO.findMany({
      where,
      include: this.getDetailedInclude(),
      orderBy: { poDate: 'desc' }
    })

    return customerPOs as CustomerPOWithDetails[]
  }

  async getQuotationPOs(quotationId: string): Promise<CustomerPOWithDetails[]> {
    return this.getAllCustomerPOs({ quotationId })
  }

  async validatePOAmount(
    quotationId: string,
    poAmount: number,
    tolerance: number = 0.05 // 5% tolerance
  ): Promise<{
    isValid: boolean
    quotationAmount: number
    difference: number
    percentageDifference: number
  }> {
    const quotation = await this.quotationService.getQuotation(quotationId)
    if (!quotation) {
      throw new Error('Quotation not found')
    }

    const quotationAmount = quotation.totalAmount
    const difference = Math.abs(poAmount - quotationAmount)
    const percentageDifference = (difference / quotationAmount) * 100

    return {
      isValid: percentageDifference <= (tolerance * 100),
      quotationAmount,
      difference,
      percentageDifference
    }
  }

  async getPOMetrics(filters: {
    customerId?: string
    dateFrom?: Date
    dateTo?: Date
  } = {}): Promise<{
    totalPOs: number
    acceptedPOs: number
    pendingPOs: number
    totalValue: number
    acceptedValue: number
    averageAcceptanceTime: number
  }> {
    const where: Record<string, unknown> = {}

    if (filters.customerId) where.customerId = filters.customerId
    if (filters.dateFrom || filters.dateTo) {
      where.poDate = {}
      if (filters.dateFrom) where.poDate.gte = filters.dateFrom
      if (filters.dateTo) where.poDate.lte = filters.dateTo
    }

    const [
      totalPOs,
      acceptedPOs,
      totalValueResult,
      acceptedValueResult,
      acceptanceTimes
    ] = await Promise.all([
      prisma.customerPO.count({ where }),
      prisma.customerPO.count({ where: { ...where, isAccepted: true } }),
      prisma.customerPO.aggregate({
        where,
        _sum: { poAmount: true }
      }),
      prisma.customerPO.aggregate({
        where: { ...where, isAccepted: true },
        _sum: { poAmount: true }
      }),
      prisma.customerPO.findMany({
        where: { ...where, isAccepted: true, acceptedAt: { not: null } },
        select: {
          createdAt: true,
          acceptedAt: true
        }
      })
    ])

    // Calculate average acceptance time
    let averageAcceptanceTime = 0
    if (acceptanceTimes.length > 0) {
      const totalTime = acceptanceTimes.reduce((sum, po) => {
        if (po.acceptedAt) {
          const timeDiff = po.acceptedAt.getTime() - po.createdAt.getTime()
          return sum + timeDiff
        }
        return sum
      }, 0)
      averageAcceptanceTime = totalTime / acceptanceTimes.length / (1000 * 60 * 60) // Convert to hours
    }

    return {
      totalPOs,
      acceptedPOs,
      pendingPOs: totalPOs - acceptedPOs,
      totalValue: totalValueResult._sum.poAmount || 0,
      acceptedValue: acceptedValueResult._sum.poAmount || 0,
      averageAcceptanceTime
    }
  }

  private getDetailedInclude() {
    return {
      customer: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      quotation: {
        select: {
          id: true,
          quotationNumber: true,
          totalAmount: true
        }
      },
      salesCase: {
        select: {
          id: true,
          caseNumber: true,
          title: true
        }
      },
      salesOrder: {
        select: {
          id: true,
          orderNumber: true,
          status: true
        }
      }
    }
  }
}