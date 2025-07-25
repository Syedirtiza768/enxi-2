import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { StockTransferService } from '@/lib/services/warehouse/stock-transfer.service'



// POST /api/stock-transfers/[id]/ship - Ship stock transfer
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const stockTransferService = new StockTransferService()
    const transfer = await stockTransferService.shipStockTransfer(
      resolvedParams.id,
      session.user.id
    )

    return NextResponse.json({ data: transfer })
  } catch (error: unknown) {
    console.error('Error shipping stock transfer:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('Can only ship')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to ship stock transfer' },
      { status: 500 }
    )
  }
}