import { NextRequest, NextResponse } from 'next/server'
import { InvoiceService } from '@/lib/services/invoice.service'
import { z } from 'zod'

const updateInvoiceSchema = z.object({
  dueDate: z.string().datetime().optional(),
  paymentTerms: z.string().optional(),
  billingAddress: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().optional(),
    itemCode: z.string(),
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).max(100).optional(),
    taxRate: z.number().min(0).max(100).optional()
  })).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceService = new InvoiceService()
    const invoice = await invoiceService.getInvoice(params.id)
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error getting invoice:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const body = await request.json()
    const data = updateInvoiceSchema.parse(body)
    
    const invoiceService = new InvoiceService()
    
    const updateData = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      updatedBy: userId
    }
    
    const invoice = await invoiceService.updateInvoice(params.id, updateData)
    
    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    )
  }
}