import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { StockTransferService } from '@/lib/services/warehouse/stock-transfer.service'



// GET /api/stock-transfers/[id] - Get stock transfer by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const stockTransferService = new StockTransferService()
    const transfer = await stockTransferService.getStockTransfer(resolvedParams.id)

    if (!transfer) {
      return NextResponse.json(
        { error: 'Stock transfer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: transfer })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/stock-transfers/[id] - Cancel stock transfer
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json().catch(() => ({}))
    const { reason } = body

    const stockTransferService = new StockTransferService()
    const transfer = await stockTransferService.cancelStockTransfer(
      resolvedParams.id,
      session.user.id,
      reason
    )

    return NextResponse.json({ data: transfer })
  } catch (error: unknown) {
    console.error('Error cancelling stock transfer:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('Cannot cancel')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to cancel stock transfer' },
      { status: 500 }
    )
  }
}