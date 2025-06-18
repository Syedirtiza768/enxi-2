import { NextRequest, NextResponse } from 'next/server'
import { QuotationService } from '@/lib/services/quotation.service'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Direct quotation endpoint called')
    
    const body = await request.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    
    const quotationService = new QuotationService()
    
    // Add createdBy field
    const quotationData = {
      ...body,
      validUntil: new Date(body.validUntil),
      createdBy: 'system'
    }
    
    console.log('Creating quotation with data:', quotationData)
    
    const quotation = await quotationService.createQuotation(quotationData)
    
    console.log('Quotation created successfully:', quotation.id)
    
    return NextResponse.json({
      success: true,
      data: quotation
    }, { status: 201 })
    
  } catch (error) {
    console.error('Direct endpoint error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    return NextResponse.json({
      error: 'Failed to create quotation',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name
    }, { status: 500 })
  }
}