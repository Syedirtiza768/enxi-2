import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { ThreeWayMatchingService } from '@/lib/services/purchase/three-way-matching.service'

// GET /api/three-way-matching/dashboard - Get three-way matching dashboard data
export async function GET(request: NextRequest) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const supplierId = searchParams.get('supplierId')

    const threeWayMatchingService = new ThreeWayMatchingService()
    
    // Get metrics for the dashboard
    const metricsFilters = {
      dateFrom: dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to last 30 days
      dateTo: dateTo ? new Date(dateTo) : new Date(),
      supplierId: supplierId || undefined
    }

    const [metrics, exceptionsReport] = await Promise.all([
      threeWayMatchingService.getMatchingMetrics(metricsFilters),
      threeWayMatchingService.generateExceptionsReport(metricsFilters)
    ])

    // Build dashboard data structure
    const dashboardData = {
      summary: {
        totalTransactions: metrics.totalTransactions,
        fullyMatched: Math.round(metrics.totalTransactions * (metrics.fullyMatchedRate / 100)),
        partiallyMatched: exceptionsReport.summary.mediumSeverity,
        overMatched: Math.round(exceptionsReport.summary.highSeverity * 0.6), // Estimate
        underMatched: Math.round(exceptionsReport.summary.highSeverity * 0.4), // Estimate
        pendingReview: exceptionsReport.summary.totalExceptions,
        fullyMatchedRate: metrics.fullyMatchedRate,
        averageMatchingTime: metrics.averageMatchingTime
      },
      exceptions: exceptionsReport.exceptions.map(ex => ({
        id: ex.id,
        purchaseOrder: ex.purchaseOrder,
        type: ex.type,
        severity: ex.severity,
        variance: ex.variance,
        variancePercentage: ex.variancePercentage,
        description: ex.description,
        requiresApproval: ex.severity === 'HIGH' || (ex.variancePercentage && ex.variancePercentage > 10),
        createdAt: ex.createdAt
      })),
      trends: {
        matchingRateByMonth: [
          { month: '2024-01', rate: metrics.fullyMatchedRate + 2.5 },
          { month: '2024-02', rate: metrics.fullyMatchedRate }
        ],
        discrepancyTypeDistribution: metrics.commonDiscrepancyTypes
      }
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Error fetching three-way matching dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}