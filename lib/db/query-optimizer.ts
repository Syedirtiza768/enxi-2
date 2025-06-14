import { PrismaClient } from '@prisma/client'
import { QueryPerformanceMonitor, ResponseCache } from '@/lib/utils/performance'

// Enhanced Prisma client with performance monitoring and caching
export class OptimizedPrismaClient extends PrismaClient {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    })
    
    // Add query performance monitoring
    this.$use(async (params, next) => {
      const start = Date.now()
      const result = await next(params)
      const end = Date.now()
      
      const queryName = `${params.model}.${params.action}`
      QueryPerformanceMonitor.trackQuery(queryName, end - start)
      
      return result
    })
  }

  // Cached query wrapper
  async cachedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttlMs = 5 * 60 * 1000 // 5 minutes default
  ): Promise<T> {
    // Check cache first
    const cached = ResponseCache.get(cacheKey)
    if (cached) {
      return cached
    }

    // Execute query
    const result = await queryFn()
    
    // Cache the result
    ResponseCache.set(cacheKey, result, ttlMs)
    
    return result
  }

  // Optimized pagination
  async paginatedQuery<T>(
    model: any,
    page: number = 1,
    pageSize: number = 20,
    options: {
      where?: any
      orderBy?: any
      include?: any
      select?: any
    } = {}
  ): Promise<{
    data: T[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }> {
    const skip = (page - 1) * pageSize
    
    const cacheKey = `paginated:${model.name}:${JSON.stringify({ page, pageSize, ...options })}`
    
    return this.cachedQuery(cacheKey, async () => {
      const [data, total] = await Promise.all([
        model.findMany({
          ...options,
          skip,
          take: pageSize,
        }),
        model.count({ where: options.where })
      ])

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    }, 2 * 60 * 1000) // 2 minutes cache for paginated results
  }

  // Bulk operations optimization
  async bulkCreate<T>(
    model: any,
    data: any[],
    batchSize: number = 100
  ): Promise<T[]> {
    const results: T[] = []
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)
      const batchResult = await model.createMany({
        data: batch,
        skipDuplicates: true
      })
      results.push(...batchResult)
    }
    
    return results
  }

  // Optimized search with full-text search support
  async searchItems(
    searchTerm: string,
    options: {
      page?: number
      pageSize?: number
      filters?: any
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
    } = {}
  ) {
    const {
      page = 1,
      pageSize = 20,
      filters = {},
      sortBy = 'name',
      sortOrder = 'asc'
    } = options

    const cacheKey = `search:items:${JSON.stringify({ searchTerm, ...options })}`
    
    return this.cachedQuery(cacheKey, async () => {
      const whereClause = {
        AND: [
          filters,
          searchTerm ? {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { code: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } },
            ]
          } : {}
        ]
      }

      return this.paginatedQuery(
        this.item,
        page,
        pageSize,
        {
          where: whereClause,
          orderBy: { [sortBy]: sortOrder },
          include: {
            category: true,
            unitOfMeasure: true,
            stockSummary: true
          }
        }
      )
    }, 1 * 60 * 1000) // 1 minute cache for search results
  }

  // Get dashboard metrics with caching
  async getDashboardMetrics(): Promise<T | null> {
    return this.cachedQuery('dashboard:metrics', async () => {
      const [
        totalCustomers,
        totalSuppliers,
        totalItems,
        totalSalesOrders,
        totalPurchaseOrders,
        lowStockItems,
        pendingQuotations,
        overdueInvoices
      ] = await Promise.all([
        this.customer.count({ where: { isActive: true } }),
        this.supplier.count({ where: { isActive: true } }),
        this.item.count({ where: { isActive: true } }),
        this.salesOrder.count({ where: { status: { not: 'CANCELLED' } } }),
        this.purchaseOrder.count({ where: { status: { not: 'CANCELLED' } } }),
        this.item.count({
          where: {
            trackInventory: true,
            stockSummary: {
              availableQuantity: { lte: this.item.fields.reorderPoint }
            }
          }
        }),
        this.quotation.count({ where: { status: 'PENDING' } }),
        this.invoice.count({
          where: {
            status: 'SENT',
            dueDate: { lt: new Date() }
          }
        })
      ])

      return {
        totalCustomers,
        totalSuppliers,
        totalItems,
        totalSalesOrders,
        totalPurchaseOrders,
        lowStockItems,
        pendingQuotations,
        overdueInvoices
      }
    }, 5 * 60 * 1000) // 5 minutes cache for dashboard
  }

  // Get recent activity with caching
  async getRecentActivity(limit: number = 10) {
    return this.cachedQuery(`recent:activity:${limit}`, async () => {
      const [
        recentSalesOrders,
        recentQuotations,
        recentInvoices,
        recentPurchaseOrders
      ] = await Promise.all([
        this.salesOrder.findMany({
          take: Math.ceil(limit / 4),
          orderBy: { createdAt: 'desc' },
          include: { customer: true },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            customer: { select: { name: true } }
          }
        }),
        this.quotation.findMany({
          take: Math.ceil(limit / 4),
          orderBy: { createdAt: 'desc' },
          include: { customer: true },
          select: {
            id: true,
            quotationNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            customer: { select: { name: true } }
          }
        }),
        this.invoice.findMany({
          take: Math.ceil(limit / 4),
          orderBy: { createdAt: 'desc' },
          include: { customer: true },
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            customer: { select: { name: true } }
          }
        }),
        this.purchaseOrder.findMany({
          take: Math.ceil(limit / 4),
          orderBy: { createdAt: 'desc' },
          include: { supplier: true },
          select: {
            id: true,
            poNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            supplier: { select: { name: true } }
          }
        })
      ])

      // Combine and sort all activities
      const allActivities = [
        ...recentSalesOrders.map(so => ({
          ...so,
          type: 'sales_order' as const,
          entityName: so.customer.name,
          number: so.orderNumber
        })),
        ...recentQuotations.map(q => ({
          ...q,
          type: 'quotation' as const,
          entityName: q.customer.name,
          number: q.quotationNumber
        })),
        ...recentInvoices.map(i => ({
          ...i,
          type: 'invoice' as const,
          entityName: i.customer.name,
          number: i.invoiceNumber
        })),
        ...recentPurchaseOrders.map(po => ({
          ...po,
          type: 'purchase_order' as const,
          entityName: po.supplier.name,
          number: po.poNumber
        }))
      ]

      return allActivities
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit)
    }, 2 * 60 * 1000) // 2 minutes cache for recent activity
  }

  // Clear specific cache keys
  clearCache(pattern?: string) {
    if (pattern) {
      const keys = Array.from(this.cache.keys()).filter(key => key.includes(pattern))
      keys.forEach(key => this.cache.delete(key))
    } else {
      this.cache.clear()
    }
    
    ResponseCache.clear()
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      responseCacheSize: ResponseCache.size()
    }
  }
}

