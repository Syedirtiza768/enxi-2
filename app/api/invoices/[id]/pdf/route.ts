import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoicePDF } from '@/lib/pdf/invoice-template'
import { InvoiceService } from '@/lib/services/invoice.service'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    // Authenticate user - using system user for now
    const session = { user: { id: 'system' } }
    
    const invoiceId = resolvedParams.id
    
    // Get view type from query params
    const searchParams = request.nextUrl.searchParams
    const viewType = searchParams.get('view') as 'client' | 'internal' || 'client'

    // Get invoice data
    const invoiceService = new InvoiceService()
    const invoice = await invoiceService.getInvoice(invoiceId)

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    
    // Convert items to lines structure if not already present
    let lines = invoice.lines
    if (!lines && invoice.items && invoice.items.length > 0) {
      // Group items by line number
      const itemsByLine = new Map()
      invoice.items.forEach((item: any) => {
        const lineNumber = item.lineNumber || 1
        if (!itemsByLine.has(lineNumber)) {
          itemsByLine.set(lineNumber, [])
        }
        itemsByLine.get(lineNumber).push(item)
      })

      // Create lines structure
      lines = Array.from(itemsByLine.entries()).map(([lineNumber, items]) => {
        const lineHeader = items.find((item: any) => item.isLineHeader)
        return {
          lineNumber,
          lineDescription: lineHeader?.lineDescription || lineHeader?.description || '',
          items: items.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
        }
      }).sort((a, b) => a.lineNumber - b.lineNumber)
    }

    // Prepare PDF data similar to quotation
    const pdfData = {
      invoice: {
        ...invoice,
        items: invoice.items || [],
        lines: lines || [],
        currency: invoice.currency || 'USD',
        subtotal: invoice.subtotalAmount || invoice.subtotal,
        // Ensure all amounts are available
        subtotalAmount: invoice.subtotalAmount || invoice.subtotal,
        discountAmount: invoice.discountAmount || 0,
        taxAmount: invoice.taxAmount || 0,
        totalAmount: invoice.totalAmount || 0,
        paidAmount: invoice.paidAmount || 0,
        balanceAmount: invoice.balanceAmount || invoice.totalAmount - (invoice.paidAmount || 0)
      },
      companyInfo: {
        name: 'Enxi ERP Solutions',
        address: '123 Business Street, Dubai, UAE',
        phone: '+971-4-123-4567',
        email: 'info@enxi.com',
        taxNumber: 'TAX123456789'
      },
      showLogo: true,
      showTaxBreakdown: true
    }

    // Debug log
    console.log('Invoice PDF Data:', {
      invoiceId: invoiceId,
      viewType,
      hasItems: !!invoice.items,
      itemsCount: invoice.items?.length,
      currency: invoice.currency,
      totalAmount: invoice.totalAmount
    })

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(
      InvoicePDF({
        invoice: pdfData.invoice,
        companyInfo: pdfData.companyInfo,
        showLogo: pdfData.showLogo,
        showTaxBreakdown: pdfData.showTaxBreakdown,
        viewType
      })
    )

    // Set headers for PDF response
    const headers = new Headers()
    headers.set('Content-Type', 'application/pdf')
    headers.set('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`)
    headers.set('Cache-Control', 'public, max-age=3600') // Cache for 1 hour

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}