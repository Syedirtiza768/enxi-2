import { NextRequest, NextResponse } from 'next/server'
import { InvoiceService } from '@/lib/services/invoice.service'
import { getUserFromRequest } from '@/lib/utils/auth'

// POST /api/quotations/[id]/create-invoice - Create invoice from quotation
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add proper authentication
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    
    const { id: quotationId } = await context.params
    const body = await request.json()
    
    const invoiceService = new InvoiceService()
    
    const invoice = await invoiceService.createInvoiceFromQuotation(
      quotationId,
      {
        ...body,
        createdBy: session.user.id
      }
    )
    
    return NextResponse.json({
      success: true,
      data: invoice
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice from quotation:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
      
      if (error.message.includes('Only accepted quotations')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create invoice from quotation' },
      { status: 500 }
    )
  }
}