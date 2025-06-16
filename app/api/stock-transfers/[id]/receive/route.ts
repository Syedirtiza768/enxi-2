import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { StockTransferService } from '@/lib/services/warehouse/stock-transfer.service'



// POST /api/stock-transfers/[id]/receive - Receive stock transfer
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { receivedItems } = body

    // Validate received items if provided
    if (receivedItems && Array.isArray(receivedItems)) {
      for (const item of receivedItems) {
        if (!item.itemId) {
          return NextResponse.json(
            { error: 'Item ID is required for all received items' },
            { status: 400 }
          )
        }
        if (item.receivedQuantity < 0) {
          return NextResponse.json(
            { error: 'Received quantity cannot be negative' },
            { status: 400 }
          )
        }
      }
    }

    const stockTransferService = new StockTransferService()
    const transfer = await stockTransferService.receiveStockTransfer(
      resolvedParams.id,
      session.user.id,
      receivedItems
    )

    return NextResponse.json({ data: transfer })
  } catch (error: unknown) {
    console.error('Error receiving stock transfer:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('Can only receive') ||
        error instanceof Error ? error.message : String(error)?.includes('Cannot receive more')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to receive stock transfer' },
      { status: 500 }
    )
  }
}