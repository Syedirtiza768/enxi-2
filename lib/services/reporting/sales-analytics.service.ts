import { prisma } from '@/lib/db/prisma'
import { BaseService } from '../base.service'
import { InvoiceStatus, QuotationStatus } from "@prisma/client"
import { OrderStatus } from '@/lib/constants/order-status'

export interface SalesMetrics {
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
  conversionRate: number
  newCustomers: number
  repeatCustomers: number
  salesGrowth: number
  targetAchievement: number
}

export interface SalesPerformance {
  dailySales: Array<{
    date: string
    revenue: number
    orders: number
    averageOrderValue: number
  }>
  monthlySales: Array<{
    month: string
    revenue: number
    orders: number
    growth: number
  }>
  quarterlySales: Array<{
    quarter: string
    revenue: number
    orders: number
    growth: number
  }>
  salesTrend: 'increasing' | 'decreasing' | 'stable'
}

export interface CustomerAnalytics {
  topCustomers: Array<{
    customerId: string
    customerName: string
    totalRevenue: number
    orderCount: number
    averageOrderValue: number
    lastOrderDate: Date
    customerSince: Date
    loyalty: 'new' | 'regular' | 'vip'
  }>
  customerSegmentation: Array<{
    segment: string
    customerCount: number
    totalRevenue: number
    averageOrderValue: number
    percentage: number
  }>
  customerRetention: {
    newCustomers: number
    returningCustomers: number
    churnedCustomers: number
    retentionRate: number
  }
  geographicDistribution: Array<{
    region: string
    customerCount: number
    totalRevenue: number
    percentage: number
  }>
}

export interface ProductAnalytics {
  topSellingProducts: Array<{
    itemCode: string
    itemName: string
    quantitySold: number
    revenue: number
    profitMargin: number
    categoryName: string
  }>
  categoryPerformance: Array<{
    categoryName: string
    revenue: number
    quantity: number
    profitMargin: number
    percentage: number
  }>
  productTrends: Array<{
    itemCode: string
    itemName: string
    trend: 'rising' | 'falling' | 'stable'
    growthRate: number
  }>
  slowMovingProducts: Array<{
    itemCode: string
    itemName: string
    lastSaleDate: Date
    daysWithoutSale: number
    currentStock: number
  }>
}

export interface SalesForecast {
  nextMonth: {
    predictedRevenue: number
    confidence: number
    factors: string[]
  }
  nextQuarter: {
    predictedRevenue: number
    confidence: number
    factors: string[]
  }
  seasonalTrends: Array<{
    month: string
    averageRevenue: number
    volatility: number
  }>
  recommendations: string[]
}

export interface SalesConversion {
  leadToQuotation: {
    leadsGenerated: number
    quotationsCreated: number
    conversionRate: number
  }
  quotationToOrder: {
    quotationsSent: number
    ordersReceived: number
    conversionRate: number
  }
  orderToInvoice: {
    ordersApproved: number
    invoicesGenerated: number
    conversionRate: number
  }
  invoiceToPaid: {
    invoicesSent: number
    invoicesPaid: number
    conversionRate: number
    averageCollectionDays: number
  }
  overallFunnel: {
    totalLeads: number
    totalPaidInvoices: number
    overallConversionRate: number
  }
}

export class SalesAnalyticsService extends BaseService {
  constructor() {
    super('SalesAnalyticsService')
  }

