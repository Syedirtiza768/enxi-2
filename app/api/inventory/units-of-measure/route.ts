import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { UnitOfMeasureService } from '@/lib/services/inventory/unit-of-measure.service'
import { CreateUnitOfMeasureInput } from '@/lib/services/inventory/unit-of-measure.service'

// GET /api/inventory/units-of-measure - Get all units of measure
export async function GET(request: NextRequest) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const uomService = new UnitOfMeasureService()
    const units = await uomService.getAllUnitsOfMeasure({
      isActive: isActive ? isActive === 'true' : undefined,
      search: search || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    })

    return NextResponse.json({
      data: units,
      total: units.length
    })
  } catch (error) {
    console.error('Error fetching units of measure:', error)
    return NextResponse.json(
      { error: 'Failed to fetch units of measure' },
      { status: 500 }
    )
  }
}

// POST /api/inventory/units-of-measure - Create new unit of measure
export async function POST(request: NextRequest) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { code, name, symbol, isBaseUnit, baseUnitId, conversionFactor } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: 'Code and name are required' },
        { status: 400 }
      )
    }

    // Validate conversion setup
    if (!isBaseUnit && (!baseUnitId || !conversionFactor)) {
      return NextResponse.json(
        { error: 'Non-base units must have base unit and conversion factor' },
        { status: 400 }
      )
    }

    if (isBaseUnit && (baseUnitId || conversionFactor)) {
      return NextResponse.json(
        { error: 'Base units cannot have base unit or conversion factor' },
        { status: 400 }
      )
    }

    const uomData: CreateUnitOfMeasureInput & { createdBy: string } = {
      code,
      name,
      symbol,
      isBaseUnit: isBaseUnit || false,
      baseUnitId,
      conversionFactor,
      createdBy: user.id
    }

    const uomService = new UnitOfMeasureService()
    const unit = await uomService.createUnitOfMeasure(uomData)

    return NextResponse.json(unit, { status: 201 })
  } catch (error: any) {
    console.error('Error creating unit of measure:', error)
    
    if (error.message?.includes('already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }
    
    if (error.message?.includes('not found') || 
        error.message?.includes('inactive') ||
        error.message?.includes('must') ||
        error.message?.includes('cannot')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create unit of measure' },
      { status: 500 }
    )
  }
}