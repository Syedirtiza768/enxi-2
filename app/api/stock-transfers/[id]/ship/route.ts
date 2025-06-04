import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { StockTransferService } from '@/lib/services/warehouse/stock-transfer.service'

interface RouteParams {
  params: {
    id: string
  }
}

// POST /api/stock-transfers/[id]/ship - Ship stock transfer
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stockTransferService = new StockTransferService()
    const transfer = await stockTransferService.shipStockTransfer(
      params.id,
      user.id
    )

    return NextResponse.json({ data: transfer })
  } catch (error: any) {
    console.error('Error shipping stock transfer:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    if (error.message?.includes('Can only ship')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to ship stock transfer' },
      { status: 500 }
    )
  }
}