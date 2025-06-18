import { prisma } from '@/lib/db/prisma'
import { BaseService } from './base.service'
import { AuditService } from './audit.service'
import { JournalEntryService } from './accounting/journal-entry.service'
import { AuditAction } from '@/lib/validators/audit.validator'
import { 
  CaseExpense,
  ExpenseStatus,
  SalesCase,
  Account,
  Prisma
} from '@/lib/generated/prisma'

export interface CreateExpenseInput {
  salesCaseId: string
  expenseDate: Date
  category: string
  description: string
  amount: number
  currency?: string
  exchangeRate?: number
  attachmentUrl?: string
  receiptNumber?: string
  vendor?: string
  accountId?: string
}

export interface UpdateExpenseInput {
  expenseDate?: Date
  category?: string
  description?: string
  amount?: number
  currency?: string
  exchangeRate?: number
  attachmentUrl?: string
  receiptNumber?: string
  vendor?: string
  accountId?: string
}

export interface ExpenseWithDetails extends CaseExpense {
  salesCase: {
    id: string
    caseNumber: string
    title: string
    customer: {
      id: string
      name: string
    }
  }
  account?: {
    id: string
    code: string
    name: string
  } | null
  journalEntry?: {
    id: string
    entryNumber: string
    status: string
  } | null
}

export interface ExpenseCategory {
  name: string
  description: string
  accountId?: string
}

// Predefined expense categories for diesel engine maintenance
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { name: 'Diagnostic Services', description: 'Engine diagnostics and analysis services' },
  { name: 'Engine Parts', description: 'Diesel engine parts and components' },
  { name: 'Labor - Technician', description: 'Regular technician labor costs' },
  { name: 'Labor - Specialist', description: 'Specialist consultant or expert labor' },
  { name: 'Travel - Service Call', description: 'Travel expenses for on-site service calls' },
  { name: 'Equipment Rental', description: 'Specialized equipment rental for repairs' },
  { name: 'Subcontractor Services', description: 'Outsourced specialized repair services' },
  { name: 'Expedited Shipping', description: 'Rush delivery for critical parts' },
  { name: 'Warranty Parts', description: 'Parts covered under warranty claims' },
  { name: 'Emergency Response', description: '24/7 emergency service expenses' },
  { name: 'Testing & Analysis', description: 'Oil analysis, compression testing, etc.' },
  { name: 'Certification Fees', description: 'Compliance and certification costs' },
  { name: 'Environmental Disposal', description: 'Hazardous waste and oil disposal' },
  { name: 'Other', description: 'Other miscellaneous expenses' }
]

export class ExpenseService extends BaseService {
  private auditService: AuditService
  private journalEntryService: JournalEntryService

  constructor() {
    super('ExpenseService')
    this.auditService = new AuditService()
    this.journalEntryService = new JournalEntryService()
  }

  async createExpense(
    data: CreateExpenseInput & { createdBy: string }
  ): Promise<ExpenseWithDetails> {
    return this.withLogging('createExpense', async () => {
      // Validate sales case exists
      const salesCase = await prisma.salesCase.findUnique({
        where: { id: data.salesCaseId }
      })
      
      if (!salesCase) {
        throw new Error('Sales case not found')
      }

      // Validate account if provided
      if (data.accountId) {
        const account = await prisma.account.findUnique({
          where: { id: data.accountId }
        })
        
        if (!account || account.type !== 'EXPENSE') {
          throw new Error('Invalid expense account')
        }
      }

      // Calculate base amount
      const baseAmount = data.amount * (data.exchangeRate || 1)

      // Create expense
      const expense = await prisma.caseExpense.create({
        data: {
          salesCaseId: data.salesCaseId,
          expenseDate: data.expenseDate,
          category: data.category,
          description: data.description,
          amount: data.amount,
          currency: data.currency || 'USD',
          exchangeRate: data.exchangeRate || 1,
          baseAmount,
          attachmentUrl: data.attachmentUrl,
          receiptNumber: data.receiptNumber,
          vendor: data.vendor,
          accountId: data.accountId,
          status: ExpenseStatus.DRAFT,
          createdBy: data.createdBy
        },
        include: this.getDetailedInclude()
      })

      // Audit log
      await this.auditService.logAction({
        userId: data.createdBy,
        action: AuditAction.CREATE,
        entityType: 'CaseExpense',
        entityId: expense.id,
        metadata: {
          salesCaseId: data.salesCaseId,
          category: data.category,
          amount: data.amount
        },
        afterData: expense
      })

      return expense as ExpenseWithDetails
    })
  }

