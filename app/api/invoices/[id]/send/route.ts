import { NextRequest, NextResponse } from 'next/server'
import { InvoiceService } from '@/lib/services/invoice.service'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    // TODO: Add proper authentication when auth system is set up
    const userId = 'system' // Temporarily using system user
    
    const invoiceService = new InvoiceService()
    
    // Use the service method which handles journal entries
    const updatedInvoice = await invoiceService.sendInvoice(resolvedParams.id, userId)
    
    return NextResponse.json(updatedInvoice)
  } catch (error) {
    console.error('Error sending invoice:', error)
    
    if (error instanceof Error) {
      // Return specific error messages
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message.includes('draft')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(
      { error: 'Failed to send invoice' },
      { status: 500 }
    )
  }
}