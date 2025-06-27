import { prisma } from '@/lib/db/prisma'
import { FinancialStatementsService } from '../accounting/financial-statements.service'
import { TrialBalanceService } from '../accounting/trial-balance.service'
import { 
  InvoiceStatus
} from "@prisma/client"
import { OrderStatus } from '@/lib/constants/order-status'

export interface DashboardMetrics {
  revenue: {
    currentMonth: number
    previousMonth: number
    currentYear: number
    previousYear: number
    growth: {
      monthly: number
      yearly: number
    }
  }
  orders: {
    pending: number
    processing: number
    shipped: number
    totalValue: number
  }
  invoices: {
    outstanding: number
    overdue: number
    totalReceivables: number
  }
  inventory: {
    totalValue: number
    lowStockItems: number
    movementsToday: number
  }
  cashFlow: {
    currentBalance: number
    projectedBalance: number
    inflow: number
    outflow: number
  }
}

export interface SalesAnalytics {
  dailySales: Array<{
    date: string
    amount: number
    orders: number
  }>
  topCustomers: Array<{
    id: string
    name: string
    totalValue: number
    orderCount: number
  }>
  productPerformance: Array<{
    itemCode: string
    itemName: string
    quantitySold: number
    revenue: number
  }>
  salesByRegion: Array<{
    region: string
    amount: number
    percentage: number
  }>
}

export interface FinancialSummary {
  profitLoss: {
    totalRevenue: number
    totalExpenses: number
    grossProfit: number
    netIncome: number
    profitMargin: number
  }
  balanceSheet: {
    totalAssets: number
    totalLiabilities: number
    totalEquity: number
    workingCapital: number
    currentRatio: number
  }
  cashFlow: {
    operatingCashFlow: number
    investingCashFlow: number
    financingCashFlow: number
    netCashFlow: number
  }
}

export interface KPIMetrics {
  daysInSales: number  // Days Sales Outstanding
  inventoryTurnover: number
  grossMargin: number
  operatingMargin: number
  returnOnAssets: number
  returnOnEquity: number
  debtToEquity: number
  currentRatio: number
}

export class FinancialDashboardService {
  private financialStatementsService: FinancialStatementsService
  private trialBalanceService: TrialBalanceService

  constructor() {
    this.financialStatementsService = new FinancialStatementsService()
    this.trialBalanceService = new TrialBalanceService()
  }

  async getDashboardMetrics(asOfDate: Date = new Date()): Promise<DashboardMetrics> {
    const [
      revenue,
      orders,
      invoices,
      inventory,
      cashFlow
    ] = await Promise.all([
      this.getRevenueMetrics(asOfDate),
      this.getOrderMetrics(),
      this.getInvoiceMetrics(),
      this.getInventoryMetrics(),
      this.getCashFlowMetrics(asOfDate)
    ])

    return {
      revenue,
      orders,
      invoices,
      inventory,
      cashFlow
    }
  }

  async getSalesAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<SalesAnalytics> {
    const [
      dailySales,
      topCustomers,
      productPerformance,
      salesByRegion
    ] = await Promise.all([
      this.getDailySales(startDate, endDate),
      this.getTopCustomers(startDate, endDate),
      this.getProductPerformance(startDate, endDate),
      this.getSalesByRegion(startDate, endDate)
    ])

    return {
      dailySales,
      topCustomers,
      productPerformance,
      salesByRegion
    }
  }

