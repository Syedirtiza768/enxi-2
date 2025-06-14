import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { SupplierService } from '@/lib/services/purchase/supplier.service'



// GET /api/suppliers/[id] - Get supplier by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supplierService = new SupplierService()
    const supplier = await supplierService.getSupplier(resolvedParams.id)

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: supplier })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/suppliers/[id] - Update supplier
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
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
      resolvedParams.id,
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
  } catch (error: unknown) {
    console.error('Error updating supplier:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('already exists')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
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
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supplierService = new SupplierService()
    const supplier = await supplierService.deactivateSupplier(resolvedParams.id, user.id)

    return NextResponse.json({ data: supplier })
  } catch (error: unknown) {
    console.error('Error deactivating supplier:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('outstanding balance')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to deactivate supplier' },
      { status: 500 }
    )
  }
}