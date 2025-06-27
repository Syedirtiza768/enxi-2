import { NextRequest, NextResponse } from 'next/server'
import { InvoiceService } from '@/lib/services/invoice.service'
import { z } from 'zod'

const createPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.string().optional(),
  paymentMethod: z.enum(['BANK_TRANSFER', 'CASH', 'CHEQUE', 'CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'OTHER']),
  reference: z.string().optional(),
  notes: z.string().optional()
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    let body
    try {
      const text = await request.text()
      console.log('Raw request body:', text)
      body = text ? JSON.parse(text) : {}
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    console.log('Payment API received body:', body)
    
    // Validate with Zod
    const validationResult = createPaymentSchema.safeParse(body)
    if (!validationResult.success) {
      console.error('Payment validation error:', validationResult.error)
      console.error('Validation error details:', JSON.stringify(validationResult.error.format(), null, 2))
      console.error('Received body:', JSON.stringify(body, null, 2))
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.format(),
          receivedData: body
        },
        { status: 400 }
      )
    }
    
    const data = validationResult.data
    const invoiceService = new InvoiceService()
    
    const paymentData = {
      ...data,
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
      createdBy: userId
    }
    
    const payment = await invoiceService.recordPayment(resolvedParams.id, paymentData)
    
    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Error recording payment:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
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