import { prisma } from '@/lib/db/prisma'
import { AuditService } from './audit.service'
import { CustomerService } from './customer.service'
import { AuditAction } from '@/lib/validators/audit.validator'
import { 
  SalesCase,
  Customer,
  CaseExpense,
  Prisma,
  Quotation,
  SalesOrder
} from '@/lib/generated/prisma'
import { SalesCaseStatus, ExpenseStatus } from '@/lib/types/shared-enums'

export interface CreateSalesCaseInput {
  customerId: string
  title: string
  description?: string
  estimatedValue?: number
  assignedTo?: string
}

export interface UpdateSalesCaseInput {
  title?: string
  description?: string
  status?: SalesCaseStatus
  estimatedValue?: number
  actualValue?: number
  cost?: number
  assignedTo?: string
}

export interface CreateCaseExpenseInput {
  salesCaseId: string
  expenseDate: Date
  category: string
  description: string
  amount: number
  currency?: string
  attachmentUrl?: string
  receiptNumber?: string
  vendor?: string
  accountId?: string
}

export interface UpdateCaseExpenseInput {
  expenseDate?: Date
  category?: string
  description?: string
  amount?: number
  currency?: string
  attachmentUrl?: string
  receiptNumber?: string
  vendor?: string
  accountId?: string
  status?: ExpenseStatus
}

export interface SalesCaseMetrics {
  totalCases: number
  openCases: number
  wonCases: number
  lostCases: number
  totalEstimatedValue: number
  totalActualValue: number
  totalProfit: number
  averageWinRate: number
  averageMargin: number
}

export interface SalesCaseWithDetails extends SalesCase {
  customer: Customer
  quotations: Quotation[]
  salesOrders: SalesOrder[]
  expenses: CaseExpense[]
  _count?: {
    quotations: number
    salesOrders: number
    expenses: number
  }
}

export interface SalesCaseSummary {
  totalQuotations: number
  totalOrders: number
  totalInvoiced: number
  totalPaid: number
  totalExpenses: number
  estimatedProfit: number
  actualProfit: number
  profitMargin: number
  revenue: number
  fifoCost: number
}

export class SalesCaseService {
  private auditService: AuditService
  private customerService: CustomerService

  constructor() {
    this.auditService = new AuditService()
    this.customerService = new CustomerService()
  }

  async createSalesCase(
    data: CreateSalesCaseInput & { createdBy: string }
  ): Promise<SalesCaseWithDetails> {
    // Validate customer exists
    const customer = await this.customerService.getCustomer(data.customerId)
    if (!customer) {
      throw new Error('Customer not found')
    }

    // Generate case number
    const caseNumber = await this.generateCaseNumber()

    const salesCase = await prisma.salesCase.create({
      data: {
        caseNumber,
        customerId: data.customerId,
        title: data.title,
        description: data.description,
        estimatedValue: data.estimatedValue || 0,
        status: SalesCaseStatus.OPEN,
        createdBy: data.createdBy,
        assignedTo: data.assignedTo || data.createdBy
      },
      include: this.getDetailedInclude()
    })

    // Audit log
    await this.auditService.logAction({
      userId: data.createdBy,
      action: AuditAction.CREATE,
      entityType: 'SalesCase',
      entityId: salesCase.id,
      afterData: salesCase,
    })

    return salesCase
  }

