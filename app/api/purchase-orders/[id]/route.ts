import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { PurchaseOrderService } from '@/lib/services/purchase/purchase-order.service'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/purchase-orders/[id] - Get purchase order by ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const purchaseOrderService = new PurchaseOrderService()
    const purchaseOrder = await purchaseOrderService.getPurchaseOrder(params.id)

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: purchaseOrder })
  } catch (error) {
    console.error('Error fetching purchase order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase order' },
      { status: 500 }
    )
  }
}

// PUT /api/purchase-orders/[id] - Update purchase order
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      expectedDate,
      requestedBy,
      paymentTerms,
      deliveryTerms,
      shippingAddress,
      billingAddress,
      notes,
      internalNotes,
      currency,
      exchangeRate
    } = body

    const purchaseOrderService = new PurchaseOrderService()
    const purchaseOrder = await purchaseOrderService.updatePurchaseOrder(
      params.id,
      {
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        requestedBy,
        paymentTerms,
        deliveryTerms,
        shippingAddress,
        billingAddress,
        notes,
        internalNotes,
        currency,
        exchangeRate
      },
      user.id
    )

    return NextResponse.json({ data: purchaseOrder })
  } catch (error: any) {
    console.error('Error updating purchase order:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    if (error.message?.includes('Can only update draft')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update purchase order' },
      { status: 500 }
    )
  }
}