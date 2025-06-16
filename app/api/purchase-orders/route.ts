import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { PurchaseOrderService } from '@/lib/services/purchase/purchase-order.service'
import { POStatus } from '@/lib/generated/prisma'

// GET /api/purchase-orders - Get all purchase orders
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const supplierId = searchParams.get('supplierId')
    const status = searchParams.get('status') as POStatus | null
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const purchaseOrderService = new PurchaseOrderService()
    const purchaseOrders = await purchaseOrderService.getAllPurchaseOrders({
      supplierId: supplierId || undefined,
      status: status || undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      search: search || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    })

    return NextResponse.json({ data: purchaseOrders })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/purchase-orders - Create purchase order
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      supplierId,
      orderDate,
      expectedDate,
      requestedBy,
      paymentTerms,
      deliveryTerms,
      shippingAddress,
      billingAddress,
      notes,
      internalNotes,
      currency,
      exchangeRate,
      items
    } = body

    if (!supplierId) {
      return NextResponse.json(
        { error: 'Supplier ID is required' },
        { status: 400 }
      )
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Purchase order must have at least one item' },
        { status: 400 }
      )
    }

    // Validate items
    for (const item of items) {
      if (!item.itemCode || !item.description) {
        return NextResponse.json(
          { error: 'Item code and description are required for all items' },
          { status: 400 }
        )
      }
      if (!item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { error: 'Item quantity must be positive' },
          { status: 400 }
        )
      }
      if (item.unitPrice < 0) {
        return NextResponse.json(
          { error: 'Item unit price cannot be negative' },
          { status: 400 }
        )
      }
    }

    const purchaseOrderService = new PurchaseOrderService()
    const purchaseOrder = await purchaseOrderService.createPurchaseOrder({
      supplierId,
      orderDate: orderDate ? new Date(orderDate) : undefined,
      expectedDate: expectedDate ? new Date(expectedDate) : undefined,
      requestedBy,
      paymentTerms,
      deliveryTerms,
      shippingAddress,
      billingAddress,
      notes,
      internalNotes,
      currency,
      exchangeRate,
      items,
      createdBy: session.user.id
    })

    return NextResponse.json({ data: purchaseOrder }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating purchase order:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found') || 
        error instanceof Error ? error.message : String(error)?.includes('inactive supplier') ||
        error instanceof Error ? error.message : String(error)?.includes('quantity must be') ||
        error instanceof Error ? error.message : String(error)?.includes('price cannot be')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create purchase order' },
      { status: 500 }
    )
  }
}