  async updateSalesCase(
    id: string,
    data: UpdateSalesCaseInput,
    userId: string
  ): Promise<SalesCaseWithDetails> {
    const existingCase = await this.getSalesCase(id)
    if (!existingCase) {
      throw new Error('Sales case not found')
    }

    // Calculate profit margin if actualValue and cost are provided
    let profitMargin = existingCase.profitMargin
    if (data.actualValue !== undefined || data.cost !== undefined) {
      const actualValue = data.actualValue ?? existingCase.actualValue
      const cost = data.cost ?? existingCase.cost
      profitMargin = actualValue > 0 ? ((actualValue - cost) / actualValue) * 100 : 0
    }

    // Handle status transitions
    const updateData: Record<string, unknown> = {
      ...data,
      profitMargin,
      updatedAt: new Date()
    }

    // Set closedAt date when closing the case
    if (data.status && data.status !== SalesCaseStatus.OPEN && existingCase.status === SalesCaseStatus.OPEN) {
      updateData.closedAt = new Date()
    }

    const updatedCase = await prisma.salesCase.update({
      where: { id },
      data: updateData,
      include: this.getDetailedInclude()
    })

    // Audit log
    await this.auditService.logAction({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'SalesCase',
      entityId: id,
      beforeData: existingCase,
      afterData: updatedCase,
    })

    return updatedCase
  }

  async getSalesCase(id: string): Promise<SalesCaseWithDetails | null> {
    return prisma.salesCase.findUnique({
      where: { id },
      include: this.getDetailedInclude()
    })
  }