  async getFinancialSummary(asOfDate: Date = new Date()): Promise<FinancialSummary> {
    const year = asOfDate.getFullYear()
    const startOfYear = new Date(year, 0, 1)

    const [incomeStatement, balanceSheet] = await Promise.all([
      this.financialStatementsService.generateIncomeStatement(startOfYear, asOfDate),
      this.financialStatementsService.generateBalanceSheet(asOfDate)
    ])

    const profitLoss = {
      totalRevenue: incomeStatement.totalIncome,
      totalExpenses: incomeStatement.totalExpenses,
      grossProfit: incomeStatement.totalIncome - incomeStatement.totalExpenses,
      netIncome: incomeStatement.netIncome,
      profitMargin: incomeStatement.totalIncome > 0 
        ? (incomeStatement.netIncome / incomeStatement.totalIncome) * 100 
        : 0
    }

    const workingCapital = balanceSheet.assets.accounts
      .filter(acc => acc.accountCode.startsWith('1'))
      .reduce((sum, acc) => sum + acc.balance, 0) -
      balanceSheet.liabilities.accounts
      .filter(acc => acc.accountCode.startsWith('2'))
      .reduce((sum, acc) => sum + acc.balance, 0)

    const currentAssets = balanceSheet.assets.accounts
      .filter(acc => acc.accountCode.startsWith('1'))
      .reduce((sum, acc) => sum + acc.balance, 0)

    const currentLiabilities = balanceSheet.liabilities.accounts
      .filter(acc => acc.accountCode.startsWith('2'))
      .reduce((sum, acc) => sum + acc.balance, 0)

    const balanceSheetSummary = {
      totalAssets: balanceSheet.totalAssets,
      totalLiabilities: balanceSheet.totalLiabilities,
      totalEquity: balanceSheet.totalEquity,
      workingCapital,
      currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0
    }

    // Cash flow would need cash flow statement implementation
    const cashFlow = {
      operatingCashFlow: 0,
      investingCashFlow: 0,
      financingCashFlow: 0,
      netCashFlow: 0
    }

    return {
      profitLoss,
      balanceSheet: balanceSheetSummary,
      cashFlow
    }
  }

  async getKPIMetrics(asOfDate: Date = new Date()): Promise<KPIMetrics> {
    const [
      daysInSales,
      inventoryTurnover,
      financialSummary
    ] = await Promise.all([
      this.calculateDaysInSales(),
      this.calculateInventoryTurnover(),
      this.getFinancialSummary(asOfDate)
    ])

    const grossMargin = financialSummary.profitLoss.totalRevenue > 0
      ? (financialSummary.profitLoss.grossProfit / financialSummary.profitLoss.totalRevenue) * 100
      : 0

    const operatingMargin = financialSummary.profitLoss.totalRevenue > 0
      ? (financialSummary.profitLoss.netIncome / financialSummary.profitLoss.totalRevenue) * 100
      : 0

    const returnOnAssets = financialSummary.balanceSheet.totalAssets > 0
      ? (financialSummary.profitLoss.netIncome / financialSummary.balanceSheet.totalAssets) * 100
      : 0

    const returnOnEquity = financialSummary.balanceSheet.totalEquity > 0
      ? (financialSummary.profitLoss.netIncome / financialSummary.balanceSheet.totalEquity) * 100
      : 0

    const debtToEquity = financialSummary.balanceSheet.totalEquity > 0
      ? financialSummary.balanceSheet.totalLiabilities / financialSummary.balanceSheet.totalEquity
      : 0

    return {
      daysInSales,
      inventoryTurnover,
      grossMargin,
      operatingMargin,
      returnOnAssets,
      returnOnEquity,
      debtToEquity,
      currentRatio: financialSummary.balanceSheet.currentRatio
    }
  }

  // Private helper methods

