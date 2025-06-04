import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { StockMovementService } from '@/lib/services/inventory/stock-movement.service'

// POST /api/inventory/stock-movements/adjust - Create stock adjustment
export async function POST(request: NextRequest) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { itemId, adjustmentQuantity, reason, unitCost } = body

    if (!itemId || adjustmentQuantity === undefined || !reason) {
      return NextResponse.json(
        { error: 'Item ID, adjustment quantity, and reason are required' },
        { status: 400 }
      )
    }

    if (adjustmentQuantity === 0) {
      return NextResponse.json(
        { error: 'Adjustment quantity cannot be zero' },
        { status: 400 }
      )
    }

    const stockMovementService = new StockMovementService()
    const adjustment = await stockMovementService.adjustStock(
      itemId,
      adjustmentQuantity,
      reason,
      user.id,
      unitCost
    )

    return NextResponse.json(adjustment, { status: 201 })
  } catch (error: any) {
    console.error('Error creating stock adjustment:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    if (error.message?.includes('Insufficient stock') || 
        error.message?.includes('does not track')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create stock adjustment' },
      { status: 500 }
    )
  }
}