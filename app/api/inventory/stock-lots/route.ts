import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { StockMovementService } from '@/lib/services/inventory/stock-movement.service'

// GET /api/inventory/stock-lots - Get stock lots for an item
export async function GET(request: NextRequest) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const itemId = searchParams.get('itemId')
    const isActive = searchParams.get('isActive')
    const hasStock = searchParams.get('hasStock')
    const expiryDateBefore = searchParams.get('expiryDateBefore')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    const stockMovementService = new StockMovementService()
    const stockLots = await stockMovementService.getStockLots(itemId, {
      isActive: isActive ? isActive === 'true' : undefined,
      hasStock: hasStock === 'true',
      expiryDateBefore: expiryDateBefore ? new Date(expiryDateBefore) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    })

    return NextResponse.json(stockLots)
  } catch (error) {
    console.error('Error fetching stock lots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock lots' },
      { status: 500 }
    )
  }
}