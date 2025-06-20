import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { StockMovementService } from '@/lib/services/inventory/stock-movement.service'

// GET /api/inventory/stock-lots - Get stock lots for an item
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    if (!session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const itemId = searchParams.get('itemId')
    const itemCode = searchParams.get('itemCode')
    const isActive = searchParams.get('isActive')
    const hasStock = searchParams.get('hasStock')
    const expiryDateBefore = searchParams.get('expiryDateBefore')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    if (!itemId && !itemCode) {
      return NextResponse.json(
        { error: 'Item ID or code is required' },
        { status: 400 }
      )
    }

    // If itemCode is provided, look up the item to get its ID
    let actualItemId = itemId
    if (!itemId && itemCode) {
      const { prisma } = await import('@/lib/db/prisma')
      const item = await prisma.item.findUnique({
        where: { code: itemCode }
      })
      if (!item) {
        return NextResponse.json(
          { error: `Item with code ${itemCode} not found` },
          { status: 404 }
        )
      }
      actualItemId = item.id
    }

    const stockMovementService = new StockMovementService()
    const stockLots = await stockMovementService.getStockLots(actualItemId!, {
      isActive: isActive ? isActive === 'true' : undefined,
      hasStock: hasStock === 'true',
      expiryDateBefore: expiryDateBefore ? new Date(expiryDateBefore) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    })

    return NextResponse.json(stockLots)
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}