  async getAllSalesCases(options?: {
    customerId?: string
    status?: SalesCaseStatus
    assignedTo?: string
    search?: string
    dateFrom?: Date
    dateTo?: Date
    limit?: number
    offset?: number
  }): Promise<SalesCaseWithDetails[]> {
    const where: Prisma.SalesCaseWhereInput = {}

    if (options?.customerId) {
      where.customerId = options.customerId
    }

    if (options?.status) {
      where.status = options.status
    }

    if (options?.assignedTo) {
      // Handle comma-separated assignedTo values
      if (options.assignedTo.includes(',')) {
        where.assignedTo = { in: options.assignedTo.split(',') }
      } else {
        where.assignedTo = options.assignedTo
      }
    }

    if (options?.search) {
      where.OR = [
        { title: { contains: options.search } },
        { caseNumber: { contains: options.search } },
        { description: { contains: options.search } }
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

    return prisma.salesCase.findMany({
      where,
      include: this.getDetailedInclude(),
      orderBy: { createdAt: 'desc' },
      take: options?.limit,
      skip: options?.offset
    })
  }

  async getSalesCaseMetrics(options?: {
    customerId?: string
    assignedTo?: string
    dateFrom?: Date
    dateTo?: Date
  }): Promise<SalesCaseMetrics> {
    const where: Prisma.SalesCaseWhereInput = {}

    if (options?.customerId) {
      where.customerId = options.customerId
    }

    if (options?.assignedTo) {
      // Handle comma-separated assignedTo values
      if (options.assignedTo.includes(',')) {
        where.assignedTo = { in: options.assignedTo.split(',') }
      } else {
        where.assignedTo = options.assignedTo
      }
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

    const [totalCases, openCases, wonCases, lostCases, aggregates] = await Promise.all([
      prisma.salesCase.count({ where }),
      prisma.salesCase.count({ where: { ...where, status: SalesCaseStatus.OPEN } }),
      prisma.salesCase.count({ where: { ...where, status: SalesCaseStatus.WON } }),
      prisma.salesCase.count({ where: { ...where, status: SalesCaseStatus.LOST } }),
      prisma.salesCase.aggregate({
        where,
        _sum: {
          estimatedValue: true,
          actualValue: true,
          cost: true
        },
        _avg: {
          profitMargin: true
        }
      })
    ])

    const totalEstimatedValue = aggregates._sum.estimatedValue || 0
    const totalActualValue = aggregates._sum.actualValue || 0
    const totalCost = aggregates._sum.cost || 0
    const totalProfit = totalActualValue - totalCost
    const averageWinRate = totalCases > 0 ? (wonCases / (wonCases + lostCases)) * 100 : 0
    const averageMargin = aggregates._avg.profitMargin || 0

    return {
      totalCases,
      openCases,
      wonCases,
      lostCases,
      totalEstimatedValue,
      totalActualValue,
      totalProfit,
      averageWinRate,
      averageMargin
    }
  }

  async assignSalesCase(
    id: string,
    assignedTo: string,
    userId: string
  ): Promise<SalesCaseWithDetails> {
    const salesCase = await this.getSalesCase(id)
    if (!salesCase) {
      throw new Error('Sales case not found')
    }

    return this.updateSalesCase(
      id,
      { assignedTo },
      userId
    )
  }

  async closeSalesCase(
    id: string,
    status: 'WON' | 'LOST',
    actualValue: number,
    cost: number,
    userId: string
  ): Promise<SalesCaseWithDetails> {
    if (status !== 'WON' && status !== 'LOST') {
      throw new Error('Invalid close status. Must be WON or LOST')
    }

    const salesCase = await this.getSalesCase(id)
    if (!salesCase) {
      throw new Error('Sales case not found')
    }

    if (salesCase.status !== SalesCaseStatus.OPEN) {
      throw new Error('Sales case is already closed')
    }

    return this.updateSalesCase(
      id,
      {
        status,
        actualValue,
        cost
      },
      userId
    )
  }

  async getSalesCaseTimeline(id: string): Promise<Record<string, unknown>[]> {
    const salesCase = await this.getSalesCase(id)
    if (!salesCase) {
      throw new Error('Sales case not found')
    }

    // Get audit logs for this sales case
    const auditLogs = await this.auditService.getEntityHistory('SalesCase', id)
    
    // Get related quotations timeline
    const quotations = await prisma.quotation.findMany({
      where: { salesCaseId: id },
      orderBy: { createdAt: 'desc' }
    })

    // Combine and sort timeline events
    const timeline = [
      ...auditLogs.map(log => ({
        type: 'audit',
        action: log.action,
        timestamp: log.timestamp,
        userId: log.userId,
        data: log
      })),
      ...quotations.map(quote => ({
        type: 'quotation',
        action: 'CREATED',
        timestamp: quote.createdAt,
        userId: quote.createdBy,
        data: quote
      }))
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return timeline
  }

  // Expense Management Methods

  async createExpense(
    data: CreateCaseExpenseInput & { createdBy: string }
  ): Promise<CaseExpense> {
    // Validate sales case exists
    const salesCase = await this.getSalesCase(data.salesCaseId)
    if (!salesCase) {
      throw new Error('Sales case not found')
    }

    // Calculate base amount
    const exchangeRate = data.currency && data.currency !== 'USD' ? 1.0 : 1.0 // TODO: Get actual rate
    const baseAmount = data.amount * exchangeRate

    const expense = await prisma.caseExpense.create({
      data: {
        salesCaseId: data.salesCaseId,
        expenseDate: data.expenseDate,
        category: data.category,
        description: data.description,
        amount: data.amount,
        currency: data.currency || 'USD',
        exchangeRate,
        baseAmount,
        attachmentUrl: data.attachmentUrl,
        receiptNumber: data.receiptNumber,
        vendor: data.vendor,
        accountId: data.accountId,
        createdBy: data.createdBy
      }
    })

    // Update sales case cost
    await this.updateCaseCosts(data.salesCaseId, data.createdBy)

    await this.auditService.logAction({
      userId: data.createdBy,
      action: AuditAction.CREATE,
      entityType: 'CaseExpense',
      entityId: expense.id,
      metadata: {
        salesCaseId: data.salesCaseId,
        amount: data.amount,
        category: data.category
      }
    })

    return expense
  }

  async updateExpense(
    id: string,
    data: UpdateCaseExpenseInput & { updatedBy: string }
  ): Promise<CaseExpense> {
    const existingExpense = await prisma.caseExpense.findUnique({
      where: { id }
    })

    if (!existingExpense) {
      throw new Error('Expense not found')
    }

    // Calculate base amount if amount or currency changes
    let baseAmount = existingExpense.baseAmount
    if (data.amount !== undefined || data.currency !== undefined) {
      const amount = data.amount ?? existingExpense.amount
      const currency = data.currency ?? existingExpense.currency
      const exchangeRate = currency !== 'USD' ? 1.0 : 1.0 // TODO: Get actual rate
      baseAmount = amount * exchangeRate
    }

    const expense = await prisma.caseExpense.update({
      where: { id },
      data: {
        ...data,
        baseAmount,
        approvedBy: data.status === ExpenseStatus.APPROVED ? data.updatedBy : undefined,
        approvedAt: data.status === ExpenseStatus.APPROVED ? new Date() : undefined,
        rejectedBy: data.status === ExpenseStatus.REJECTED ? data.updatedBy : undefined,
        rejectedAt: data.status === ExpenseStatus.REJECTED ? new Date() : undefined
      }
    })

    // Update sales case cost if amount changed
    if (data.amount !== undefined && data.amount !== existingExpense.amount) {
      await this.updateCaseCosts(existingExpense.salesCaseId, data.updatedBy)
    }

    await this.auditService.logAction({
      userId: data.updatedBy,
      action: AuditAction.UPDATE,
      entityType: 'CaseExpense',
      entityId: id,
      beforeData: existingExpense,
      afterData: expense
    })

    return expense
  }

  async approveExpense(
    id: string,
    approvedBy: string
  ): Promise<CaseExpense> {
    return this.updateExpense(id, {
      status: ExpenseStatus.APPROVED,
      updatedBy: approvedBy
    })
  }

  async rejectExpense(
    id: string,
    rejectedBy: string,
    reason: string
  ): Promise<CaseExpense> {
    const expense = await prisma.caseExpense.update({
      where: { id },
      data: {
        status: ExpenseStatus.REJECTED,
        rejectedBy,
        rejectedAt: new Date(),
        rejectionReason: reason
      }
    })

    await this.auditService.logAction({
      userId: rejectedBy,
      action: 'REJECT' as AuditAction,
      entityType: 'CaseExpense',
      entityId: id,
      metadata: { reason }
    })

    return expense
  }

  async deleteExpense(id: string, deletedBy: string): Promise<void> {
    const expense = await prisma.caseExpense.findUnique({
      where: { id }
    })

    if (!expense) {
      throw new Error('Expense not found')
    }

    if (expense.status === ExpenseStatus.PAID) {
      throw new Error('Cannot delete paid expenses')
    }

    await prisma.caseExpense.delete({
      where: { id }
    })

    // Update sales case cost
    await this.updateCaseCosts(expense.salesCaseId, deletedBy)

    await this.auditService.logAction({
      userId: deletedBy,
      action: AuditAction.DELETE,
      entityType: 'CaseExpense',
      entityId: id,
      beforeData: expense
    })
  }

  async getSalesCaseSummary(id: string): Promise<SalesCaseSummary> {
    const salesCase = await this.getSalesCase(id)
    if (!salesCase) {
      throw new Error('Sales case not found')
    }
    
    // Calculate revenue from different stages
    const _quotedAmount = salesCase.quotations
      .filter(q => q.status === 'SENT' || q.status === 'ACCEPTED')
      .reduce((sum, q) => sum + q.totalAmount, 0)
    
    const _orderedAmount = salesCase.salesOrders
      .filter(o => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.totalAmount, 0)
    
    // Get invoiced and paid amounts from related invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        salesOrderId: {
          in: salesCase.salesOrders.map(o => o.id)
        }
      }
    })
    
    const invoicedAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
    const paidAmount = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0)
    
