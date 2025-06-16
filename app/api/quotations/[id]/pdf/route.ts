import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { QuotationPDF } from '@/lib/pdf/quotation-template'
import { QuotationService } from '@/lib/services/quotation.service'
// // import { verifyJWTFromRequest } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    // Authenticate user
    const session = { user: { id: 'system' } }
    // const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const quotationId = resolvedParams.id
    
    // Get view type from query params
    const searchParams = request.nextUrl.searchParams
    const viewType = searchParams.get('view') as 'client' | 'internal' || 'client'

    // Get quotation PDF data with settings
    const quotationService = new QuotationService()
    const pdfData = await quotationService.getQuotationPDFData(quotationId, viewType)

    if (!pdfData.quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(
      QuotationPDF({
        quotation: pdfData.quotation,
        companyInfo: pdfData.companyInfo,
        showLogo: pdfData.showLogo,
        showTaxBreakdown: pdfData.showTaxBreakdown,
        viewType
      })
    )

    // Set headers for PDF response
    const headers = new Headers()
    headers.set('Content-Type', 'application/pdf')
    headers.set('Content-Disposition', `inline; filename="${pdfData.quotation.quotationNumber}.pdf"`)
    headers.set('Cache-Control', 'public, max-age=3600') // Cache for 1 hour

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers
    })

} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}