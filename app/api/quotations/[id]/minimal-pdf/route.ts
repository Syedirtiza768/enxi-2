import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { QuotationPDFMinimal } from '@/lib/pdf/quotation-template-minimal'
import { QuotationService } from '@/lib/services/quotation.service'
import React from 'react'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const quotationId = resolvedParams.id
    const viewType = request.nextUrl.searchParams.get('view') as 'client' | 'internal' || 'client'
    
    const quotationService = new QuotationService()
    const pdfData = await quotationService.getQuotationPDFData(quotationId, viewType)
    
    if (!pdfData.quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }
    
    // Log what we're rendering
    console.log('Minimal PDF - Rendering:', {
      quotationNumber: pdfData.quotation.quotationNumber,
      viewType,
      linesCount: pdfData.quotation.lines?.length,
      hasLines: !!pdfData.quotation.lines
    })
    
    const pdfBuffer = await renderToBuffer(
      React.createElement(QuotationPDFMinimal, {
        quotation: pdfData.quotation,
        viewType
      })
    )
    
    const headers = new Headers()
    headers.set('Content-Type', 'application/pdf')
    headers.set('Content-Disposition', `inline; filename="${pdfData.quotation.quotationNumber}-minimal.pdf"`)
    
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers
    })
    
  } catch (error) {
    console.error('Minimal PDF Error:', error)
    return NextResponse.json(
      { error: 'PDF generation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}