// Singleton instance
let optimizedPrisma: OptimizedPrismaClient

if (process.env.NODE_ENV === 'production') {
  optimizedPrisma = new OptimizedPrismaClient()
} else {
  if (!(global as any).optimizedPrisma) {
    (global as any).optimizedPrisma = new OptimizedPrismaClient()
  }
  optimizedPrisma = (global as any).optimizedPrisma
}

export { optimizedPrisma }

// Query optimization helpers
export const queryOptimizations = {
  // Batch database calls
  batchCalls: async <T>(calls: (() => Promise<T>)[]): Promise<T[]> => {
    return Promise.all(calls.map(call => call()))
  },

  // Optimize includes based on usage
  optimizeIncludes: (baseInclude: any, requiredFields: string[] = []) => {
    return requiredFields.reduce((include, field) => {
      if (field.includes('.')) {
        const [relation, subField] = field.split('.')
        if (!include[relation]) include[relation] = {}
        if (subField === '*') {
          include[relation] = true
        } else {
          if (!include[relation].select) include[relation].select = {}
          include[relation].select[subField] = true
        }
      } else {
        include[field] = true
      }
      return include
    }, { ...baseInclude })
  },

  // Generate efficient where clauses
  buildWhereClause: (filters: Record<string, any>) => {
    const where: any = {}
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      
      if (Array.isArray(value)) {
        where[key] = { in: value }
      } else if (typeof value === 'string' && value.includes('%')) {
        where[key] = { contains: value.replace(/%/g, ''), mode: 'insensitive' }
      } else if (typeof value === 'object' && value.from && value.to) {
        where[key] = { gte: value.from, lte: value.to }
      } else {
        where[key] = value
      }
    })
    
    return where
  }
}