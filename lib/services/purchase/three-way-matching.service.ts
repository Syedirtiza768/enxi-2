import { BaseService } from '@/lib/services/base.service'
import { PrismaClient } from "@prisma/client"
import { prisma } from '@/lib/db/prisma'

interface MatchingTolerance {
  quantityTolerancePercent: number
  priceTolerancePercent: number
  amountTolerancePercent: number
}

interface MatchingDiscrepancy {
  id: string
  type: 'QUANTITY_OVER_MATCH' | 'QUANTITY_UNDER_MATCH' | 'PRICE_VARIANCE' | 'AMOUNT_VARIANCE' | 'MISSING_GOODS_RECEIPT' | 'MISSING_INVOICE'
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  item: {
    id: string
    code: string
    name: string
  }
  description: string
  expectedQuantity?: number
  actualQuantity?: number
  expectedPrice?: number
  actualPrice?: number
  variance?: number
  variancePercentage?: number
  requiresApproval: boolean
}

interface ThreeWayMatchingSummary {
  totalItems: number
  fullyMatched: number
  partiallyMatched: number
  overMatched: number
  underMatched: number
  pendingReview: number
  matchingStatus: 'FULLY_MATCHED' | 'PARTIALLY_MATCHED' | 'OVER_MATCHED' | 'UNDER_MATCHED' | 'PENDING' | 'REJECTED' | 'APPROVED_WITH_VARIANCE'
}

interface ThreeWayMatchingAnalysis {
  purchaseOrder: {
    id: string
    poNumber: string
    supplier: {
      id: string
      name: string
      code: string
    }
    totalAmount: number
    currency: string
  }
  goodsReceipts: Array<{
    id: string
    receiptNumber: string
    receivedDate: string
    status: string
    items: Array<{
      id: string
      itemId: string
      item: {
        code: string
        name: string
      }
      quantityReceived: number
      unitCost: number
      totalCost: number
      qualityStatus: string
    }>
  }>
  supplierInvoices: Array<{
    id: string
    invoiceNumber: string
    invoiceDate: string
    status: string
    matchingStatus: string
    items: Array<{
      id: string
      description: string
      quantity: number
      unitPrice: number
      totalAmount: number
    }>
  }>
  discrepancies: MatchingDiscrepancy[]
  summary: ThreeWayMatchingSummary
  analysisDate: Date
}

interface ApprovalRequest {
  approvedBy: string
  approvalReason: string
  overrideDiscrepancies: boolean
}

interface RejectionRequest {
  rejectedBy: string
  rejectionReason: string
  requiredActions: string[]
}

interface MatchingMetrics {
  totalTransactions: number
  fullyMatchedRate: number
  averageMatchingTime: number // in hours
  commonDiscrepancyTypes: Array<{
    type: string
    count: number
    percentage: number
  }>
  supplierPerformance: Array<{
    supplierId: string
    supplierName: string
    matchingRate: number
    averageVariance: number
  }>
}

export class ThreeWayMatchingService extends BaseService {
  constructor() {
    super('ThreeWayMatchingService')
  }

