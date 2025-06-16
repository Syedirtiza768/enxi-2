import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { LocationService } from '@/lib/services/warehouse/location.service'



// GET /api/locations/[id] - Get location by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const locationService = new LocationService()
    const location = await locationService.getLocation(resolvedParams.id)

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: location })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/locations/[id] - Update location
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      type,
      description,
      address,
      city,
      state,
      country,
      postalCode,
      contactPerson,
      phone,
      email,
      isActive,
      allowNegativeStock,
      maxCapacity,
      inventoryAccountId
    } = body

    const locationService = new LocationService()
    const location = await locationService.updateLocation(
      resolvedParams.id,
      {
        name,
        type,
        description,
        address,
        city,
        state,
        country,
        postalCode,
        contactPerson,
        phone,
        email,
        isActive,
        allowNegativeStock,
        maxCapacity,
        inventoryAccountId
      },
      session.user.id
    )

    return NextResponse.json({ data: location })
  } catch (error: unknown) {
    console.error('Error updating location:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('must be an asset')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    )
  }
}

// DELETE /api/locations/[id] - Deactivate location
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const locationService = new LocationService()
    const location = await locationService.deactivateLocation(resolvedParams.id, session.user.id)

    return NextResponse.json({ data: location })
  } catch (error: unknown) {
    console.error('Error deactivating location:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('Cannot deactivate')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to deactivate location' },
      { status: 500 }
    )
  }
}