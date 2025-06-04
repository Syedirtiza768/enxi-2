import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { SupplierService } from '@/lib/services/purchase/supplier.service'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/suppliers/[id] - Get supplier by ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supplierService = new SupplierService()
    const supplier = await supplierService.getSupplier(params.id)

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: supplier })
  } catch (error) {
    console.error('Error fetching supplier:', error)
    return NextResponse.json(
      { error: 'Failed to fetch supplier' },
      { status: 500 }
    )
  }
}

// PUT /api/suppliers/[id] - Update supplier
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
      isActive,
      isPreferred
    } = body

    const supplierService = new SupplierService()
    const supplier = await supplierService.updateSupplier(
      params.id,
      {
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
        isActive,
        isPreferred
      },
      user.id
    )

    return NextResponse.json({ data: supplier })
  } catch (error: any) {
    console.error('Error updating supplier:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    if (error.message?.includes('already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update supplier' },
      { status: 500 }
    )
  }
}

// DELETE /api/suppliers/[id] - Deactivate supplier
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supplierService = new SupplierService()
    const supplier = await supplierService.deactivateSupplier(params.id, user.id)

    return NextResponse.json({ data: supplier })
  } catch (error: any) {
    console.error('Error deactivating supplier:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    if (error.message?.includes('outstanding balance')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to deactivate supplier' },
      { status: 500 }
    )
  }
}