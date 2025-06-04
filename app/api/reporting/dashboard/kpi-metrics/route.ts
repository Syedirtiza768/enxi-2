import { NextRequest, NextResponse } from 'next/server'
import { FinancialDashboardService } from '@/lib/services/reporting/financial-dashboard.service'
import { z } from 'zod'

const kpiMetricsSchema = z.object({
  asOfDate: z.string().datetime().optional()
})

export async function GET(request: NextRequest) {
  try {
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const { searchParams } = new URL(request.url)
    const asOfDateParam = searchParams.get('asOfDate')
    
    const data = kpiMetricsSchema.parse({
      asOfDate: asOfDateParam
    })
    
    const dashboardService = new FinancialDashboardService()
    const asOfDate = data.asOfDate ? new Date(data.asOfDate) : new Date()
    
    const metrics = await dashboardService.getKPIMetrics(asOfDate)
    
    return NextResponse.json(metrics)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error getting KPI metrics:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to get KPI metrics' },
      { status: 500 }
    )
  }
}