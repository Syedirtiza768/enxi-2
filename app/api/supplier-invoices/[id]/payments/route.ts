import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { SupplierPaymentService } from '@/lib/services/purchase/supplier-payment.service'

// GET /api/supplier-invoices/[id]/payments - Get payments for specific supplier invoice
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
    const payments = await supplierPaymentService.getPaymentsByInvoice(params.id)

    return NextResponse.json({ data: payments })
  } catch (error) {
    console.error('Error fetching invoice payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoice payments' },
      { status: 500 }
    )
  }
}