  async updateExpense(
    id: string,
    data: UpdateExpenseInput & { updatedBy: string }
  ): Promise<ExpenseWithDetails> {
    return this.withLogging('updateExpense', async () => {
      const existingExpense = await this.getExpense(id)
      if (!existingExpense) {
        throw new Error('Expense not found')
      }

      if (existingExpense.status !== ExpenseStatus.DRAFT) {
        throw new Error('Only draft expenses can be updated')
      }

      // Validate account if changed
      if (data.accountId && data.accountId !== existingExpense.accountId) {
        const account = await prisma.account.findUnique({
          where: { id: data.accountId }
        })
        
        if (!account || account.type !== 'EXPENSE') {
          throw new Error('Invalid expense account')
        }
      }

      // Calculate base amount if amount or exchange rate changed
      let baseAmount = existingExpense.baseAmount
      if (data.amount || data.exchangeRate) {
        const amount = data.amount || existingExpense.amount
        const exchangeRate = data.exchangeRate || existingExpense.exchangeRate
        baseAmount = amount * exchangeRate
      }

      const updatedExpense = await prisma.caseExpense.update({
        where: { id },
        data: {
          ...data,
          baseAmount,
          updatedAt: new Date()
        },
        include: this.getDetailedInclude()
      })

      // Audit log
      await this.auditService.logAction({
        userId: data.updatedBy,
        action: AuditAction.UPDATE,
        entityType: 'CaseExpense',
        entityId: id,
        beforeData: existingExpense,
        afterData: updatedExpense
      })

      return updatedExpense as ExpenseWithDetails
    })
  }

  async submitExpense(
    id: string,
    submittedBy: string
  ): Promise<ExpenseWithDetails> {
    return this.withLogging('submitExpense', async () => {
      const expense = await this.getExpense(id)
      if (!expense) {
        throw new Error('Expense not found')
      }

      if (expense.status !== ExpenseStatus.DRAFT) {
        throw new Error('Only draft expenses can be submitted')
      }

      const updatedExpense = await prisma.caseExpense.update({
        where: { id },
        data: {
          status: ExpenseStatus.SUBMITTED,
          updatedAt: new Date()
        },
        include: this.getDetailedInclude()
      })

      // Audit log
      await this.auditService.logAction({
        userId: submittedBy,
        action: AuditAction.UPDATE,
        entityType: 'CaseExpense',
        entityId: id,
        metadata: {
          statusChange: {
            from: ExpenseStatus.DRAFT,
            to: ExpenseStatus.SUBMITTED
          }
        }
      })

      return updatedExpense as ExpenseWithDetails
    })
  }

  async approveExpense(
    id: string,
    approvedBy: string,
    createJournalEntry: boolean = true
  ): Promise<ExpenseWithDetails> {
    return this.withLogging('approveExpense', async () => {
      const expense = await this.getExpense(id)
      if (!expense) {
        throw new Error('Expense not found')
      }

      if (expense.status !== ExpenseStatus.SUBMITTED) {
        throw new Error('Only submitted expenses can be approved')
      }

      return await prisma.$transaction(async (tx) => {
        // Update expense status
        const updatedExpense = await tx.caseExpense.update({
          where: { id },
          data: {
            status: ExpenseStatus.APPROVED,
            approvedBy,
            approvedAt: new Date()
          },
          include: this.getDetailedInclude()
        })

        // Create journal entry if requested and account is specified
        if (createJournalEntry && expense.accountId) {
          const journalEntry = await this.createExpenseJournalEntry(expense, approvedBy, tx)
          
          // Link journal entry to expense
          await tx.caseExpense.update({
            where: { id },
            data: { journalEntryId: journalEntry.id }
          })
        }

        // Update sales case cost
        await tx.salesCase.update({
          where: { id: expense.salesCaseId },
          data: {
            cost: {
              increment: expense.baseAmount
            }
          }
        })

        // Audit log
        await this.auditService.logAction({
          userId: approvedBy,
          action: AuditAction.UPDATE,
          entityType: 'CaseExpense',
          entityId: id,
          metadata: {
            statusChange: {
              from: ExpenseStatus.SUBMITTED,
              to: ExpenseStatus.APPROVED
            }
          }
        })

        return updatedExpense as ExpenseWithDetails
      })
    })
  }

