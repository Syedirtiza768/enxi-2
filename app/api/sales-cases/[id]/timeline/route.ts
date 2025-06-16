import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { SalesCaseService } from '@/lib/services/sales-case.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/sales-cases/[id]/timeline - Get sales case timeline
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const { id } = await params
    const salesCaseService = new SalesCaseService()
    
    const timeline = await salesCaseService.getSalesCaseTimeline(id)

    return NextResponse.json({
      success: true,
      data: timeline
    })
  } catch (error: unknown) {
    console.error('Error fetching sales case timeline:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch sales case timeline' },
      { status: 500 }
    )
  }
}