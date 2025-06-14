import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { StockMovementService } from '@/lib/services/inventory/stock-movement.service'

// POST /api/inventory/stock-movements/opening - Create opening stock
export async function POST(request: NextRequest): Promise<NextResponse> {
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
  } catch (error: unknown) {
    console.error('Error creating opening stock:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('already exists') || 
        error instanceof Error ? error.message : String(error)?.includes('does not track')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create opening stock' },
      { status: 500 }
    )
  }
}