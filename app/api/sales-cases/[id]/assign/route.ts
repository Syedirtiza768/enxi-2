import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { SalesCaseService } from '@/lib/services/sales-case.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/sales-cases/[id]/assign - Assign sales case to user
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(request)
    const { id } = await params
    const body = await request.json()
    
    const { assignedTo } = body

    if (!assignedTo) {
      return NextResponse.json(
        { error: 'Assigned user ID is required' },
        { status: 400 }
      )
    }

    const salesCaseService = new SalesCaseService()
    const salesCase = await salesCaseService.assignSalesCase(
      id,
      assignedTo,
      user.id
    )

    return NextResponse.json({
      success: true,
      data: salesCase,
      message: 'Sales case assigned successfully'
    })
  } catch (error: unknown) {
    console.error('Error assigning sales case:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to assign sales case' },
      { status: 500 }
    )
  }
}