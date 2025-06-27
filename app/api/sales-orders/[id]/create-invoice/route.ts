import { NextRequest, NextResponse } from 'next/server'
import { InvoiceService } from '@/lib/services/invoice.service'
// InvoiceType values: SALES, PURCHASE, CREDIT_NOTE, DEBIT_NOTE
import { z } from 'zod'

const createInvoiceFromOrderSchema = z.object({
  type: z.enum(['SALES', 'PURCHASE', 'CREDIT_NOTE', 'DEBIT_NOTE']).optional(),
  dueDate: z.string().datetime().optional(),
  paymentTerms: z.string().optional(),
  billingAddress: z.string().optional(),
  notes: z.string().optional()
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const body = await request.json()
    const data = createInvoiceFromOrderSchema.parse(body)
    
    const invoiceService = new InvoiceService()
    
    const additionalData = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      createdBy: userId
    }
    
    const invoice = await invoiceService.createInvoiceFromSalesOrder(
      resolvedParams.id,
      additionalData
    )
    
    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice from sales order:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invoice from sales order' },
      { status: 500 }
    )
  }
}