  async getSalesMetrics(
    startDate: Date,
    endDate: Date,
    targetRevenue?: number
  ): Promise<SalesMetrics> {
    return this.withLogging('getSalesMetrics', async () => {
      const [
        revenueData,
        ordersData,
        customersData,
        previousPeriodRevenue
      ] = await Promise.all([
        this.getRevenueData(startDate, endDate),
        this.getOrdersData(startDate, endDate),
        this.getCustomersData(startDate, endDate),
        this.getPreviousPeriodRevenue(startDate, endDate)
      ])

      const salesGrowth = previousPeriodRevenue > 0 
        ? ((revenueData.totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
        : 0

      const targetAchievement = targetRevenue 
        ? (revenueData.totalRevenue / targetRevenue) * 100
        : 0

      const conversionRate = await this.getConversionRate(startDate, endDate)

      return {
        totalRevenue: revenueData.totalRevenue,
        totalOrders: ordersData.totalOrders,
        averageOrderValue: ordersData.totalOrders > 0 
          ? revenueData.totalRevenue / ordersData.totalOrders 
          : 0,
        conversionRate,
        newCustomers: customersData.newCustomers,
        repeatCustomers: customersData.repeatCustomers,
        salesGrowth,
        targetAchievement
      }
    })
  }

  async getSalesPerformance(
    startDate: Date,
    endDate: Date
  ): Promise<SalesPerformance> {
    return this.withLogging('getSalesPerformance', async () => {
      const [dailySales, monthlySales, quarterlySales] = await Promise.all([
        this.getDailySalesData(startDate, endDate),
        this.getMonthlySalesData(startDate, endDate),
        this.getQuarterlySalesData(startDate, endDate)
      ])

      const salesTrend = this.analyzeSalesTrend(dailySales)

      return {
        dailySales,
        monthlySales,
        quarterlySales,
        salesTrend
      }
    })
  }

  async getCustomerAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<CustomerAnalytics> {
    return this.withLogging('getCustomerAnalytics', async () => {
      const [
        topCustomers,
        customerSegmentation,
        customerRetention,
        geographicDistribution
      ] = await Promise.all([
        this.getTopCustomers(startDate, endDate),
        this.getCustomerSegmentation(startDate, endDate),
        this.getCustomerRetention(startDate, endDate),
        this.getGeographicDistribution(startDate, endDate)
      ])

      return {
        topCustomers,
        customerSegmentation,
        customerRetention,
        geographicDistribution
      }
    })
  }

  async getProductAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<ProductAnalytics> {
    return this.withLogging('getProductAnalytics', async () => {
      const [
        topSellingProducts,
        categoryPerformance,
        productTrends,
        slowMovingProducts
      ] = await Promise.all([
        this.getTopSellingProducts(startDate, endDate),
        this.getCategoryPerformance(startDate, endDate),
        this.getProductTrends(startDate, endDate),
        this.getSlowMovingProducts(startDate, endDate)
      ])

      return {
        topSellingProducts,
        categoryPerformance,
        productTrends,
        slowMovingProducts
      }
    })
  }

  async getSalesForecast(historicalMonths: number = 12): Promise<SalesForecast> {
    return this.withLogging('getSalesForecast', async () => {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(endDate.getMonth() - historicalMonths)

      const historicalData = await this.getMonthlySalesData(startDate, endDate)
      
      // Simple linear regression for forecast
      const nextMonth = this.forecastNextPeriod(historicalData, 1)
      const nextQuarter = this.forecastNextPeriod(historicalData, 3)
      
      const seasonalTrends = await this.getSeasonalTrends()
      const recommendations = this.generateRecommendations(historicalData, seasonalTrends)

      return {
        nextMonth,
        nextQuarter,
        seasonalTrends,
        recommendations
      }
    })
  }

  async getSalesConversion(
    startDate: Date,
    endDate: Date
  ): Promise<SalesConversion> {
    return this.withLogging('getSalesConversion', async () => {
      const [
        leadToQuotation,
        quotationToOrder,
        orderToInvoice,
        invoiceToPaid
      ] = await Promise.all([
        this.getLeadToQuotationConversion(startDate, endDate),
        this.getQuotationToOrderConversion(startDate, endDate),
        this.getOrderToInvoiceConversion(startDate, endDate),
        this.getInvoiceToPaidConversion(startDate, endDate)
      ])

      const overallFunnel = {
        totalLeads: leadToQuotation.leadsGenerated,
        totalPaidInvoices: invoiceToPaid.invoicesPaid,
        overallConversionRate: leadToQuotation.leadsGenerated > 0 
          ? (invoiceToPaid.invoicesPaid / leadToQuotation.leadsGenerated) * 100
          : 0
      }

      return {
        leadToQuotation,
        quotationToOrder,
        orderToInvoice,
        invoiceToPaid,
        overallFunnel
      }
    })
  }

  // Private helper methods

  private async getRevenueData(startDate: Date, endDate: Date) {
    const result = await prisma.invoice.aggregate({
      where: {
        invoiceDate: { gte: startDate, lte: endDate },
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.PAID] }
      },
      _sum: { totalAmount: true }
    })

    return {
      totalRevenue: result._sum.totalAmount || 0
    }
  }

