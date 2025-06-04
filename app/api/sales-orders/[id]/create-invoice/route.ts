import { NextRequest, NextResponse } from 'next/server'
import { InvoiceService } from '@/lib/services/invoice.service'
import { InvoiceType } from '@/lib/generated/prisma'
import { z } from 'zod'

const createInvoiceFromOrderSchema = z.object({
  type: z.nativeEnum(InvoiceType).optional(),
  dueDate: z.string().datetime().optional(),
  paymentTerms: z.string().optional(),
  billingAddress: z.string().optional(),
  notes: z.string().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
      params.id,
      additionalData
    )
    
    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating invoice from sales order:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create invoice from sales order' },
      { status: 500 }
    )
  }
}