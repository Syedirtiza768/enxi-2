import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { QuotationService } from '@/lib/services/quotation.service'

// GET /api/quotations/versions/[salesCaseId] - Get all quotation versions for a sales case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ salesCaseId: string }> }
) {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const quotationService = new QuotationService()
    
    const resolvedParams = await params
    const quotations = await quotationService.getQuotationVersions(resolvedParams.salesCaseId)

    return NextResponse.json({
      success: true,
      data: quotations
    })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}