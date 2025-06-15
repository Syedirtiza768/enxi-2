import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { QuotationPDF } from '@/lib/pdf/quotation-template'
import { QuotationService } from '@/lib/services/quotation.service'
import { authenticateUser } from '@/lib/auth/jwt'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    // Authenticate user
    const user = await authenticateUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const quotationId = resolvedParams.id

    // Get quotation in client view (PDFs are always for clients)
    const quotationService = new QuotationService()
    const quotation = await quotationService.getQuotationClientView(quotationId)

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(
      QuotationPDF({
        quotation,
        companyInfo: {
          name: 'Enxi ERP System',
          address: '123 Business Street, Enterprise City, EC 12345',
          phone: '+1 (555) 123-4567',
          email: 'info@enxi-erp.com',
          website: 'www.enxi-erp.com'
        }
      })
    )

    // Set headers for PDF response
    const headers = new Headers()
    headers.set('Content-Type', 'application/pdf')
    headers.set('Content-Disposition', `inline; filename="${quotation.quotationNumber}.pdf"`)
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