    // Calculate costs
    const directExpenses = salesCase.expenses
      .filter(e => e.status === ExpenseStatus.APPROVED || e.status === ExpenseStatus.PAID)
      .reduce((sum, e) => sum + e.baseAmount, 0)
    
    // TODO: Calculate product cost from delivered items using FIFO
    const productCost = 0
    
    const totalCost = directExpenses + productCost
    
    // Calculate profitability
    const actualRevenue = paidAmount > 0 ? paidAmount : invoicedAmount
    const grossProfit = actualRevenue - productCost
    const _grossMargin = actualRevenue > 0 ? (grossProfit / actualRevenue) * 100 : 0
    const netProfit = actualRevenue - totalCost
    const netMargin = actualRevenue > 0 ? (netProfit / actualRevenue) * 100 : 0
    
    return {
      totalQuotations: salesCase.quotations.length,
      totalOrders: salesCase.salesOrders.length,
      totalInvoiced: invoicedAmount,
      totalPaid: paidAmount,
      totalExpenses: directExpenses,
      estimatedProfit: salesCase.estimatedValue - totalCost,
      actualProfit: netProfit,
      profitMargin: netMargin,
      revenue: actualRevenue,
      fifoCost: productCost
    }
  }

  async getExpensesByCase(salesCaseId: string): Promise<CaseExpense[]> {
    return prisma.caseExpense.findMany({
      where: { salesCaseId },
      orderBy: { expenseDate: 'desc' }
    })
  }

  async getExpensesByCategory(filters: {
    category?: string
    dateFrom?: Date
    dateTo?: Date
    status?: ExpenseStatus
  } = {}): Promise<Array<{
    category: string
    count: number
    totalAmount: number
  }>> {
    const where: Record<string, unknown> = {}
    
    if (filters.category) where.category = filters.category
    if (filters.status) where.status = filters.status
    
    if (filters.dateFrom || filters.dateTo) {
      where.expenseDate = {}
      if (filters.dateFrom) where.expenseDate.gte = filters.dateFrom
      if (filters.dateTo) where.expenseDate.lte = filters.dateTo
    }
    
    const expenses = await prisma.caseExpense.groupBy({
      by: ['category'],
      where,
      _count: {
        id: true
      },
      _sum: {
        baseAmount: true
      }
    })
    
    return expenses.map(e => ({
      category: e.category,
      count: e._count.id,
      totalAmount: e._sum.baseAmount || 0
    }))
  }

  private async generateCaseNumber(): Promise<string> {
    const lastCase = await prisma.salesCase.findFirst({
      orderBy: { caseNumber: 'desc' }
    })

    if (!lastCase) {
      return 'CASE-0001'
    }

    const lastNumber = parseInt(lastCase.caseNumber.split('-')[1])
    const newNumber = lastNumber + 1
    return `CASE-${newNumber.toString().padStart(4, '0')}`
  }

  private async updateCaseCosts(salesCaseId: string, _updatedBy: string): Promise<void> {
    // Calculate total approved expenses
    const result = await prisma.caseExpense.aggregate({
      where: {
        salesCaseId,
        status: {
          in: [ExpenseStatus.APPROVED, ExpenseStatus.PAID]
        }
      },
      _sum: {
        baseAmount: true
      }
    })
    
    const totalExpenses = result._sum.baseAmount || 0
    
    // Update sales case with new cost
    const salesCase = await prisma.salesCase.findUnique({
      where: { id: salesCaseId }
    })
    
    if (salesCase) {
      const profitMargin = salesCase.actualValue > 0 
        ? ((salesCase.actualValue - totalExpenses) / salesCase.actualValue) * 100 
        : 0
      
      await prisma.salesCase.update({
        where: { id: salesCaseId },
        data: {
          cost: totalExpenses,
          profitMargin
        }
      })
    }
  }

  private getDetailedInclude() {
    return {
      customer: true,
      quotations: {
        orderBy: { createdAt: 'desc' as const },
        take: 10 // Limit to prevent memory issues
      },
      salesOrders: {
        orderBy: { createdAt: 'desc' as const },
        take: 10 // Limit to prevent memory issues
      },
      expenses: {
        orderBy: { expenseDate: 'desc' as const },
        take: 20 // Limit to prevent memory issues
      },
      _count: {
        select: {
          quotations: true,
          salesOrders: true,
          expenses: true
        }
      }
    }
  }
}