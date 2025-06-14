import { NextRequest, NextResponse } from 'next/server'
import { FinancialDashboardService } from '@/lib/services/reporting/financial-dashboard.service'
import { z } from 'zod'

const salesAnalyticsSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime()
})

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    
    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: 'startDate and endDate parameters are required' },
        { status: 400 }
      )
    }
    
    const data = salesAnalyticsSchema.parse({
      startDate: startDateParam,
      endDate: endDateParam
    })
    
    const dashboardService = new FinancialDashboardService()
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)
    
    const analytics = await dashboardService.getSalesAnalytics(startDate, endDate)
    
    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error getting sales analytics:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get sales analytics' },
      { status: 500 }
    )
  }
}