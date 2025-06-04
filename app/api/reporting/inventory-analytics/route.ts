import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { InventoryAnalyticsService } from '@/lib/services/reporting/inventory-analytics.service'

// GET /api/reporting/inventory-analytics
export async function GET(request: NextRequest) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const includeMovements = searchParams.get('includeMovements') === 'true'
    const includeValuation = searchParams.get('includeValuation') === 'true'
    const includeLowStock = searchParams.get('includeLowStock') === 'true'
    const includeABC = searchParams.get('includeABC') === 'true'

    // Default to last 30 days if no dates provided
    const endDate = endDateParam ? new Date(endDateParam) : new Date()
    const startDate = startDateParam ? new Date(startDateParam) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    const inventoryService = new InventoryAnalyticsService()

    // Get analytics data in parallel
    const [
      metrics,
      movements,
      valuation,
      lowStock,
      abcAnalysis
    ] = await Promise.all([
      inventoryService.getInventoryMetrics(),
      includeMovements ? inventoryService.getStockMovementAnalytics(startDate, endDate) : null,
      includeValuation ? inventoryService.getInventoryValuation() : null,
      includeLowStock ? inventoryService.getLowStockAnalysis() : null,
      includeABC ? inventoryService.getABCAnalysis() : null
    ])

    const response = {
      metrics,
      ...(movements && { movements }),
      ...(valuation && { valuation }),
      ...(lowStock && { lowStock }),
      ...(abcAnalysis && { abcAnalysis }),
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    }

    return NextResponse.json({ data: response })
  } catch (error) {
    console.error('Error fetching inventory analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory analytics' },
      { status: 500 }
    )
  }
}