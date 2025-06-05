import { NextRequest, NextResponse } from 'next/server'
import { CustomerPOService } from '@/lib/services/customer-po.service'
import { z } from 'zod'

const acceptPOSchema = z.object({
  createSalesOrder: z.boolean().default(true)
})

const customerPOService = new CustomerPOService()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const { id } = await params
    const body = await request.json()
    const { createSalesOrder } = acceptPOSchema.parse(body)
    
    const result = await customerPOService.acceptCustomerPO(
      id,
      userId,
      createSalesOrder
    )
    
    return NextResponse.json(result)
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 400 }
    )
  }
}