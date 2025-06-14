import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { QuotationService } from '@/lib/services/quotation.service'
import { QuotationStatus } from '@/lib/generated/prisma'

// GET /api/quotations - List all quotations with filtering
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(request)
    const quotationService = new QuotationService()
    const searchParams = request.nextUrl.searchParams
    
    const options: {
      salesCaseId?: string
      status?: QuotationStatus
      customerId?: string
      search?: string
      dateFrom?: Date
      dateTo?: Date
      limit?: number
      offset?: number
    } = {}

    const salesCaseId = searchParams.get('salesCaseId')
    if (salesCaseId) options.salesCaseId = salesCaseId

    const status = searchParams.get('status')
    if (status && Object.values(QuotationStatus).includes(status as QuotationStatus)) {
      options.status = status as QuotationStatus
    }

    const customerId = searchParams.get('customerId')
    if (customerId) options.customerId = customerId

    const search = searchParams.get('search')
    if (search) options.search = search

    const dateFrom = searchParams.get('dateFrom')
    if (dateFrom) options.dateFrom = new Date(dateFrom)

    const dateTo = searchParams.get('dateTo')
    if (dateTo) options.dateTo = new Date(dateTo)

    const limit = searchParams.get('limit')
    if (limit) options.limit = parseInt(limit)

    const offset = searchParams.get('offset')
    if (offset) options.offset = parseInt(offset)

    const quotations = await quotationService.getAllQuotations(options)

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

// POST /api/quotations - Create new quotation
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(request)
    const body = await request.json()
    
    const { 
      salesCaseId,
      validUntil,
      paymentTerms,
      deliveryTerms,
      notes,
      items
    } = body

    // Validate required fields
    if (!salesCaseId || !validUntil || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Sales case ID, valid until date, and items are required' },
        { status: 400 }
      )
    }

    // Validate items structure
    for (const item of items) {
      if (!item.itemCode || !item.description || typeof item.quantity !== 'number' || typeof item.unitPrice !== 'number') {
        return NextResponse.json(
          { error: 'Each item must have itemCode, description, quantity, and unitPrice' },
          { status: 400 }
        )
      }
    }

    const quotationService = new QuotationService()
    const quotation = await quotationService.createQuotation({
      salesCaseId,
      validUntil: new Date(validUntil),
      paymentTerms,
      deliveryTerms,
      notes,
      items,
      createdBy: user.id
    })

    return NextResponse.json({
      success: true,
      data: quotation
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating quotation:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }

    if (error instanceof Error ? error.message : String(error)?.includes('Can only create quotations')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create quotation' },
      { status: 500 }
    )
  }
}