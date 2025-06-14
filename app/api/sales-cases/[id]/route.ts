import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { SalesCaseService } from '@/lib/services/sales-case.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/sales-cases/[id] - Get specific sales case
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(request)
    const { id } = await params
    const salesCaseService = new SalesCaseService()
    const salesCase = await salesCaseService.getSalesCase(id)

    if (!salesCase) {
      return NextResponse.json(
        { error: 'Sales case not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: salesCase
    })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/sales-cases/[id] - Update sales case
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(request)
    const { id } = await params
    const body = await request.json()
    
    const salesCaseService = new SalesCaseService()
    const salesCase = await salesCaseService.updateSalesCase(
      id,
      body,
      user.id
    )

    return NextResponse.json({
      success: true,
      data: salesCase
    })
  } catch (error: unknown) {
    console.error('Error updating sales case:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update sales case' },
      { status: 500 }
    )
  }
}