import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { StockTransferService } from '@/lib/services/warehouse/stock-transfer.service'
import { TransferStatus } from '@/lib/generated/prisma'

// GET /api/stock-transfers - Get all stock transfers
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const fromLocationId = searchParams.get('fromLocationId')
    const toLocationId = searchParams.get('toLocationId')
    const status = searchParams.get('status') as TransferStatus | null
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const stockTransferService = new StockTransferService()
    const transfers = await stockTransferService.getAllStockTransfers({
      fromLocationId: fromLocationId || undefined,
      toLocationId: toLocationId || undefined,
      status: status || undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      search: search || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    })

    return NextResponse.json({ data: transfers })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/stock-transfers - Create stock transfer
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      fromLocationId,
      toLocationId,
      expectedDate,
      reason,
      notes,
      items
    } = body

    if (!fromLocationId || !toLocationId) {
      return NextResponse.json(
        { error: 'Source and destination locations are required' },
        { status: 400 }
      )
    }

    if (fromLocationId === toLocationId) {
      return NextResponse.json(
        { error: 'Source and destination locations must be different' },
        { status: 400 }
      )
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Stock transfer must have at least one item' },
        { status: 400 }
      )
    }

    // Validate items
    for (const item of items) {
      if (!item.itemId) {
        return NextResponse.json(
          { error: 'Item ID is required for all items' },
          { status: 400 }
        )
      }
      if (!item.requestedQuantity || item.requestedQuantity <= 0) {
        return NextResponse.json(
          { error: 'Requested quantity must be positive for all items' },
          { status: 400 }
        )
      }
    }

    const stockTransferService = new StockTransferService()
    const transfer = await stockTransferService.createStockTransfer({
      fromLocationId,
      toLocationId,
      expectedDate: expectedDate ? new Date(expectedDate) : undefined,
      reason,
      notes,
      items,
      requestedBy: user.id
    })

    return NextResponse.json({ data: transfer }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating stock transfer:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found') || 
        error instanceof Error ? error.message : String(error)?.includes('must be different') ||
        error instanceof Error ? error.message : String(error)?.includes('must be active') ||
        error instanceof Error ? error.message : String(error)?.includes('Insufficient stock') ||
        error instanceof Error ? error.message : String(error)?.includes('does not track')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create stock transfer' },
      { status: 500 }
    )
  }
}