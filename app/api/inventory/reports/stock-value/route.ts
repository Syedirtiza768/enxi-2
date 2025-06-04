import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { StockMovementService } from '@/lib/services/inventory/stock-movement.service'

// GET /api/inventory/reports/stock-value - Get stock value for specific item
export async function GET(request: NextRequest) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    const stockMovementService = new StockMovementService()
    const availableStock = await stockMovementService.getAvailableStock(itemId)
    const stockValue = await stockMovementService.getStockValue(itemId)

    // Calculate average cost
    const averageCost = availableStock > 0 ? stockValue / availableStock : 0

    return NextResponse.json({
      itemId,
      availableStock,
      stockValue,
      averageCost
    })
  } catch (error) {
    console.error('Error fetching stock value:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock value' },
      { status: 500 }
    )
  }
}