  async rejectExpense(
    id: string,
    rejectedBy: string,
    reason: string
  ): Promise<ExpenseWithDetails> {
    return this.withLogging('rejectExpense', async () => {
      const expense = await this.getExpense(id)
      if (!expense) {
        throw new Error('Expense not found')
      }

      if (expense.status !== ExpenseStatus.SUBMITTED) {
        throw new Error('Only submitted expenses can be rejected')
      }

      const updatedExpense = await prisma.caseExpense.update({
        where: { id },
        data: {
          status: ExpenseStatus.REJECTED,
          rejectedBy,
          rejectedAt: new Date(),
          rejectionReason: reason
        },
        include: this.getDetailedInclude()
      })

      // Audit log
      await this.auditService.logAction({
        userId: rejectedBy,
        action: AuditAction.UPDATE,
        entityType: 'CaseExpense',
        entityId: id,
        metadata: {
          statusChange: {
            from: ExpenseStatus.SUBMITTED,
            to: ExpenseStatus.REJECTED
          },
          rejectionReason: reason
        }
      })

      return updatedExpense as ExpenseWithDetails
    })
  }

  async getExpense(id: string): Promise<ExpenseWithDetails | null> {
    return this.withLogging('getExpense', async () => {
      const expense = await prisma.caseExpense.findUnique({
        where: { id },
        include: this.getDetailedInclude()
      })

      return expense as ExpenseWithDetails | null
    })
  }

  async getExpensesBySalesCase(
    salesCaseId: string,
    options?: {
      status?: ExpenseStatus
      category?: string
    }
  ): Promise<ExpenseWithDetails[]> {
    const where: Prisma.CaseExpenseWhereInput = {
      salesCaseId
    }

    if (options?.status) {
      where.status = options.status
    }

    if (options?.category) {
      where.category = options.category
    }

    const expenses = await prisma.caseExpense.findMany({
      where,
      include: this.getDetailedInclude(),
      orderBy: { expenseDate: 'desc' }
    })

    return expenses as ExpenseWithDetails[]
  }

  async getAllExpenses(options?: {
    salesCaseId?: string
    status?: ExpenseStatus
    category?: string
    dateFrom?: Date
    dateTo?: Date
    limit?: number
    offset?: number
  }): Promise<ExpenseWithDetails[]> {
    const where: Prisma.CaseExpenseWhereInput = {}

    if (options?.salesCaseId) {
      where.salesCaseId = options.salesCaseId
    }

    if (options?.status) {
      where.status = options.status
    }

    if (options?.category) {
      where.category = options.category
    }

    if (options?.dateFrom || options?.dateTo) {
      where.expenseDate = {}
      if (options.dateFrom) {
        where.expenseDate.gte = options.dateFrom
      }
      if (options.dateTo) {
        where.expenseDate.lte = options.dateTo
      }
    }

    const expenses = await prisma.caseExpense.findMany({
      where,
      include: this.getDetailedInclude(),
      orderBy: { expenseDate: 'desc' },
      take: options?.limit,
      skip: options?.offset
    })

    return expenses as ExpenseWithDetails[]
  }

