import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { SupplierPaymentService } from '@/lib/services/purchase/supplier-payment.service'

// GET /api/supplier-payments/[id] - Get specific supplier payment
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supplierPaymentService = new SupplierPaymentService()
    const payment = await supplierPaymentService.getSupplierPayment(resolvedParams.id)

    if (!payment) {
      return NextResponse.json(
        { error: 'Supplier payment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: payment })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/supplier-payments/[id] - Update supplier payment
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { reference, notes, paymentMethod, amount } = body

    // Prevent modification of amount and other critical fields
    if (amount !== undefined) {
      return NextResponse.json(
        { error: 'Payment amount cannot be modified after creation' },
        { status: 400 }
      )
    }

    const updateData: unknown = {}
    if (reference !== undefined) updateData.reference = reference
    if (notes !== undefined) updateData.notes = notes
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod

    const supplierPaymentService = new SupplierPaymentService()
    const payment = await supplierPaymentService.updateSupplierPayment(
      resolvedParams.id,
      updateData,
      session.user.id
    )

    return NextResponse.json({ data: payment })
  } catch (error: unknown) {
    console.error('Error updating supplier payment:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update supplier payment' },
      { status: 500 }
    )
  }
}