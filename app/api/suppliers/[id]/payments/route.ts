import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { SupplierPaymentService } from '@/lib/services/purchase/supplier-payment.service'

// GET /api/suppliers/[id]/payments - Get payments for specific supplier
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const supplierPaymentService = new SupplierPaymentService()
    const payments = await supplierPaymentService.getPaymentsBySupplier(
      params.id,
      {
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined
      }
    )

    return NextResponse.json({ data: payments })
  } catch (error) {
    console.error('Error fetching supplier payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch supplier payments' },
      { status: 500 }
    )
  }
}