import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { SupplierPaymentService } from '@/lib/services/purchase/supplier-payment.service'
import { PaymentMethod } from '@/lib/generated/prisma'

// GET /api/supplier-payments - Get all supplier payments
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const supplierId = searchParams.get('supplierId')
    const paymentMethod = searchParams.get('paymentMethod') as PaymentMethod | null
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const supplierPaymentService = new SupplierPaymentService()
    const payments = await supplierPaymentService.getAllSupplierPayments({
      supplierId: supplierId || undefined,
      paymentMethod: paymentMethod || undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      search: search || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    })

    return NextResponse.json({ data: payments })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/supplier-payments - Create supplier payment
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      supplierId,
      supplierInvoiceId,
      amount,
      paymentDate,
      paymentMethod,
      reference,
      notes,
      currency,
      exchangeRate,
      bankAccountId
    } = body

    // Validate required fields
    if (!supplierId || !amount || !paymentMethod || !bankAccountId) {
      return NextResponse.json(
        { error: 'Supplier ID, amount, payment method, and bank account ID are required' },
        { status: 400 }
      )
    }

    // Validate amount
    const paymentAmount = parseFloat(amount)
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be a positive number' },
        { status: 400 }
      )
    }

    // Validate exchange rate if provided
    const rate = exchangeRate ? parseFloat(exchangeRate) : undefined
    if (rate && (isNaN(rate) || rate <= 0)) {
      return NextResponse.json(
        { error: 'Exchange rate must be a positive number' },
        { status: 400 }
      )
    }

    const paymentData = {
      supplierId,
      supplierInvoiceId: supplierInvoiceId || undefined,
      amount: paymentAmount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod,
      reference: reference || undefined,
      notes: notes || undefined,
      currency: currency || undefined,
      exchangeRate: rate,
      bankAccountId,
      createdBy: session.user.id
    }

    const supplierPaymentService = new SupplierPaymentService()
    const payment = await supplierPaymentService.createSupplierPayment(paymentData)

    return NextResponse.json({ data: payment }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating supplier payment:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('exceeds') || 
        error instanceof Error ? error.message : String(error)?.includes('positive') ||
        error instanceof Error ? error.message : String(error)?.includes('inactive') ||
        error instanceof Error ? error.message : String(error)?.includes('cancelled') ||
        error instanceof Error ? error.message : String(error)?.includes('does not have') ||
        error instanceof Error ? error.message : String(error)?.includes('not a bank')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create supplier payment' },
      { status: 500 }
    )
  }
}