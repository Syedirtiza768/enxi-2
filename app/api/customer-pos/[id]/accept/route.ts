import { NextRequest, NextResponse } from 'next/server'
import { CustomerPOService } from '@/lib/services/customer-po.service'
import { z } from 'zod'

const acceptPOSchema = z.object({
  createSalesOrder: z.boolean().default(true)
})

const customerPOService = new CustomerPOService()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const body = await request.json()
    const { createSalesOrder } = acceptPOSchema.parse(body)
    
    const result = await customerPOService.acceptCustomerPO(
      params.id,
      userId,
      createSalesOrder
    )
    
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error accepting customer PO:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to accept customer PO' },
      { status: 500 }
    )
  }
}