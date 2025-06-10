import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { SalesCaseStatus } from '@/lib/generated/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/sales-cases/[id]/close - Close a sales case
export async function POST(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const _user = await getUserFromRequest(request)
    const params = await context.params
    const body = await request.json()
    
    const { status, actualValue, cost } = body

    // Validate required fields
    if (!status || (status !== SalesCaseStatus.WON && status !== SalesCaseStatus.LOST)) {
      return NextResponse.json(
        { error: 'Valid status (WON or LOST) is required' },
        { status: 400 }
      )
    }

    if (typeof actualValue !== 'number' || actualValue < 0) {
      return NextResponse.json(
        { error: 'Valid actual value is required' },
        { status: 400 }
      )
    }

    if (typeof cost !== 'number' || cost < 0) {
      return NextResponse.json(
        { error: 'Valid cost is required' },
        { status: 400 }
      )
    }

    const salesCaseService = new SalesCaseService()
    const salesCase = await salesCaseService.closeSalesCase(
      params.id,
      status,
      actualValue,
      cost,
      _user.id
    )

    return NextResponse.json({
      success: true,
      data: salesCase,
      message: `Sales case closed as ${status}`
    })
  } catch (error: unknown) {
    console.error('Error closing sales case:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }

    if (error instanceof Error ? error.message : String(error)?.includes('already closed')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to close sales case' },
      { status: 500 }
    )
  }
}