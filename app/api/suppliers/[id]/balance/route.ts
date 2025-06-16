import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { SupplierPaymentService } from '@/lib/services/purchase/supplier-payment.service'

// GET /api/suppliers/[id]/balance - Get supplier balance
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supplierPaymentService = new SupplierPaymentService()
    const balance = await supplierPaymentService.getSupplierBalance(resolvedParams.id)

    return NextResponse.json({ data: balance })
  } catch (error) {
    console.error('Error fetching supplier balance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch supplier balance' },
      { status: 500 }
    )
  }
}