import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { StockTransferService } from '@/lib/services/warehouse/stock-transfer.service'



// POST /api/stock-transfers/[id]/approve - Approve stock transfer
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stockTransferService = new StockTransferService()
    const transfer = await stockTransferService.approveStockTransfer(
      resolvedParams.id,
      user.id
    )

    return NextResponse.json({ data: transfer })
  } catch (error: unknown) {
    console.error('Error approving stock transfer:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('Can only approve') ||
        error instanceof Error ? error.message : String(error)?.includes('Insufficient stock')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to approve stock transfer' },
      { status: 500 }
    )
  }
}