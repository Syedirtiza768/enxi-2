import { NextRequest, NextResponse } from 'next/server'
// // import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { QuotationService } from '@/lib/services/quotation.service'

// GET /api/quotations/[id] - Get quotation by ID
// Supports view query parameter: ?view=client or ?view=internal (default)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = { user: { id: 'system' } }
    // const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    
    const quotationService = new QuotationService()
    
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'internal'
    
    let quotation
    if (view === 'client') {
      quotation = await quotationService.getQuotationClientView(id)
    } else {
      quotation = await quotationService.getQuotationInternalView(id)
    }
    
    if (!quotation) {
      return NextResponse.json(
        { error: 'Quotation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: quotation,
      view
    })
  } catch (error) {
    console.error('Error fetching quotation:', error)
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/quotations/[id] - Update quotation (creates new version)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = { user: { id: 'system' } }
    // const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    
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

    const updateData: {
      validUntil?: Date
      paymentTerms?: string
      deliveryTerms?: string
      notes?: string
      items?: typeof items
    } = {}
    if (validUntil) updateData.validUntil = new Date(validUntil)
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms
    if (deliveryTerms !== undefined) updateData.deliveryTerms = deliveryTerms
    if (notes !== undefined) updateData.notes = notes
    if (items) updateData.items = items

    const quotationService = new QuotationService()
    const { id } = await context.params
    
    const quotation = await quotationService.createNewVersion(id, {
      ...updateData,
      createdBy: session.user.id
    })

    return NextResponse.json({
      success: true,
      data: quotation
    })
  } catch (error: unknown) {
    console.error('Error updating quotation:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    if (errorMessage.includes('not found')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update quotation' },
      { status: 500 }
    )
  }
}