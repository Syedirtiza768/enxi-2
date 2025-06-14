import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { ThreeWayMatchingService } from '@/lib/services/purchase/three-way-matching.service'

// POST /api/three-way-matching/[id]/approve - Approve matching exception
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { approvalReason, overrideDiscrepancies } = body

    if (!approvalReason || !approvalReason.trim()) {
      return NextResponse.json(
        { error: 'Approval reason is required' },
        { status: 400 }
      )
    }

    const threeWayMatchingService = new ThreeWayMatchingService()
    const result = await threeWayMatchingService.approveMatching(resolvedParams.id, {
      approvedBy: user.id,
      approvalReason: approvalReason.trim(),
      overrideDiscrepancies: overrideDiscrepancies || false
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error approving matching exception:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to approve matching exception' },
      { status: 500 }
    )
  }
}