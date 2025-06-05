import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { LocationService } from '@/lib/services/warehouse/location.service'
import { InventoryBalanceService } from '@/lib/services/warehouse/inventory-balance.service'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/locations/[id]/inventory - Get location inventory
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = _request.nextUrl.searchParams
    const itemId = searchParams.get('itemId')
    const hasStock = searchParams.get('hasStock')
    const lowStock = searchParams.get('lowStock')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const summary = searchParams.get('summary')

    const locationService = new LocationService()
    const inventoryBalanceService = new InventoryBalanceService()

    // Check if location exists
    const location = await locationService.getLocation(params.id)
    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    if (summary === 'true') {
      // Return location inventory summary
      const inventorySummary = await locationService.getLocationInventorySummary(params.id)
      const stockSummary = await inventoryBalanceService.getLocationStockSummary(params.id)
      
      return NextResponse.json({ 
        data: {
          summary: inventorySummary,
          items: stockSummary
        }
      })
    } else {
      // Return detailed inventory
      const inventory = await locationService.getLocationInventory(params.id, {
        itemId: itemId || undefined,
        hasStock: hasStock ? hasStock === 'true' : undefined,
        lowStock: lowStock ? lowStock === 'true' : undefined,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined
      })

      return NextResponse.json({ data: inventory })
    }
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}