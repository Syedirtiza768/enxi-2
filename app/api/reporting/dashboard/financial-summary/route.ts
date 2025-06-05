import { NextRequest, NextResponse } from 'next/server'
import { FinancialDashboardService } from '@/lib/services/reporting/financial-dashboard.service'
import { z } from 'zod'

const financialSummarySchema = z.object({
  asOfDate: z.string().datetime().optional()
})

export async function GET(_request: NextRequest) {
  try {
    // TODO: Add proper authentication
    const _userId = 'system' // Replace with actual user authentication
    
    const { searchParams } = new URL(_request.url)
    const asOfDateParam = searchParams.get('asOfDate')
    
    const data = financialSummarySchema.parse({
      asOfDate: asOfDateParam
    })
    
    const dashboardService = new FinancialDashboardService()
    const asOfDate = data.asOfDate ? new Date(data.asOfDate) : new Date()
    
    const summary = await dashboardService.getFinancialSummary(asOfDate)
    
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error getting financial summary:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to get financial summary' },
      { status: 500 }
    )
  }
}