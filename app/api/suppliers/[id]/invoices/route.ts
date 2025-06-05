import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { SupplierInvoiceService } from '@/lib/services/purchase/supplier-invoice.service'

// GET /api/suppliers/[id]/invoices - Get supplier invoices for specific supplier
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = _request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const supplierInvoiceService = new SupplierInvoiceService()
    const invoices = await supplierInvoiceService.getSupplierInvoicesBySupplier(
      params.id,
      {
        status: status || undefined,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined
      }
    )

    return NextResponse.json({ data: invoices })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}