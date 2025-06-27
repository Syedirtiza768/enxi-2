import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { SalesOrderPDF } from '@/lib/pdf/sales-order-template'
import { SalesOrderService } from '@/lib/services/sales-order.service'
import { CompanySettingsService } from '@/lib/services/company-settings.service'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    
    // Authenticate user (using hardcoded session like quotation route)
    const session = { user: { id: 'system' } }
    const user = session.user

    const salesOrderId = resolvedParams.id
    
    // Get view type from query params
    const searchParams = request.nextUrl.searchParams
    const viewType = searchParams.get('view') as 'client' | 'internal' || 'client'

    // Get sales order data
    const salesOrderService = new SalesOrderService()
    const salesOrder = await salesOrderService.getSalesOrder(salesOrderId)

    if (!salesOrder) {
      return NextResponse.json({ error: 'Sales order not found' }, { status: 404 })
    }

    // Get company settings
    const settingsService = new CompanySettingsService()
    const settings = await settingsService.getSettings()

    console.log('Company settings retrieved:', {
      hasCompanyName: !!settings.companyName,
      hasLogo: !!settings.companyLogo,
      showLogoOnPDF: settings.showLogoOnPDF
    })

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
    console.log('Generating PDF for sales order:', salesOrderId, {
      orderNumber: salesOrder.orderNumber,
      viewType,
      hasLines: !!salesOrder.lines?.length,
      hasItems: !!salesOrder.items?.length,
      itemsCount: salesOrder.items?.length || 0,
      salesCaseCustomer: salesOrder.salesCase?.customer?.name,
      currency: salesOrder.currency,
      totalAmount: salesOrder.totalAmount
    })
    
    // Validate required fields
    if (!salesOrder.salesCase?.customer) {
      throw new Error('Sales order is missing customer information')
    }
    
    // Ensure currency is set
    if (!salesOrder.currency) {
      salesOrder.currency = 'AED' // Default currency
    }
    
    // Generate PDF buffer
    let pdfBuffer: Buffer
    try {
      const pdfComponent = SalesOrderPDF({
        salesOrder: salesOrder as any,
        companyInfo,
        showLogo: settings.showLogoOnPDF !== false,
        showTaxBreakdown: settings.showTaxBreakdown !== false,
        viewType
      })
      
      if (!pdfComponent) {
        throw new Error('PDF component returned null')
      }
      
      pdfBuffer = await renderToBuffer(pdfComponent)
      
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('PDF buffer is empty')
      }
      
      console.log('PDF generated successfully, buffer size:', pdfBuffer.length)
    } catch (pdfError) {
      console.error('PDF render error:', pdfError)
      throw new Error(`PDF generation failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`)
    }

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
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    // Return more detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development' && error instanceof Error 
      ? error.message 
      : 'Internal server error'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}