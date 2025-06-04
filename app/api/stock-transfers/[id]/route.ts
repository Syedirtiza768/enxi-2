import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { StockTransferService } from '@/lib/services/warehouse/stock-transfer.service'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/stock-transfers/[id] - Get stock transfer by ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stockTransferService = new StockTransferService()
    const transfer = await stockTransferService.getStockTransfer(params.id)

    if (!transfer) {
      return NextResponse.json(
        { error: 'Stock transfer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: transfer })
  } catch (error) {
    console.error('Error fetching stock transfer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock transfer' },
      { status: 500 }
    )
  }
}

// DELETE /api/stock-transfers/[id] - Cancel stock transfer
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { reason } = body

    const stockTransferService = new StockTransferService()
    const transfer = await stockTransferService.cancelStockTransfer(
      params.id,
      user.id,
      reason
    )

    return NextResponse.json({ data: transfer })
  } catch (error: any) {
    console.error('Error cancelling stock transfer:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    if (error.message?.includes('Cannot cancel')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to cancel stock transfer' },
      { status: 500 }
    )
  }
}