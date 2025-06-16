import { NextRequest, NextResponse } from 'next/server'
// // import { getUserFromRequest } from '@/lib/auth/server-auth'
import { QuotationService } from '@/lib/services/quotation.service'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { QuotationPDF } from '@/lib/pdf/quotation-template'

const getHandler = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Authenticate user
    const session = { user: { id: 'system' } }
    // const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const searchParams = request.nextUrl.searchParams
    const ids = searchParams.get('ids')
    
    if (!ids) {
      return NextResponse.json(
        { error: 'No quotation IDs provided' },
        { status: 400 }
      )
    }

    const quotationIds = ids.split(',').filter(id => id.trim())
    
    if (quotationIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid quotation IDs provided' },
        { status: 400 }
      )
    }

    const quotationService = new QuotationService()

    // Single quotation - return PDF directly
    if (quotationIds.length === 1) {
      const pdfData = await quotationService.getQuotationPDFData(quotationIds[0], 'client')
      
      const pdfBuffer = await renderToBuffer(
        <QuotationPDF 
          data={pdfData.quotation} 
          companyInfo={pdfData.companyInfo}
          showLogo={pdfData.showLogo}
          showTaxBreakdown={pdfData.showTaxBreakdown}
          viewType="client"
        />
      )

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Quotation-${pdfData.quotation.quotationNumber}.pdf"`,
        },
      })
    }

    // Multiple quotations - return JSON for now (ZIP functionality to be implemented)
    const quotationDataList = []
    
    for (const quotationId of quotationIds) {
      try {
        const pdfData = await quotationService.getQuotationPDFData(quotationId, 'client')
        quotationDataList.push({
          id: quotationId,
          number: pdfData.quotation.quotationNumber,
          customer: pdfData.quotation.salesCase.customer.name,
          total: pdfData.quotation.totalAmount,
          status: pdfData.quotation.status
        })
      } catch (error) {
        console.error(`Failed to fetch quotation ${quotationId}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      count: quotationDataList.length,
      data: quotationDataList
    })
  } catch (error) {
    console.error('Error exporting quotations:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to export quotations',
        code: 'EXPORT_ERROR',
        message: 'Unable to export quotations. Please try again.',
        context: {
          operation: 'export_quotations',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

export const GET = getHandler