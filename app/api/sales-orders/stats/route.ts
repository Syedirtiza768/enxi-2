import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { prisma } from '@/lib/db/prisma'
import { OrderStatus } from '@/lib/constants/order-status'
import { withCrudAudit } from '@/lib/middleware/audit.middleware'
import { EntityType } from '@/lib/validators/audit.validator'

const getHandler = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get sales order statistics
    const [
      totalCount,
      statusCounts,
      totalValue,
      shippedCount,
      monthlyOrders
    ] = await Promise.all([
      // Total count
      prisma.salesOrder.count(),
      
      // Count by status
      prisma.salesOrder.groupBy({
        by: ['status'],
        _count: true
      }),
      
      // Total value of all sales orders
      prisma.salesOrder.aggregate({
        _sum: {
          totalAmount: true,
          fulfilledAmount: true,
          shippedAmount: true,
          invoicedAmount: true
        }
      }),
      
      // Count of shipped orders for fulfillment rate
      prisma.salesOrder.count({
        where: {
          status: {
            in: [OrderStatus.SHIPPED, OrderStatus.DELIVERED]
          }
        }
      }),

      // Monthly order count for last 6 months
      prisma.salesOrder.groupBy({
        by: ['orderDate'],
        _count: true,
        where: {
          orderDate: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
          }
        }
      })
    ])

    // Transform status counts into a more usable format
    const statusMap = statusCounts.reduce((acc, curr) => {
      acc[curr.status.toLowerCase()] = curr._count
      return acc
    }, {} as Record<string, number>)

    // Calculate fulfillment rate
    const processedOrders = totalCount - (statusMap.pending || 0) - (statusMap.cancelled || 0)
    const fulfillmentRate = processedOrders > 0 
      ? (shippedCount / processedOrders) * 100 
      : 0

    const stats = {
      total: totalCount,
      pending: statusMap.pending || 0,
      approved: statusMap.approved || 0,
      processing: statusMap.processing || 0,
      shipped: statusMap.shipped || 0,
      delivered: statusMap.delivered || 0,
      cancelled: statusMap.cancelled || 0,
      totalValue: totalValue._sum.totalAmount || 0,
      fulfilledValue: totalValue._sum.fulfilledAmount || 0,
      shippedValue: totalValue._sum.shippedAmount || 0,
      invoicedValue: totalValue._sum.invoicedAmount || 0,
      fulfillmentRate,
      monthlyTrend: monthlyOrders.length
    }

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error fetching sales order stats:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch sales order statistics',
        code: 'FETCH_STATS_ERROR',
        message: 'Unable to retrieve sales order statistics. Please try again.',
        context: {
          operation: 'fetch_sales_order_stats',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

export const GET = withCrudAudit(getHandler, EntityType.SALES_ORDER, 'read', {
  metadata: { operation: 'fetch_sales_order_stats' }
})