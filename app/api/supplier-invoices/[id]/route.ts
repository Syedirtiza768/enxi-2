import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { SupplierInvoiceService } from '@/lib/services/purchase/supplier-invoice.service'

// GET /api/supplier-invoices/[id] - Get specific supplier invoice
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supplierInvoiceService = new SupplierInvoiceService()
    const invoice = await supplierInvoiceService.getSupplierInvoice(params.id)

    if (!invoice) {
      return NextResponse.json(
        { error: 'Supplier invoice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: invoice })
  } catch (error) {
    console.error('Error fetching supplier invoice:', error)
    return NextResponse.json(
      { error: 'Failed to fetch supplier invoice' },
      { status: 500 }
    )
  }
}

// PUT /api/supplier-invoices/[id] - Update supplier invoice
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

    const updateData: any = {}
    
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
      updateData.items = items.map((item: any) => ({
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
      params.id,
      updateData,
      user.id
    )

    return NextResponse.json({ data: invoice })
  } catch (error: any) {
    console.error('Error updating supplier invoice:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    if (error.message?.includes('Cannot modify') || 
        error.message?.includes('already exists')) {
      return NextResponse.json(
        { error: error.message },
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
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyJWTFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supplierInvoiceService = new SupplierInvoiceService()
    const invoice = await supplierInvoiceService.cancelSupplierInvoice(params.id, user.id)

    return NextResponse.json({ data: invoice })
  } catch (error: any) {
    console.error('Error cancelling supplier invoice:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    if (error.message?.includes('already cancelled')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to cancel supplier invoice' },
      { status: 500 }
    )
  }
}