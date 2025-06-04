import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { StockMovementService } from '@/lib/services/inventory/stock-movement.service'

// POST /api/inventory/stock-movements/opening - Create opening stock
export async function POST(request: NextRequest) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { itemId, quantity, unitCost, asOfDate, lotNumber } = body

    if (!itemId || !quantity || unitCost === undefined) {
      return NextResponse.json(
        { error: 'Item ID, quantity, and unit cost are required' },
        { status: 400 }
      )
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: 'Opening stock quantity must be positive' },
        { status: 400 }
      )
    }

    if (unitCost < 0) {
      return NextResponse.json(
        { error: 'Unit cost cannot be negative' },
        { status: 400 }
      )
    }

    const stockMovementService = new StockMovementService()
    const openingStock = await stockMovementService.createOpeningStock(
      itemId,
      quantity,
      unitCost,
      asOfDate ? new Date(asOfDate) : new Date(),
      user.id,
      lotNumber
    )

    return NextResponse.json(openingStock, { status: 201 })
  } catch (error: any) {
    console.error('Error creating opening stock:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    if (error.message?.includes('already exists') || 
        error.message?.includes('does not track')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create opening stock' },
      { status: 500 }
    )
  }
}