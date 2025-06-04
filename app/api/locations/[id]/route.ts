import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { LocationService } from '@/lib/services/warehouse/location.service'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/locations/[id] - Get location by ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const locationService = new LocationService()
    const location = await locationService.getLocation(params.id)

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: location })
  } catch (error) {
    console.error('Error fetching location:', error)
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    )
  }
}

// PUT /api/locations/[id] - Update location
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await verifyJWTFromRequest(request)
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
      params.id,
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
      user.id
    )

    return NextResponse.json({ data: location })
  } catch (error: any) {
    console.error('Error updating location:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    if (error.message?.includes('must be an asset')) {
      return NextResponse.json(
        { error: error.message },
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
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const locationService = new LocationService()
    const location = await locationService.deactivateLocation(params.id, user.id)

    return NextResponse.json({ data: location })
  } catch (error: any) {
    console.error('Error deactivating location:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    if (error.message?.includes('Cannot deactivate')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to deactivate location' },
      { status: 500 }
    )
  }
}