import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { PurchaseOrderService } from '@/lib/services/purchase/purchase-order.service'

interface RouteParams {
  params: {
    id: string
  }
}

// POST /api/purchase-orders/[id]/send - Send purchase order to supplier
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
    const purchaseOrder = await purchaseOrderService.sendToSupplier(
      params.id,
      user.id
    )

    return NextResponse.json({ data: purchaseOrder })
  } catch (error: any) {
    console.error('Error sending purchase order:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    if (error.message?.includes('Can only send approved')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to send purchase order' },
      { status: 500 }
    )
  }
}