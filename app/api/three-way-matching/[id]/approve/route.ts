import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { ThreeWayMatchingService } from '@/lib/services/purchase/three-way-matching.service'

// POST /api/three-way-matching/[id]/approve - Approve matching exception
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    const result = await threeWayMatchingService.approveMatching(params.id, {
      approvedBy: user.id,
      approvalReason: approvalReason.trim(),
      overrideDiscrepancies: overrideDiscrepancies || false
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error approving matching exception:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to approve matching exception' },
      { status: 500 }
    )
  }
}