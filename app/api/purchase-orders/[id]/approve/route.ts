import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { PurchaseOrderService } from '@/lib/services/purchase/purchase-order.service'

interface RouteParams {
  params: {
    id: string
  }
}

// POST /api/purchase-orders/[id]/approve - Approve purchase order
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const purchaseOrderService = new PurchaseOrderService()
    const purchaseOrder = await purchaseOrderService.approvePurchaseOrder(
      params.id,
      user.id
    )

    return NextResponse.json({ data: purchaseOrder })
  } catch (error: any) {
    console.error('Error approving purchase order:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    if (error.message?.includes('Can only approve')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to approve purchase order' },
      { status: 500 }
    )
  }
}