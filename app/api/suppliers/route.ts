import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { SupplierService } from '@/lib/services/purchase/supplier.service'

// GET /api/suppliers - Get all suppliers
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const isActive = searchParams.get('isActive')
    const currency = searchParams.get('currency')
    const search = searchParams.get('search')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const supplierService = new SupplierService()
    const suppliers = await supplierService.getAllSuppliers({
      isActive: isActive ? isActive === 'true' : undefined,
      currency: currency || undefined,
      search: search || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    })

    return NextResponse.json({ data: suppliers })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/suppliers - Create supplier
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      supplierNumber,
      name,
      email,
      phone,
      website,
      address,
      taxId,
      currency,
      paymentTerms,
      creditLimit,
      discount,
      bankName,
      bankAccount,
      routingNumber,
      contactPerson,
      contactEmail,
      contactPhone,
      isPreferred
    } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Supplier name is required' },
        { status: 400 }
      )
    }

    const supplierService = new SupplierService()
    const supplier = await supplierService.createSupplier({
      supplierNumber,
      name,
      email,
      phone,
      website,
      address,
      taxId,
      currency,
      paymentTerms,
      creditLimit,
      discount,
      bankName,
      bankAccount,
      routingNumber,
      contactPerson,
      contactEmail,
      contactPhone,
      isPreferred,
      createdBy: user.id
    })

    return NextResponse.json({ data: supplier }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating supplier:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('already exists') || 
        error instanceof Error ? error.message : String(error)?.includes('unique constraint')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 }
    )
  }
}