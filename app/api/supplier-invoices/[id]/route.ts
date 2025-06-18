import { NextRequest, NextResponse } from 'next/server'
// import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { SupplierInvoiceService } from '@/lib/services/purchase/supplier-invoice.service'

// GET /api/supplier-invoices/[id] - Get specific supplier invoice
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const supplierInvoiceService = new SupplierInvoiceService()
    const invoice = await supplierInvoiceService.getSupplierInvoice(resolvedParams.id)

    if (!invoice) {
      return NextResponse.json(
        { error: 'Supplier invoice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: invoice })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/supplier-invoices/[id] - Update supplier invoice
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const {
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

    const updateData: unknown = {}
    
    if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber
    if (invoiceDate !== undefined) updateData.invoiceDate = new Date(invoiceDate)
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate)
    if (currency !== undefined) updateData.currency = currency
    if (subtotal !== undefined) updateData.subtotal = parseFloat(subtotal)
    if (taxAmount !== undefined) updateData.taxAmount = parseFloat(taxAmount)
    if (totalAmount !== undefined) updateData.totalAmount = parseFloat(totalAmount)
    if (taxAccountId !== undefined) updateData.taxAccountId = taxAccountId
    if (notes !== undefined) updateData.notes = notes
    
    if (items !== undefined) {
      updateData.items = items.map((item: unknown) => ({
        goodsReceiptItemId: item.goodsReceiptItemId,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        totalAmount: parseFloat(item.totalAmount || (item.quantity * item.unitPrice)),
        accountId: item.accountId,
        taxAmount: parseFloat(item.taxAmount || 0)
      }))
    }

    const supplierInvoiceService = new SupplierInvoiceService()
    const invoice = await supplierInvoiceService.updateSupplierInvoice(
      resolvedParams.id,
      updateData,
      session.user.id
    )

    return NextResponse.json({ data: invoice })
  } catch (error: unknown) {
    console.error('Error updating supplier invoice:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('Cannot modify') || 
        error instanceof Error ? error.message : String(error)?.includes('already exists')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update supplier invoice' },
      { status: 500 }
    )
  }
}

// DELETE /api/supplier-invoices/[id] - Cancel supplier invoice
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const supplierInvoiceService = new SupplierInvoiceService()
    const invoice = await supplierInvoiceService.cancelSupplierInvoice(resolvedParams.id, session.user.id)

    return NextResponse.json({ data: invoice })
  } catch (error: unknown) {
    console.error('Error cancelling supplier invoice:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error)?.includes('already cancelled')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to cancel supplier invoice' },
      { status: 500 }
    )
  }
}