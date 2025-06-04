import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { SupplierPaymentService } from '@/lib/services/purchase/supplier-payment.service'

// GET /api/supplier-payments/[id] - Get specific supplier payment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supplierPaymentService = new SupplierPaymentService()
    const payment = await supplierPaymentService.getSupplierPayment(params.id)

    if (!payment) {
      return NextResponse.json(
        { error: 'Supplier payment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: payment })
  } catch (error) {
    console.error('Error fetching supplier payment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch supplier payment' },
      { status: 500 }
    )
  }
}

// PUT /api/supplier-payments/[id] - Update supplier payment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyJWTFromRequest(request)
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

    const updateData: any = {}
    if (reference !== undefined) updateData.reference = reference
    if (notes !== undefined) updateData.notes = notes
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod

    const supplierPaymentService = new SupplierPaymentService()
    const payment = await supplierPaymentService.updateSupplierPayment(
      params.id,
      updateData,
      user.id
    )

    return NextResponse.json({ data: payment })
  } catch (error: any) {
    console.error('Error updating supplier payment:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update supplier payment' },
      { status: 500 }
    )
  }
}