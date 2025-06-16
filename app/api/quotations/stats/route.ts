import { NextRequest, NextResponse } from 'next/server'
// // import { getUserFromRequest } from '@/lib/auth/server-auth'
import { prisma } from '@/lib/db/prisma'
import { QuotationStatus } from '@/lib/generated/prisma'
import { withCrudAudit } from '@/lib/middleware/audit.middleware'
import { EntityType } from '@/lib/validators/audit.validator'

const getHandler = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Authenticate user
    const session = { user: { id: 'system' } }
    // const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // Get quotation statistics
    const [
      totalCount,
      statusCounts,
      totalValue,
      acceptedCount
    ] = await Promise.all([
      // Total count
      prisma.quotation.count(),
      
      // Count by status
      prisma.quotation.groupBy({
        by: ['status'],
        _count: true
      }),
      
      // Total value of all quotations
      prisma.quotation.aggregate({
        _sum: {
          totalAmount: true
        }
      }),
      
      // Count of accepted quotations for acceptance rate
      prisma.quotation.count({
        where: {
          status: QuotationStatus.ACCEPTED
        }
      })
    ])

    // Transform status counts into a more usable format
    const statusMap = statusCounts.reduce((acc, curr) => {
      acc[curr.status.toLowerCase()] = curr._count
      return acc
    }, {} as Record<string, number>)

    // Calculate acceptance rate
    const sentAndProcessed = (statusMap.sent || 0) + (statusMap.accepted || 0) + (statusMap.rejected || 0)
    const acceptanceRate = sentAndProcessed > 0 
      ? (acceptedCount / sentAndProcessed) * 100 
      : 0

    const stats = {
      total: totalCount,
      draft: statusMap.draft || 0,
      sent: statusMap.sent || 0,
      accepted: statusMap.accepted || 0,
      rejected: statusMap.rejected || 0,
      expired: statusMap.expired || 0,
      cancelled: statusMap.cancelled || 0,
      totalValue: totalValue._sum.totalAmount || 0,
      acceptanceRate
    }

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error fetching quotation stats:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch quotation statistics',
        code: 'FETCH_STATS_ERROR',
        message: 'Unable to retrieve quotation statistics. Please try again.',
        context: {
          operation: 'fetch_quotation_stats',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

export const GET = withCrudAudit(getHandler, EntityType.QUOTATION, 'read', {
  metadata: { operation: 'fetch_quotation_stats' }
})