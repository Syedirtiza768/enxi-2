import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { StockMovementService, CreateStockMovementInput } from '@/lib/services/inventory/stock-movement.service'
// MovementType is a string in the schema, not an enum

// GET /api/inventory/stock-movements - Get stock movements
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    if (!session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const itemId = searchParams.get('itemId')
    const type = searchParams.get('type') as string | null
    const days = searchParams.get('days')
    const locationId = searchParams.get('locationId')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const aggregate = searchParams.get('aggregate')

    const stockMovementService = new StockMovementService()

    // Handle date range aggregation for analytics
    if (aggregate && from && to) {
      const fromDate = new Date(from)
      const toDate = new Date(to)
      
      const aggregatedData = await stockMovementService.getAggregatedMovements({
        from: fromDate,
        to: toDate,
        groupBy: aggregate as 'daily' | 'weekly' | 'monthly'
      })
      
      return NextResponse.json({ movements: aggregatedData })
    }

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
      : from ? new Date(from) : undefined
    
    const dateTo = to ? new Date(to) : undefined

    const movements = await stockMovementService.getAllMovements({
      type: type || undefined,
      dateFrom,
      dateTo,
      locationId: locationId || undefined,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0
    })

    return NextResponse.json({ movements })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/inventory/stock-movements - Create stock movement
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    if (!session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      itemId,
      itemCode, // Support both itemId and itemCode
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

    if ((!itemId && !itemCode) || !movementType || !quantity) {
      return NextResponse.json(
        { error: 'Item ID or code, movement type, and quantity are required' },
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

    const movementData: CreateStockMovementInput & { createdBy: string } = {
      itemId: actualItemId,
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
      createdBy: session.user.id
    }

    const stockMovementService = new StockMovementService()
    const movement = await stockMovementService.createStockMovement(movementData)

    return NextResponse.json(movement, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating stock movement:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('Insufficient stock') || 
        error instanceof Error ? error.message : String(error)?.includes('does not track') ||
        error instanceof Error ? error.message : String(error)?.includes('already exists')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create stock movement' },
      { status: 500 }
    )
  }
}