  private async getOrdersData(startDate: Date, endDate: Date) {
    const result = await prisma.salesOrder.aggregate({
      where: {
        orderDate: { gte: startDate, lte: endDate },
        status: { not: OrderStatus.CANCELLED }
      },
      _count: { id: true }
    })

    return {
      totalOrders: result._count.id || 0
    }
  }

  private async getCustomersData(startDate: Date, endDate: Date) {
    const [newCustomers, repeatCustomers] = await Promise.all([
      prisma.customer.count({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        }
      }),
      prisma.customer.count({
        where: {
          createdAt: { lt: startDate },
          invoices: {
            some: {
              invoiceDate: { gte: startDate, lte: endDate }
            }
          }
        }
      })
    ])

    return { newCustomers, repeatCustomers }
  }

  private async getPreviousPeriodRevenue(startDate: Date, endDate: Date): Promise<number> {
    const periodLength = endDate.getTime() - startDate.getTime()
    const previousEndDate = new Date(startDate.getTime() - 1)
    const previousStartDate = new Date(previousEndDate.getTime() - periodLength)

    const result = await prisma.invoice.aggregate({
      where: {
        invoiceDate: { gte: previousStartDate, lte: previousEndDate },
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.PAID] }
      },
      _sum: { totalAmount: true }
    })

    return result._sum.totalAmount || 0
  }

  private async getConversionRate(startDate: Date, endDate: Date): Promise<number> {
    const [quotations, orders] = await Promise.all([
      prisma.quotation.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { not: QuotationStatus.DRAFT }
        }
      }),
      prisma.salesOrder.count({
        where: {
          orderDate: { gte: startDate, lte: endDate },
          status: { not: OrderStatus.CANCELLED }
        }
      })
    ])

    return quotations > 0 ? (orders / quotations) * 100 : 0
  }

  private async getDailySalesData(startDate: Date, endDate: Date) {
    const dailySales = await prisma.invoice.groupBy({
      by: ['invoiceDate'],
      where: {
        invoiceDate: { gte: startDate, lte: endDate },
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.PAID] }
      },
      _sum: { totalAmount: true },
      _count: { id: true },
      orderBy: { invoiceDate: 'asc' }
    })

    return dailySales.map(day => ({
      date: day.invoiceDate.toISOString().split('T')[0],
      revenue: day._sum.totalAmount || 0,
      orders: day._count.id,
      averageOrderValue: day._count.id > 0 ? (day._sum.totalAmount || 0) / day._count.id : 0
    }))
  }

  private async getMonthlySalesData(startDate: Date, endDate: Date) {
    // Group by year and month using JavaScript aggregation for SQLite compatibility
    const invoices = await prisma.invoice.findMany({
      where: {
        invoiceDate: { gte: startDate, lte: endDate },
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.PAID] }
      },
      select: {
        invoiceDate: true,
        totalAmount: true
      }
    })

    const monthlyMap = new Map<string, { revenue: number; orders: number }>()
    
    for (const invoice of invoices) {
      const key = `${invoice.invoiceDate.getFullYear()}-${invoice.invoiceDate.getMonth() + 1}`
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { revenue: 0, orders: 0 })
      }
      const monthData = monthlyMap.get(key)!
      monthData.revenue += invoice.totalAmount
      monthData.orders += 1
    }

    const monthlySales = Array.from(monthlyMap.entries()).map(([key, data]) => {
      const [year, month] = key.split('-').map(Number)
      return { year, month, revenue: data.revenue, orders: data.orders }
    }).sort((a, b) => a.year - b.year || a.month - b.month)

    const results = []
    for (let i = 0; i < monthlySales.length; i++) {
      const current = monthlySales[i]
      const previous = i > 0 ? monthlySales[i - 1] : null
      
      const growth = previous ? ((Number(current.revenue) - Number(previous.revenue)) / Number(previous.revenue)) * 100 : 0

      results.push({
        month: `${current.year}-${String(current.month).padStart(2, '0')}`,
        revenue: Number(current.revenue),
        orders: Number(current.orders),
        growth
      })
    }

    return results
  }

  private async getQuarterlySalesData(startDate: Date, endDate: Date) {
    // Group by year and quarter using JavaScript aggregation for SQLite compatibility
    const invoices = await prisma.invoice.findMany({
      where: {
        invoiceDate: { gte: startDate, lte: endDate },
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.PAID] }
      },
      select: {
        invoiceDate: true,
        totalAmount: true
      }
    })

    const quarterlyMap = new Map<string, { revenue: number; orders: number }>()
    
    for (const invoice of invoices) {
      const quarter = Math.floor((invoice.invoiceDate.getMonth()) / 3) + 1
      const key = `${invoice.invoiceDate.getFullYear()}-${quarter}`
      if (!quarterlyMap.has(key)) {
        quarterlyMap.set(key, { revenue: 0, orders: 0 })
      }
      const quarterData = quarterlyMap.get(key)!
      quarterData.revenue += invoice.totalAmount
      quarterData.orders += 1
    }

    const quarterlySales = Array.from(quarterlyMap.entries()).map(([key, data]) => {
      const [year, quarter] = key.split('-').map(Number)
      return { year, quarter, revenue: data.revenue, orders: data.orders }
    }).sort((a, b) => a.year - b.year || a.quarter - b.quarter)

    const results = []
    for (let i = 0; i < quarterlySales.length; i++) {
      const current = quarterlySales[i]
      const previous = i > 0 ? quarterlySales[i - 1] : null
      
      const growth = previous ? ((Number(current.revenue) - Number(previous.revenue)) / Number(previous.revenue)) * 100 : 0

      results.push({
        quarter: `${current.year}-Q${current.quarter}`,
        revenue: Number(current.revenue),
        orders: Number(current.orders),
        growth
      })
    }

    return results
  }

  private analyzeSalesTrend(dailySales: Array<{ revenue: number }>): 'increasing' | 'decreasing' | 'stable' {
    if (dailySales.length < 2) return 'stable'

    const firstHalf = dailySales.slice(0, Math.floor(dailySales.length / 2))
    const secondHalf = dailySales.slice(Math.floor(dailySales.length / 2))

    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.revenue, 0) / firstHalf.length
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.revenue, 0) / secondHalf.length

    const changePercent = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0

    if (changePercent > 5) return 'increasing'
    if (changePercent < -5) return 'decreasing'
    return 'stable'
  }

  private async getTopCustomers(startDate: Date, endDate: Date) {
    const customers = await prisma.customer.findMany({
      include: {
        invoices: {
          where: {
            invoiceDate: { gte: startDate, lte: endDate },
            status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.PAID] }
          }
        }
      }
    })

    return customers
      .map(customer => {
        const totalRevenue = customer.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
        const orderCount = customer.invoices.length
        const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0
        const lastOrderDate = customer.invoices.reduce((latest, inv) => 
          inv.invoiceDate > latest ? inv.invoiceDate : latest, 
          new Date(0)
        )

        let loyalty: 'new' | 'regular' | 'vip' = 'new'
        if (totalRevenue > 50000) loyalty = 'vip'
        else if (orderCount > 5) loyalty = 'regular'

        return {
          customerId: customer.id,
          customerName: customer.name,
          totalRevenue,
          orderCount,
          averageOrderValue,
          lastOrderDate,
          customerSince: customer.createdAt,
          loyalty
        }
      })
      .filter(customer => customer.totalRevenue > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 20)
  }

  private async getCustomerSegmentation(startDate: Date, endDate: Date) {
    const customers = await this.getTopCustomers(startDate, endDate)
    const totalCustomers = customers.length
    const _totalRevenue = customers.reduce((sum, c) => sum + c.totalRevenue, 0)

    const segments = [
      { segment: 'VIP', customers: customers.filter(c => c.loyalty === 'vip') },
      { segment: 'Regular', customers: customers.filter(c => c.loyalty === 'regular') },
      { segment: 'New', customers: customers.filter(c => c.loyalty === 'new') }
    ]

    return segments.map(segment => ({
      segment: segment.segment,
      customerCount: segment.customers.length,
      totalRevenue: segment.customers.reduce((sum, c) => sum + c.totalRevenue, 0),
      averageOrderValue: segment.customers.length > 0 
        ? segment.customers.reduce((sum, c) => sum + c.averageOrderValue, 0) / segment.customers.length
        : 0,
      percentage: totalCustomers > 0 ? (segment.customers.length / totalCustomers) * 100 : 0
    }))
  }

  private async getCustomerRetention(startDate: Date, endDate: Date) {
    const periodLength = endDate.getTime() - startDate.getTime()
    const previousPeriodStart = new Date(startDate.getTime() - periodLength)

    const [currentPeriodCustomers, previousPeriodCustomers, newCustomers] = await Promise.all([
      prisma.customer.findMany({
        where: {
          invoices: {
            some: {
              invoiceDate: { gte: startDate, lte: endDate }
            }
          }
        },
        select: { id: true }
      }),
      prisma.customer.findMany({
        where: {
          invoices: {
            some: {
              invoiceDate: { gte: previousPeriodStart, lt: startDate }
            }
          }
        },
        select: { id: true }
      }),
      prisma.customer.count({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        }
      })
    ])

    const currentCustomerIds = new Set(currentPeriodCustomers.map(c => c.id))
    const previousCustomerIds = new Set(previousPeriodCustomers.map(c => c.id))

    const returningCustomers = Array.from(currentCustomerIds).filter(id => previousCustomerIds.has(id)).length
    const churnedCustomers = Array.from(previousCustomerIds).filter(id => !currentCustomerIds.has(id)).length

    const retentionRate = previousCustomerIds.size > 0 ? (returningCustomers / previousCustomerIds.size) * 100 : 0

    return {
      newCustomers,
      returningCustomers,
      churnedCustomers,
      retentionRate
    }
  }

  private async getGeographicDistribution(_startDate: Date, _endDate: Date) {
    // This would require customer address data
    // For now, return placeholder
    return []
  }

  private async getTopSellingProducts(_startDate: Date, _endDate: Date) {
    // This would require invoice line items
    // For now, return placeholder
    return []
  }

  private async getCategoryPerformance(_startDate: Date, _endDate: Date) {
    // This would require invoice line items and product categories
    // For now, return placeholder
    return []
  }

  private async getProductTrends(_startDate: Date, _endDate: Date) {
    // This would require historical sales data analysis
    // For now, return placeholder
    return []
  }

  private async getSlowMovingProducts(_startDate: Date, _endDate: Date) {
    // This would require analysis of products with no recent sales
    // For now, return placeholder
    return []
  }

  private forecastNextPeriod(historicalData: Array<{ revenue: number }>, periods: number) {
    // Simple moving average forecast
    const recentData = historicalData.slice(-6) // Last 6 months
    const averageRevenue = recentData.reduce((sum, data) => sum + data.revenue, 0) / recentData.length

    return {
      predictedRevenue: averageRevenue * periods,
      confidence: 70, // Placeholder confidence level
      factors: ['Historical trends', 'Market conditions', 'Seasonal patterns']
    }
  }

  private async getSeasonalTrends() {
    // Get historical monthly averages using JavaScript aggregation
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.PAID] }
      },
      select: {
        invoiceDate: true,
        totalAmount: true
      }
    })

    const monthlyData = new Map<number, number[]>()
    
    for (const invoice of invoices) {
      const month = invoice.invoiceDate.getMonth() + 1
      if (!monthlyData.has(month)) {
        monthlyData.set(month, [])
      }
      monthlyData.get(month)!.push(invoice.totalAmount)
    }

    const monthlyAvg = Array.from(monthlyData.entries()).map(([month, amounts]) => {
      const avg = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length
      const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avg, 2), 0) / amounts.length
      const stddev = Math.sqrt(variance)
      
      return { month, revenue: avg, volatility: stddev }
    }).sort((a, b) => a.month - b.month)

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]

    return monthlyAvg.map(data => ({
      month: monthNames[Number(data.month) - 1],
      averageRevenue: Number(data.revenue),
      volatility: Number(data.volatility)
    }))
  }

  private generateRecommendations(
    historicalData: Array<{ revenue: number }>,
    seasonalTrends: Array<{ month: string; averageRevenue: number }>
  ): string[] {
    const recommendations = []

    // Analyze trend
    const recentTrend = this.analyzeSalesTrend(historicalData)
    if (recentTrend === 'decreasing') {
      recommendations.push('Sales trend is declining. Consider marketing campaigns or promotional activities.')
    } else if (recentTrend === 'increasing') {
      recommendations.push('Sales trend is positive. Maintain current strategies and consider scaling.')
    }

    // Seasonal recommendations
    const highestMonth = seasonalTrends.reduce((max, current) => 
      current.averageRevenue > max.averageRevenue ? current : max, 
      seasonalTrends[0]
    )
    
    if (highestMonth) {
      recommendations.push(`${highestMonth.month} typically shows highest sales. Plan inventory and marketing accordingly.`)
    }

    return recommendations
  }

  private async getLeadToQuotationConversion(startDate: Date, endDate: Date) {
    const [leadsGenerated, quotationsCreated] = await Promise.all([
      prisma.lead.count({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        }
      }),
      prisma.quotation.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { not: QuotationStatus.DRAFT }
        }
      })
    ])

    return {
      leadsGenerated,
      quotationsCreated,
      conversionRate: leadsGenerated > 0 ? (quotationsCreated / leadsGenerated) * 100 : 0
    }
  }

  private async getQuotationToOrderConversion(startDate: Date, endDate: Date) {
    const [quotationsSent, ordersReceived] = await Promise.all([
      prisma.quotation.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: QuotationStatus.SENT
        }
      }),
      prisma.salesOrder.count({
        where: {
          orderDate: { gte: startDate, lte: endDate },
          status: { not: OrderStatus.CANCELLED }
        }
      })
    ])

    return {
      quotationsSent,
      ordersReceived,
      conversionRate: quotationsSent > 0 ? (ordersReceived / quotationsSent) * 100 : 0
    }
  }

  private async getOrderToInvoiceConversion(startDate: Date, endDate: Date) {
    const [ordersApproved, invoicesGenerated] = await Promise.all([
      prisma.salesOrder.count({
        where: {
          orderDate: { gte: startDate, lte: endDate },
          status: OrderStatus.APPROVED
        }
      }),
      prisma.invoice.count({
        where: {
          invoiceDate: { gte: startDate, lte: endDate },
          status: { not: InvoiceStatus.CANCELLED }
        }
      })
    ])

    return {
      ordersApproved,
      invoicesGenerated,
      conversionRate: ordersApproved > 0 ? (invoicesGenerated / ordersApproved) * 100 : 0
    }
  }

  private async getInvoiceToPaidConversion(startDate: Date, endDate: Date) {
    const [invoicesSent, invoicesPaid, avgCollectionDays] = await Promise.all([
      prisma.invoice.count({
        where: {
          invoiceDate: { gte: startDate, lte: endDate },
          status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.PAID] }
        }
      }),
      prisma.invoice.count({
        where: {
          invoiceDate: { gte: startDate, lte: endDate },
          status: InvoiceStatus.PAID
        }
      }),
      this.getAverageCollectionDays(startDate, endDate)
    ])

    return {
      invoicesSent,
      invoicesPaid,
      conversionRate: invoicesSent > 0 ? (invoicesPaid / invoicesSent) * 100 : 0,
      averageCollectionDays: avgCollectionDays
    }
  }

  private async getAverageCollectionDays(startDate: Date, endDate: Date): Promise<number> {
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        invoiceDate: { gte: startDate, lte: endDate },
        status: InvoiceStatus.PAID,
        paidAt: { not: null }
      },
      select: {
        invoiceDate: true,
        paidAt: true
      }
    })

    if (paidInvoices.length === 0) return 0

    const totalDays = paidInvoices.reduce((sum, invoice) => {
      const days = Math.floor((invoice.paidAt!.getTime() - invoice.invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
      return sum + days
    }, 0)

    return totalDays / paidInvoices.length
  }
}