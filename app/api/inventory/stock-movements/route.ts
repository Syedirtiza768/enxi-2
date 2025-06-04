import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { StockMovementService } from '@/lib/services/inventory/stock-movement.service'
import { CreateStockMovementInput } from '@/lib/services/inventory/stock-movement.service'
import { MovementType } from '@/lib/generated/prisma'

// GET /api/inventory/stock-movements - Get stock movements
export async function GET(request: NextRequest) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const itemId = searchParams.get('itemId')
    const type = searchParams.get('type') as MovementType | null
    const days = searchParams.get('days')
    const locationId = searchParams.get('locationId')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const stockMovementService = new StockMovementService()

    // If itemId is provided, get movements for specific item
    if (itemId) {
      const movements = await stockMovementService.getItemStockHistory(itemId, {
        movementType: type || undefined,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined
      })
      return NextResponse.json(movements)
    }

    // Otherwise, get all movements with filters
    const dateFrom = days && days !== 'all' 
      ? new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000)
      : undefined

    const movements = await stockMovementService.getAllMovements({
      type: type || undefined,
      dateFrom,
      locationId: locationId || undefined,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0
    })

    return NextResponse.json({ movements })
  } catch (error) {
    console.error('Error fetching stock movements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock movements' },
      { status: 500 }
    )
  }
}

// POST /api/inventory/stock-movements - Create stock movement
export async function POST(request: NextRequest) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      itemId,
      movementType,
      movementDate,
      quantity,
      unitCost,
      unitOfMeasureId,
      referenceType,
      referenceId,
      referenceNumber,
      locationId,
      location,
      notes,
      autoCreateLot,
      lotNumber,
      expiryDate,
      supplier,
      purchaseRef
    } = body

    if (!itemId || !movementType || !quantity) {
      return NextResponse.json(
        { error: 'Item ID, movement type, and quantity are required' },
        { status: 400 }
      )
    }

    const movementData: CreateStockMovementInput & { createdBy: string } = {
      itemId,
      movementType,
      movementDate: movementDate ? new Date(movementDate) : new Date(),
      quantity,
      unitCost,
      unitOfMeasureId,
      referenceType,
      referenceId,
      referenceNumber,
      locationId,
      location,
      notes,
      autoCreateLot: autoCreateLot ?? true,
      lotNumber,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      supplier,
      purchaseRef,
      createdBy: user.id
    }

    const stockMovementService = new StockMovementService()
    const movement = await stockMovementService.createStockMovement(movementData)

    return NextResponse.json(movement, { status: 201 })
  } catch (error: any) {
    console.error('Error creating stock movement:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    if (error.message?.includes('Insufficient stock') || 
        error.message?.includes('does not track') ||
        error.message?.includes('already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create stock movement' },
      { status: 500 }
    )
  }
}