  async getExpenseSummaryBySalesCase(salesCaseId: string): Promise<{
    totalExpenses: number
    approvedExpenses: number
    pendingExpenses: number
    byCategory: Array<{
      category: string
      count: number
      total: number
    }>
  }> {
    const expenses = await this.getExpensesBySalesCase(salesCaseId)

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.baseAmount, 0)
    const approvedExpenses = expenses
      .filter(exp => exp.status === ExpenseStatus.APPROVED || exp.status === ExpenseStatus.PAID)
      .reduce((sum, exp) => sum + exp.baseAmount, 0)
    const pendingExpenses = expenses
      .filter(exp => exp.status === ExpenseStatus.DRAFT || exp.status === ExpenseStatus.SUBMITTED)
      .reduce((sum, exp) => sum + exp.baseAmount, 0)

    // Group by category
    const categoryMap = new Map<string, { count: number; total: number }>()
    
    expenses.forEach(expense => {
      const existing = categoryMap.get(expense.category) || { count: 0, total: 0 }
      categoryMap.set(expense.category, {
        count: existing.count + 1,
        total: existing.total + expense.baseAmount
      })
    })

    const byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      total: data.total
    }))

    return {
      totalExpenses,
      approvedExpenses,
      pendingExpenses,
      byCategory
    }
  }

  async getSalesCaseProfitability(salesCaseId: string): Promise<{
    revenue: number
    directCosts: number
    expenses: number
    grossProfit: number
    netProfit: number
    profitMargin: number
  }> {
    // Get sales case with actual revenue
    const salesCase = await prisma.salesCase.findUnique({
      where: { id: salesCaseId },
      include: {
        salesOrders: {
          where: { status: { in: ['COMPLETED', 'INVOICED'] } }
        }
      }
    })

    if (!salesCase) {
      throw new Error('Sales case not found')
    }

    // Calculate revenue from completed/invoiced orders
    const revenue = salesCase.salesOrders.reduce((sum, order) => sum + order.totalAmount, 0)

    // Get all approved expenses
    const expenses = await this.getExpensesBySalesCase(salesCaseId, {
      status: ExpenseStatus.APPROVED
    })
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.baseAmount, 0)

    // Calculate direct costs (COGS) from delivered items
    // This would need to be implemented based on FIFO costing
    const directCosts = salesCase.cost || 0

    const grossProfit = revenue - directCosts
    const netProfit = grossProfit - totalExpenses
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

    return {
      revenue,
      directCosts,
      expenses: totalExpenses,
      grossProfit,
      netProfit,
      profitMargin
    }
  }

  private async createExpenseJournalEntry(
    expense: CaseExpense & { account?: Account | null },
    userId: string,
    tx: Prisma.TransactionClient
  ) {
    if (!expense.accountId) {
      throw new Error('Expense account is required for journal entry')
    }

    // Get cash/bank account (simplified - should be configurable)
    const cashAccount = await tx.account.findFirst({
      where: {
        code: '1000', // Assuming this is the cash account
        status: 'ACTIVE'
      }
    })

    if (!cashAccount) {
      throw new Error('Cash account not found')
    }

    const lines = [
      {
        accountId: expense.accountId,
        description: `${expense.category} - ${expense.description}`,
        debitAmount: expense.baseAmount,
        creditAmount: 0,
        currency: expense.currency,
        exchangeRate: expense.exchangeRate,
        baseDebitAmount: expense.baseAmount,
        baseCreditAmount: 0
      },
      {
        accountId: cashAccount.id,
        description: `Payment for ${expense.category}`,
        debitAmount: 0,
        creditAmount: expense.baseAmount,
        currency: expense.currency,
        exchangeRate: expense.exchangeRate,
        baseDebitAmount: 0,
        baseCreditAmount: expense.baseAmount
      }
    ]

    return await this.journalEntryService.createJournalEntry({
      date: expense.expenseDate,
      description: `Expense: ${expense.category} - ${expense.description}`,
      reference: expense.receiptNumber || `EXP-${expense.id}`,
      currency: expense.currency,
      exchangeRate: expense.exchangeRate,
      lines,
      createdBy: userId
    }, tx)
  }

  private getDetailedInclude() {
    return {
      salesCase: {
        select: {
          id: true,
          caseNumber: true,
          title: true,
          customer: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      account: {
        select: {
          id: true,
          code: true,
          name: true
        }
      },
      journalEntry: {
        select: {
          id: true,
          entryNumber: true,
          status: true
        }
      }
    }
  }
}