  private async getRevenueMetrics(asOfDate: Date) {
    const currentMonth = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), 1)
    const previousMonth = new Date(asOfDate.getFullYear(), asOfDate.getMonth() - 1, 1)
    const currentYear = new Date(asOfDate.getFullYear(), 0, 1)
    const previousYear = new Date(asOfDate.getFullYear() - 1, 0, 1)

    const [currentMonthRevenue, previousMonthRevenue, currentYearRevenue, previousYearRevenue] = 
      await Promise.all([
        this.getRevenueForPeriod(currentMonth, asOfDate),
        this.getRevenueForPeriod(previousMonth, currentMonth),
        this.getRevenueForPeriod(currentYear, asOfDate),
        this.getRevenueForPeriod(previousYear, currentYear)
      ])

    const monthlyGrowth = previousMonthRevenue > 0 
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
      : 0

    const yearlyGrowth = previousYearRevenue > 0 
      ? ((currentYearRevenue - previousYearRevenue) / previousYearRevenue) * 100 
      : 0

    return {
      currentMonth: currentMonthRevenue,
      previousMonth: previousMonthRevenue,
      currentYear: currentYearRevenue,
      previousYear: previousYearRevenue,
      growth: {
        monthly: monthlyGrowth,
        yearly: yearlyGrowth
      }
    }
  }

  private async getRevenueForPeriod(startDate: Date, endDate: Date): Promise<number> {
    const result = await prisma.invoice.aggregate({
      where: {
        invoiceDate: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.PAID]
        }
      },
      _sum: {
        totalAmount: true
      }
    })

    return result._sum.totalAmount || 0
  }

  private async getOrderMetrics() {
    const [pending, processing, shipped, totalValue] = await Promise.all([
      prisma.salesOrder.count({ where: { status: OrderStatus.PENDING } }),
      prisma.salesOrder.count({ where: { status: OrderStatus.PROCESSING } }),
      prisma.salesOrder.count({ where: { status: OrderStatus.SHIPPED } }),
      prisma.salesOrder.aggregate({
        where: {
          status: {
            in: [OrderStatus.PENDING, OrderStatus.APPROVED, OrderStatus.PROCESSING]
          }
        },
        _sum: { totalAmount: true }
      })
    ])

    return {
      pending,
      processing,
      shipped,
      totalValue: totalValue._sum.totalAmount || 0
    }
  }

  private async getInvoiceMetrics() {
    const [outstanding, overdue, totalReceivables] = await Promise.all([
      prisma.invoice.count({
        where: {
          status: {
            in: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL]
          }
        }
      }),
      prisma.invoice.count({
        where: {
          dueDate: { lt: new Date() },
          balanceAmount: { gt: 0 }
        }
      }),
      prisma.invoice.aggregate({
        where: {
          balanceAmount: { gt: 0 }
        },
        _sum: { balanceAmount: true }
      })
    ])

    return {
      outstanding,
      overdue,
      totalReceivables: totalReceivables._sum.balanceAmount || 0
    }
  }

  private async getInventoryMetrics() {
    const [totalValue, lowStockItems, movementsToday] = await Promise.all([
      this.getTotalInventoryValue(),
      this.getLowStockItemCount(),
      this.getTodayMovementCount()
    ])

    return {
      totalValue,
      lowStockItems,
      movementsToday
    }
  }

  private async getTotalInventoryValue(): Promise<number> {
    const result = await prisma.stockMovement.aggregate({
      _sum: { totalCost: true }
    })

    return result._sum.totalCost || 0
  }

  private async getLowStockItemCount(): Promise<number> {
    // This would require a more complex query to calculate current stock vs reorder point
    // For now, return a placeholder
    return 0
  }

  private async getTodayMovementCount(): Promise<number> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return prisma.stockMovement.count({
      where: {
        movementDate: {
          gte: today,
          lt: tomorrow
        }
      }
    })
  }

  private async getCashFlowMetrics(_asOfDate: Date) {
    // This would integrate with cash accounts from chart of accounts
    // For now, return placeholders
    return {
      currentBalance: 0,
      projectedBalance: 0,
      inflow: 0,
      outflow: 0
    }
  }

  private async getDailySales(startDate: Date, endDate: Date) {
    const sales = await prisma.invoice.groupBy({
      by: ['invoiceDate'],
      where: {
        invoiceDate: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.PAID]
        }
      },
      _sum: {
        totalAmount: true
      },
      _count: {
        id: true
      },
      orderBy: {
        invoiceDate: 'asc'
      }
    })

    return sales.map(sale => ({
      date: sale.invoiceDate.toISOString().split('T')[0],
      amount: sale._sum.totalAmount || 0,
      orders: sale._count.id
    }))
  }

  private async getTopCustomers(startDate: Date, endDate: Date) {
    const customers = await prisma.customer.findMany({
      include: {
        invoices: {
          where: {
            invoiceDate: {
              gte: startDate,
              lte: endDate
            },
            status: {
              in: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.PAID]
            }
          }
        }
      }
    })

    return customers
      .map(customer => ({
        id: customer.id,
        name: customer.name,
        totalValue: customer.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
        orderCount: customer.invoices.length
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10)
  }

  private async getProductPerformance(_startDate: Date, _endDate: Date) {
    // This would require joining invoice items with item master
    // For now, return empty array
    return []
  }

  private async getSalesByRegion(_startDate: Date, _endDate: Date) {
    // This would require customer address analysis
    // For now, return empty array
    return []
  }

  private async calculateDaysInSales(): Promise<number> {
    // Average collection period calculation
    const averageReceivables = await prisma.invoice.aggregate({
      where: { balanceAmount: { gt: 0 } },
      _avg: { balanceAmount: true }
    })

    const annualSales = await this.getRevenueForPeriod(
      new Date(new Date().getFullYear(), 0, 1),
      new Date()
    )

    const dailySales = annualSales / 365
    return dailySales > 0 ? (averageReceivables._avg.balanceAmount || 0) / dailySales : 0
  }

  private async calculateInventoryTurnover(): Promise<number> {
    // Cost of goods sold / Average inventory
    // This would require COGS calculation and average inventory value
    // For now, return placeholder
    return 0
  }
}