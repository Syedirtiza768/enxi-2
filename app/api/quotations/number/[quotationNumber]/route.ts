import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { QuotationService } from '@/lib/services/quotation.service'

// GET /api/quotations/number/[quotationNumber] - Get quotation by quotation number
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quotationNumber: string }> }
) {
  try {
    const _user = await getUserFromRequest(_request)
    const quotationService = new QuotationService()
    
    const resolvedParams = await params
    const quotation = await quotationService.getQuotationByNumber(resolvedParams.quotationNumber)
    
    if (!quotation) {
      return NextResponse.json(
        { error: 'Quotation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: quotation
    })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}