import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { SalesCaseService } from '@/lib/services/sales-case.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/sales-cases/[id]/timeline - Get sales case timeline
export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const user = await getUserFromRequest(request)
    const params = await context.params
    const salesCaseService = new SalesCaseService()
    
    const timeline = await salesCaseService.getSalesCaseTimeline(params.id)

    return NextResponse.json({
      success: true,
      data: timeline
    })
  } catch (error: any) {
    console.error('Error fetching sales case timeline:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch sales case timeline' },
      { status: 500 }
    )
  }
}