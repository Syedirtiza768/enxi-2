import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { QuotationService } from '@/lib/services/quotation.service'

// POST /api/quotations/[id]/accept - Accept quotation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    const quotationService = new QuotationService()
    
    const resolvedParams = await params
    const quotation = await quotationService.acceptQuotation(resolvedParams.id, user.id)

    return NextResponse.json({
      success: true,
      data: quotation
    })
  } catch (error: any) {
    console.error('Error accepting quotation:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    if (error.message?.includes('Only sent quotations') || error.message?.includes('expired')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to accept quotation' },
      { status: 500 }
    )
  }
}