import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { ThreeWayMatchingService } from '@/lib/services/purchase/three-way-matching.service'

// POST /api/three-way-matching/[id]/reject - Reject matching exception
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await _request.json()
    const { rejectionReason, requiredActions } = body

    if (!rejectionReason || !rejectionReason.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    const threeWayMatchingService = new ThreeWayMatchingService()
    const result = await threeWayMatchingService.rejectMatching(params.id, {
      rejectedBy: _user.id,
      rejectionReason: rejectionReason.trim(),
      requiredActions: requiredActions || ['Review with supplier', 'Verify documentation']
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error rejecting matching exception:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to reject matching exception' },
      { status: 500 }
    )
  }
}