import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { QuotationService } from '@/lib/services/quotation.service'

// POST /api/quotations/[id]/send - Send quotation (change status to SENT)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const quotationService = new QuotationService()
    
    const quotation = await quotationService.sendQuotation(params.id, session.user.id)

    return NextResponse.json({
      success: true,
      data: quotation
    })
  } catch (error: unknown) {
    console.error('Error sending quotation:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }

    if (error instanceof Error ? error.message : String(error)?.includes('Only draft quotations')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to send quotation' },
      { status: 500 }
    )
  }
}