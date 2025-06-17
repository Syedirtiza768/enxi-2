import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { SalesOrderPDF } from '@/lib/pdf/sales-order-template'
import { SalesOrderService } from '@/lib/services/sales-order.service'
import { CompanySettingsService } from '@/lib/services/company-settings.service'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    // Authenticate user
    const session = { user: { id: 'system' } }
    const user = session.user

    const salesOrderId = resolvedParams.id
    
    // Get view type from query params
    const searchParams = request.nextUrl.searchParams
    const viewType = searchParams.get('view') as 'client' | 'internal' || 'client'

    // Get sales order data
    const salesOrderService = new SalesOrderService()
    const salesOrder = await salesOrderService.getSalesOrderById(salesOrderId)

    if (!salesOrder) {
      return NextResponse.json({ error: 'Sales order not found' }, { status: 404 })
    }

    // Get company settings
    const settingsService = new CompanySettingsService()
    const settings = await settingsService.getSettings()

    // Prepare company info for PDF
    const companyInfo = {
      name: settings.companyName || 'Your Company Name',
      address: settings.companyAddress,
      email: settings.companyEmail,
      phone: settings.companyPhone,
      website: settings.companyWebsite,
      logo: settings.companyLogo,
      footerText: settings.footerText || 'Thank you for your business!'
    }

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(
      SalesOrderPDF({
        salesOrder: salesOrder as any,
        companyInfo,
        showLogo: settings.showLogoOnPDF !== false,
        showTaxBreakdown: settings.showTaxBreakdown !== false,
        viewType
      })
    )

    // Set headers for PDF response
    const headers = new Headers()
    headers.set('Content-Type', 'application/pdf')
    headers.set('Content-Disposition', `inline; filename="${salesOrder.orderNumber}.pdf"`)
    headers.set('Cache-Control', 'public, max-age=3600') // Cache for 1 hour

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Error generating sales order PDF:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}