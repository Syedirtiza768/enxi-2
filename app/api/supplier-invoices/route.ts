import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { SupplierInvoiceService } from '@/lib/services/purchase/supplier-invoice.service'

// GET /api/supplier-invoices - Get all supplier invoices
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const supplierId = searchParams.get('supplierId')
    const status = searchParams.get('status')
    const matchingStatus = searchParams.get('matchingStatus')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const supplierInvoiceService = new SupplierInvoiceService()
    const invoices = await supplierInvoiceService.getAllSupplierInvoices({
      supplierId: supplierId || undefined,
      status: status || undefined,
      matchingStatus: matchingStatus || undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      search: search || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    })

    return NextResponse.json({ data: invoices })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/supplier-invoices - Create supplier invoice
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      supplierId,
      invoiceNumber,
      invoiceDate,
      dueDate,
      currency,
      items,
      subtotal,
      taxAmount,
      totalAmount,
      taxAccountId,
      notes
    } = body

    // Validate required fields
    if (!supplierId || !invoiceNumber || !invoiceDate || !dueDate || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Supplier ID, invoice number, invoice date, due date, and items are required' },
        { status: 400 }
      )
    }

    // Validate each item
    for (const item of items) {
      if (!item.goodsReceiptItemId || !item.description || !item.quantity || !item.unitPrice || !item.accountId) {
        return NextResponse.json(
          { error: 'Each item must have goods receipt item ID, description, quantity, unit price, and account ID' },
          { status: 400 }
        )
      }
    }

    const invoiceData = {
      supplierId,
      invoiceNumber,
      invoiceDate: new Date(invoiceDate),
      dueDate: new Date(dueDate),
      currency: currency || 'USD',
      items: items.map((item: unknown) => ({
        goodsReceiptItemId: item.goodsReceiptItemId,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        totalAmount: parseFloat(item.totalAmount || (item.quantity * item.unitPrice)),
        accountId: item.accountId,
        taxAmount: parseFloat(item.taxAmount || 0)
      })),
      subtotal: parseFloat(subtotal),
      taxAmount: parseFloat(taxAmount || 0),
      totalAmount: parseFloat(totalAmount),
      taxAccountId: taxAccountId || undefined,
      notes: notes || undefined,
      createdBy: user.id
    }

    const supplierInvoiceService = new SupplierInvoiceService()
    const invoice = await supplierInvoiceService.createSupplierInvoice(invoiceData)

    return NextResponse.json({ data: invoice }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating supplier invoice:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('already exists') || 
        error instanceof Error ? error.message : String(error)?.includes('exceeds received quantity') ||
        error instanceof Error ? error.message : String(error)?.includes('Three-way matching failed') ||
        error instanceof Error ? error.message : String(error)?.includes('does not have an AP account')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create supplier invoice' },
      { status: 500 }
    )
  }
}