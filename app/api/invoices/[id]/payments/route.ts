import { NextRequest, NextResponse } from 'next/server'
import { InvoiceService } from '@/lib/services/invoice.service'
import { PaymentMethod } from '@/lib/generated/prisma'
import { z } from 'zod'

const createPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.string().datetime().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  reference: z.string().optional(),
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
    const data = createPaymentSchema.parse(body)
    
    const invoiceService = new InvoiceService()
    
    const paymentData = {
      ...data,
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
      createdBy: userId
    }
    
    const payment = await invoiceService.recordPayment(params.id, paymentData)
    
    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error recording payment:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    )
  }
}