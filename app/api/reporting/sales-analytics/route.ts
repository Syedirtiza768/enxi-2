import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { SalesAnalyticsService } from '@/lib/services/reporting/sales-analytics.service'

// GET /api/reporting/sales-analytics
export async function GET(request: NextRequest) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const includePerformance = searchParams.get('includePerformance') === 'true'
    const includeCustomers = searchParams.get('includeCustomers') === 'true'
    const includeProducts = searchParams.get('includeProducts') === 'true'
    const includeForecast = searchParams.get('includeForecast') === 'true'
    const includeConversion = searchParams.get('includeConversion') === 'true'
    const targetRevenueParam = searchParams.get('targetRevenue')

    // Default to current month if no dates provided
    const endDate = endDateParam ? new Date(endDateParam) : new Date()
    const startDate = startDateParam ? new Date(startDateParam) : new Date(endDate.getFullYear(), endDate.getMonth(), 1)
    const targetRevenue = targetRevenueParam ? parseFloat(targetRevenueParam) : undefined

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    if (targetRevenue !== undefined && isNaN(targetRevenue)) {
      return NextResponse.json(
        { error: 'Invalid target revenue format' },
        { status: 400 }
      )
    }

    const salesService = new SalesAnalyticsService()

    // Get analytics data in parallel
    const [
      metrics,
      performance,
      customers,
      products,
      forecast,
      conversion
    ] = await Promise.all([
      salesService.getSalesMetrics(startDate, endDate, targetRevenue),
      includePerformance ? salesService.getSalesPerformance(startDate, endDate) : null,
      includeCustomers ? salesService.getCustomerAnalytics(startDate, endDate) : null,
      includeProducts ? salesService.getProductAnalytics(startDate, endDate) : null,
      includeForecast ? salesService.getSalesForecast() : null,
      includeConversion ? salesService.getSalesConversion(startDate, endDate) : null
    ])

    const response = {
      metrics,
      ...(performance && { performance }),
      ...(customers && { customers }),
      ...(products && { products }),
      ...(forecast && { forecast }),
      ...(conversion && { conversion }),
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      ...(targetRevenue && { targetRevenue })
    }

    return NextResponse.json({ data: response })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}