  async analyzeThreeWayMatching(purchaseOrderId: string): Promise<ThreeWayMatchingAnalysis> {
    return this.withLogging('analyzeThreeWayMatching', async () => {
      // Get purchase order with all related data
      const purchaseOrder = await prisma.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        include: {
          supplier: true,
          items: {
            include: {
              item: true
            }
          }
        }
      })

      if (!purchaseOrder) {
        throw new Error('Purchase order not found')
      }

      // Get all goods receipts for this PO
      const goodsReceipts = await prisma.goodsReceipt.findMany({
        where: { purchaseOrderId },
        include: {
          items: {
            include: {
              item: true
            }
          }
        }
      })

      // Get all supplier invoices related to these goods receipts
      const goodsReceiptItemIds = goodsReceipts.flatMap(gr => gr.items.map(item => item.id))
      
      const supplierInvoices = await prisma.supplierInvoice.findMany({
        where: {
          supplierId: purchaseOrder.supplierId,
          items: {
            some: {
              goodsReceiptItemId: {
                in: goodsReceiptItemIds
              }
            }
          }
        },
        include: {
          items: {
            include: {
              goodsReceiptItem: {
                include: {
                  item: true
                }
              }
            }
          }
        }
      })

      // Analyze discrepancies
      const discrepancies = await this.analyzeDiscrepancies(
        purchaseOrder,
        goodsReceipts,
        supplierInvoices
      )

      // Calculate summary
      const summary = this.calculateSummary(
        purchaseOrder.items,
        goodsReceipts,
        supplierInvoices,
        discrepancies
      )

      return {
        purchaseOrder: {
          id: purchaseOrder.id,
          poNumber: purchaseOrder.poNumber,
          supplier: {
            id: purchaseOrder.supplier.id,
            name: purchaseOrder.supplier.name,
            code: purchaseOrder.supplier.code
          },
          totalAmount: purchaseOrder.totalAmount,
          currency: purchaseOrder.currency
        },
        goodsReceipts: goodsReceipts.map(gr => ({
          id: gr.id,
          receiptNumber: gr.receiptNumber,
          receivedDate: gr.receivedDate.toISOString(),
          status: gr.status,
          items: gr.items.map(item => ({
            id: item.id,
            itemId: item.itemId,
            item: {
              code: item.item.code,
              name: item.item.name
            },
            quantityReceived: item.quantityReceived,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
            qualityStatus: item.qualityStatus
          }))
        })),
        supplierInvoices: supplierInvoices.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate.toISOString(),
          status: inv.status,
          matchingStatus: inv.matchingStatus,
          items: inv.items.map(item => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalAmount: item.totalAmount
          }))
        })),
        discrepancies,
        summary,
        analysisDate: new Date()
      }
    })
  }

  async analyzeWithTolerance(
    purchaseOrderId: string, 
    tolerance: MatchingTolerance
  ): Promise<ThreeWayMatchingAnalysis & { withinTolerance: boolean; toleranceExceptions: MatchingDiscrepancy[] }> {
    return this.withLogging('analyzeWithTolerance', async () => {
      const analysis = await this.analyzeThreeWayMatching(purchaseOrderId)
      
      // Filter discrepancies based on tolerance
      const toleranceExceptions = analysis.discrepancies.filter(discrepancy => {
        switch (discrepancy.type) {
          case 'QUANTITY_OVER_MATCH':
          case 'QUANTITY_UNDER_MATCH':
            return (discrepancy.variancePercentage || 0) > tolerance.quantityTolerancePercent
          case 'PRICE_VARIANCE':
            return (discrepancy.variancePercentage || 0) > tolerance.priceTolerancePercent
          case 'AMOUNT_VARIANCE':
            return (discrepancy.variancePercentage || 0) > tolerance.amountTolerancePercent
          default:
            return true // Always flag missing documents
        }
      })

      const withinTolerance = toleranceExceptions.length === 0

      return {
        ...analysis,
        withinTolerance,
        toleranceExceptions
      }
    })
  }

  async approveMatching(
    supplierInvoiceId: string,
    request: ApprovalRequest
  ): Promise<{ approved: boolean; matchingStatus: string }> {
    return this.withLogging('approveMatching', async () => {
      const result = await prisma.$transaction(async (prisma) => {
        // Update supplier invoice matching status
        const updatedInvoice = await prisma.supplierInvoice.update({
          where: { id: supplierInvoiceId },
          data: {
            matchingStatus: 'APPROVED_WITH_VARIANCE',
            updatedAt: new Date()
          }
        })

        // Create approval record
        await prisma.matchingApproval.create({
          data: {
            supplierInvoiceId,
            approvedBy: request.approvedBy,
            approvalReason: request.approvalReason,
            overrideDiscrepancies: request.overrideDiscrepancies,
            approvedAt: new Date()
          }
        })

        return {
          approved: true,
          matchingStatus: updatedInvoice.matchingStatus
        }
      })

      return result
    })
  }

  async rejectMatching(
    supplierInvoiceId: string,
    request: RejectionRequest
  ): Promise<{ rejected: boolean; matchingStatus: string; requiredActions: string[] }> {
    return this.withLogging('rejectMatching', async () => {
      const result = await prisma.$transaction(async (prisma) => {
        // Update supplier invoice matching status
        const updatedInvoice = await prisma.supplierInvoice.update({
          where: { id: supplierInvoiceId },
          data: {
            matchingStatus: 'REJECTED',
            updatedAt: new Date()
          }
        })

        // Create rejection record
        await prisma.matchingRejection.create({
          data: {
            supplierInvoiceId,
            rejectedBy: request.rejectedBy,
            rejectionReason: request.rejectionReason,
            requiredActions: JSON.stringify(request.requiredActions),
            rejectedAt: new Date()
          }
        })

        return {
          rejected: true,
          matchingStatus: updatedInvoice.matchingStatus,
          requiredActions: request.requiredActions
        }
      })

      return result
    })
  }

  async bulkAnalyzeMatching(purchaseOrderIds: string[]): Promise<ThreeWayMatchingAnalysis[]> {
    return this.withLogging('bulkAnalyzeMatching', async () => {
      const analyses = await Promise.all(
        purchaseOrderIds.map(id => this.analyzeThreeWayMatching(id))
      )
      return analyses
    })
  }

  async generateExceptionsReport(filters: {
    dateFrom?: Date
    dateTo?: Date
    supplierId?: string
    minVarianceAmount?: number
  }): Promise<{
    summary: {
      totalExceptions: number
      highSeverity: number
      mediumSeverity: number
      lowSeverity: number
      totalVarianceAmount: number
    }
    exceptions: Array<{
      id: string
      purchaseOrder: {
        poNumber: string
        supplier: { name: string }
      }
      type: string
      severity: string
      variance?: number
      variancePercentage?: number
      description: string
      createdAt: string
    }>
  }> {
    return this.withLogging('generateExceptionsReport', async () => {
      // Build where clause for filtering
      const where: Record<string, unknown> = {}
      
      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {}
        if (filters.dateFrom) where.createdAt.gte = filters.dateFrom
        if (filters.dateTo) where.createdAt.lte = filters.dateTo
      }

      if (filters.supplierId) {
        where.supplierId = filters.supplierId
      }

      // Get supplier invoices with discrepancies
      const invoicesWithDiscrepancies = await prisma.supplierInvoice.findMany({
        where: {
          ...where,
          matchingStatus: {
            in: ['OVER_MATCHED', 'UNDER_MATCHED', 'PARTIALLY_MATCHED']
          }
        },
        include: {
          supplier: true,
          purchaseOrder: true
        }
      })

      // Analyze each invoice for detailed exceptions
      const exceptions: Record<string, unknown>[] = []
      let totalVarianceAmount = 0

      for (const invoice of invoicesWithDiscrepancies) {
        if (invoice.items.length > 0 && invoice.items[0].goodsReceiptItem?.goodsReceipt?.purchaseOrder) {
          const analysis = await this.analyzeThreeWayMatching(
            invoice.items[0].goodsReceiptItem.goodsReceipt.purchaseOrder.id
          )
          
          for (const discrepancy of analysis.discrepancies) {
            if (!filters.minVarianceAmount || (discrepancy.variance || 0) >= filters.minVarianceAmount) {
              exceptions.push({
                id: discrepancy.id,
                purchaseOrder: {
                  poNumber: analysis.purchaseOrder.poNumber,
                  supplier: { name: analysis.purchaseOrder.supplier.name }
                },
                type: discrepancy.type,
                severity: discrepancy.severity,
                variance: discrepancy.variance,
                variancePercentage: discrepancy.variancePercentage,
                description: discrepancy.description,
                createdAt: invoice.createdAt.toISOString()
              })
              
              totalVarianceAmount += discrepancy.variance || 0
            }
          }
        }
      }

      // Calculate summary
      const summary = {
        totalExceptions: exceptions.length,
        highSeverity: exceptions.filter(e => e.severity === 'HIGH').length,
        mediumSeverity: exceptions.filter(e => e.severity === 'MEDIUM').length,
        lowSeverity: exceptions.filter(e => e.severity === 'LOW').length,
        totalVarianceAmount
      }

      return { summary, exceptions }
    })
  }

  async getMatchingMetrics(filters: {
    dateFrom?: Date
    dateTo?: Date
    supplierId?: string
  }): Promise<MatchingMetrics> {
    return this.withLogging('getMatchingMetrics', async () => {
      const where: Record<string, unknown> = {}
      
      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {}
        if (filters.dateFrom) where.createdAt.gte = filters.dateFrom
        if (filters.dateTo) where.createdAt.lte = filters.dateTo
      }

      if (filters.supplierId) {
        where.supplierId = filters.supplierId
      }

      // Get all supplier invoices in the period
      const invoices = await prisma.supplierInvoice.findMany({
        where,
        include: {
          supplier: true
        }
      })

      const totalTransactions = invoices.length
      const fullyMatched = invoices.filter(inv => inv.matchingStatus === 'FULLY_MATCHED').length
      const fullyMatchedRate = totalTransactions > 0 ? (fullyMatched / totalTransactions) * 100 : 0

      // Calculate average matching time (from creation to matching completion)
      const matchedInvoices = invoices.filter(inv => 
        ['FULLY_MATCHED', 'APPROVED_WITH_VARIANCE'].includes(inv.matchingStatus)
      )
      
      const averageMatchingTime = matchedInvoices.length > 0 
        ? matchedInvoices.reduce((sum, inv) => {
            const hours = (inv.updatedAt.getTime() - inv.createdAt.getTime()) / (1000 * 60 * 60)
            return sum + hours
          }, 0) / matchedInvoices.length
        : 0

      // Analyze discrepancy types
      const discrepancyTypes = new Map<string, number>()
      for (const invoice of invoices) {
        if (invoice.matchingStatus !== 'FULLY_MATCHED') {
          const type = invoice.matchingStatus
          discrepancyTypes.set(type, (discrepancyTypes.get(type) || 0) + 1)
        }
      }

      const commonDiscrepancyTypes = Array.from(discrepancyTypes.entries())
        .map(([type, count]) => ({
          type,
          count,
          percentage: (count / totalTransactions) * 100
        }))
        .sort((a, b) => b.count - a.count)

      // Calculate supplier performance
      const supplierPerformance = new Map<string, { total: number; matched: number; variances: number[] }>()
      
      for (const invoice of invoices) {
        const supplierId = invoice.supplierId
        if (!supplierPerformance.has(supplierId)) {
          supplierPerformance.set(supplierId, { total: 0, matched: 0, variances: [] })
        }
        
        const performance = supplierPerformance.get(supplierId)!
        performance.total++
        
        if (invoice.matchingStatus === 'FULLY_MATCHED') {
          performance.matched++
        }
        
        // Calculate variance (simplified - could be enhanced)
        const variance = Math.abs(invoice.totalAmount - (invoice.paidAmount || 0))
        if (variance > 0) {
          performance.variances.push(variance)
        }
      }

      const supplierPerformanceArray = Array.from(supplierPerformance.entries())
        .map(([supplierId, perf]) => {
          const supplier = invoices.find(inv => inv.supplierId === supplierId)?.supplier
          return {
            supplierId,
            supplierName: supplier?.name || 'Unknown',
            matchingRate: (perf.matched / perf.total) * 100,
            averageVariance: perf.variances.length > 0 
              ? perf.variances.reduce((sum, v) => sum + v, 0) / perf.variances.length 
              : 0
          }
        })

      return {
        totalTransactions,
        fullyMatchedRate,
        averageMatchingTime,
        commonDiscrepancyTypes,
        supplierPerformance: supplierPerformanceArray
      }
    })
  }

  private async analyzeDiscrepancies(
    purchaseOrder: { items: Array<{ id: string; item: { id: string; code: string; name: string } }> },
    goodsReceipts: Array<{ items: Array<{ id: string; item: { id: string; code: string; name: string } }> }>,
    supplierInvoices: Array<{ items: Array<{ goodsReceiptItem?: { id: string } }> }>
  ): Promise<MatchingDiscrepancy[]> {
    const discrepancies: MatchingDiscrepancy[] = []

    // Check for missing goods receipts
    if (goodsReceipts.length === 0) {
      for (const poItem of purchaseOrder.items) {
        discrepancies.push({
          id: `missing-gr-${poItem.id}`,
          type: 'MISSING_GOODS_RECEIPT',
          severity: 'HIGH',
          item: {
            id: poItem.item.id,
            code: poItem.item.code,
            name: poItem.item.name
          },
          description: `No goods receipt found for ${poItem.item.name}`,
          requiresApproval: true
        })
      }
      return discrepancies
    }

    // Check for missing invoices
    const invoicedItemIds = new Set(
      supplierInvoices.flatMap(inv => 
        inv.items.map((item) => item.goodsReceiptItem?.id)
      ).filter(Boolean)
    )

    for (const gr of goodsReceipts) {
      for (const grItem of gr.items) {
        if (!invoicedItemIds.has(grItem.id)) {
          discrepancies.push({
            id: `missing-inv-${grItem.id}`,
            type: 'MISSING_INVOICE',
            severity: 'MEDIUM',
            item: {
              id: grItem.item.id,
              code: grItem.item.code,
              name: grItem.item.name
            },
            description: `No invoice found for received ${grItem.item.name}`,
            requiresApproval: false
          })
        }
      }
    }

    // Analyze quantity and price discrepancies
    for (const invoice of supplierInvoices) {
      for (const invItem of invoice.items) {
        const grItem = goodsReceipts
          .flatMap(gr => gr.items)
          .find(item => item.id === invItem.goodsReceiptItemId)

        if (grItem) {
          // Quantity discrepancies
          if (invItem.quantity > grItem.quantityReceived) {
            const variance = invItem.quantity - grItem.quantityReceived
            const variancePercentage = (variance / grItem.quantityReceived) * 100
            
            discrepancies.push({
              id: `qty-over-${invItem.id}`,
              type: 'QUANTITY_OVER_MATCH',
              severity: variancePercentage > 10 ? 'HIGH' : variancePercentage > 5 ? 'MEDIUM' : 'LOW',
              item: {
                id: grItem.item.id,
                code: grItem.item.code,
                name: grItem.item.name
              },
              description: `Invoiced quantity exceeds received quantity`,
              expectedQuantity: grItem.quantityReceived,
              actualQuantity: invItem.quantity,
              variance,
              variancePercentage,
              requiresApproval: variancePercentage > 5
            })
          } else if (invItem.quantity < grItem.quantityReceived) {
            const variance = grItem.quantityReceived - invItem.quantity
            const variancePercentage = (variance / grItem.quantityReceived) * 100
            
            discrepancies.push({
              id: `qty-under-${invItem.id}`,
              type: 'QUANTITY_UNDER_MATCH',
              severity: variancePercentage > 10 ? 'HIGH' : variancePercentage > 5 ? 'MEDIUM' : 'LOW',
              item: {
                id: grItem.item.id,
                code: grItem.item.code,
                name: grItem.item.name
              },
              description: `Invoiced quantity is less than received quantity`,
              expectedQuantity: grItem.quantityReceived,
              actualQuantity: invItem.quantity,
              variance,
              variancePercentage,
              requiresApproval: false
            })
          }

          // Price discrepancies
          if (Math.abs(invItem.unitPrice - grItem.unitCost) > 0.01) {
            const variance = invItem.unitPrice - grItem.unitCost
            const variancePercentage = Math.abs(variance / grItem.unitCost) * 100
            
            discrepancies.push({
              id: `price-var-${invItem.id}`,
              type: 'PRICE_VARIANCE',
              severity: variancePercentage > 10 ? 'HIGH' : variancePercentage > 5 ? 'MEDIUM' : 'LOW',
              item: {
                id: grItem.item.id,
                code: grItem.item.code,
                name: grItem.item.name
              },
              description: `Unit price variance detected`,
              expectedPrice: grItem.unitCost,
              actualPrice: invItem.unitPrice,
              variance: Math.abs(variance),
              variancePercentage,
              requiresApproval: variancePercentage > 5
            })
          }
        }
      }
    }

    return discrepancies
  }

  private calculateSummary(
    poItems: Array<{ id: string }>,
    goodsReceipts: Array<{ id: string }>,
    supplierInvoices: Array<{ id: string }>,
    discrepancies: MatchingDiscrepancy[]
  ): ThreeWayMatchingSummary {
    const totalItems = poItems.length
    
    // Count different types of matches
    const overMatched = discrepancies.filter(d => d.type === 'QUANTITY_OVER_MATCH').length
    const underMatched = discrepancies.filter(d => d.type === 'QUANTITY_UNDER_MATCH').length
    const pendingReview = discrepancies.filter(d => d.requiresApproval).length
    
    const fullyMatched = totalItems - overMatched - underMatched - pendingReview
    const partiallyMatched = Math.max(0, totalItems - fullyMatched - overMatched - underMatched)

    // Determine overall matching status
    let matchingStatus: ThreeWayMatchingSummary['matchingStatus']
    
    if (goodsReceipts.length === 0 || supplierInvoices.length === 0) {
      matchingStatus = 'PENDING'
    } else if (overMatched > 0) {
      matchingStatus = 'OVER_MATCHED'
    } else if (underMatched > 0) {
      matchingStatus = 'UNDER_MATCHED'
    } else if (partiallyMatched > 0) {
      matchingStatus = 'PARTIALLY_MATCHED'
    } else {
      matchingStatus = 'FULLY_MATCHED'
    }

    return {
      totalItems,
      fullyMatched,
      partiallyMatched,
      overMatched,
      underMatched,
      pendingReview,
      matchingStatus
    }
  }
}