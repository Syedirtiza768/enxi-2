import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { PurchaseOrderService } from '@/lib/services/purchase/purchase-order.service'



// POST /api/purchase-orders/[id]/approve - Approve purchase order
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const purchaseOrderService = new PurchaseOrderService()
    const purchaseOrder = await purchaseOrderService.approvePurchaseOrder(
      resolvedParams.id,
      session.user.id
    )

    return NextResponse.json({ data: purchaseOrder })
  } catch (error: unknown) {
    console.error('Error approving purchase order:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('Can only approve')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to approve purchase order' },
      { status: 500 }
    )
  }
}