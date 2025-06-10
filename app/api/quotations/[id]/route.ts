import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { QuotationService } from '@/lib/services/quotation.service'

// GET /api/quotations/[id] - Get quotation by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const _user = await getUserFromRequest(request)
    const quotationService = new QuotationService()
    
    const resolvedParams = await params
    const quotation = await quotationService.getQuotation(resolvedParams.id)
    
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

// PUT /api/quotations/[id] - Update quotation (creates new version)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const _user = await getUserFromRequest(request)
    const body = await request.json()
    
    const { 
      validUntil,
      paymentTerms,
      deliveryTerms,
      notes,
      items
    } = body

    // If items are provided, validate their structure
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (!item.itemCode || !item.description || typeof item.quantity !== 'number' || typeof item.unitPrice !== 'number') {
          return NextResponse.json(
            { error: 'Each item must have itemCode, description, quantity, and unitPrice' },
            { status: 400 }
          )
        }
      }
    }

    const updateData: any = {}
    if (validUntil) updateData.validUntil = new Date(validUntil)
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms
    if (deliveryTerms !== undefined) updateData.deliveryTerms = deliveryTerms
    if (notes !== undefined) updateData.notes = notes
    if (items) updateData.items = items

    const quotationService = new QuotationService()
    const resolvedParams = await params
    const quotation = await quotationService.createNewVersion(resolvedParams.id, {
      ...updateData,
      createdBy: _user.id
    })

    return NextResponse.json({
      success: true,
      data: quotation
    })
  } catch (error: unknown) {
    console.error('Error updating quotation:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update quotation' },
      { status: 500 }
    )
  }
}