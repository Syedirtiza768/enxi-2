import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { LocationService } from '@/lib/services/warehouse/location.service'
import { LocationType } from '@/lib/generated/prisma'

// GET /api/locations - Get all locations
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') as LocationType | null
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const locationService = new LocationService()
    const locations = await locationService.getAllLocations({
      type: type || undefined,
      isActive: isActive ? isActive === 'true' : undefined,
      search: search || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    })

    return NextResponse.json({ data: locations })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/locations - Create location
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const {
      locationCode,
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
      allowNegativeStock,
      maxCapacity,
      inventoryAccountId
    } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 }
      )
    }

    const locationService = new LocationService()
    const location = await locationService.createLocation({
      locationCode,
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
      allowNegativeStock,
      maxCapacity,
      inventoryAccountId,
      createdBy: session.user.id
    })

    return NextResponse.json({ data: location }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating location:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('already exists') || 
        error instanceof Error ? error.message : String(error)?.includes('not found') ||
        error instanceof Error ? error.message : String(error)?.includes('must be an asset')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create location' },
      { status: 500 }
    )
  }
}