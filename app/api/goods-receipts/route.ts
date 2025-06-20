import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { GoodsReceiptService } from '@/lib/services/purchase/goods-receipt.service'
import { ReceiptStatus } from '@/lib/types/shared-enums'

// GET /api/goods-receipts - Get all goods receipts
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const searchParams = request.nextUrl.searchParams
    const purchaseOrderId = searchParams.get('purchaseOrderId')
    const status = searchParams.get('status') as ReceiptStatus | null
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const goodsReceiptService = new GoodsReceiptService()
    const receipts = await goodsReceiptService.getAllGoodsReceipts({
      purchaseOrderId: purchaseOrderId || undefined,
      status: status || undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      search: search || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    })

    return NextResponse.json({ data: receipts })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/goods-receipts - Create goods receipt
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const {
      purchaseOrderId,
      receiptDate,
      deliveryNote,
      condition,
      notes,
      items
    } = body

    if (!purchaseOrderId) {
      return NextResponse.json(
        { error: 'Purchase order ID is required' },
        { status: 400 }
      )
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Goods receipt must have at least one item' },
        { status: 400 }
      )
    }

    // Validate items
    for (const item of items) {
      if (!item.purchaseOrderItemId) {
        return NextResponse.json(
          { error: 'Purchase order item ID is required for all items' },
          { status: 400 }
        )
      }
      if (!item.quantityReceived || item.quantityReceived <= 0) {
        return NextResponse.json(
          { error: 'Received quantity must be positive for all items' },
          { status: 400 }
        )
      }
    }

    const goodsReceiptService = new GoodsReceiptService()
    const receipt = await goodsReceiptService.createGoodsReceipt({
      purchaseOrderId,
      receiptDate: receiptDate ? new Date(receiptDate) : undefined,
      deliveryNote,
      condition,
      notes,
      items,
      receivedBy: session.user.id
    })

    return NextResponse.json({ data: receipt }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating goods receipt:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found') || 
        error instanceof Error ? error.message : String(error)?.includes('must be ordered') ||
        error instanceof Error ? error.message : String(error)?.includes('Cannot receive') ||
        error instanceof Error ? error.message : String(error)?.includes('remaining')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create goods receipt' },
      { status: 500 }
    )
  }
}