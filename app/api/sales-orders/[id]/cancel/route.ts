import { NextRequest, NextResponse } from 'next/server'
import { SalesOrderService } from '@/lib/services/sales-order.service'
import { z } from 'zod'

const cancelOrderSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required')
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const body = await request.json()
    const { reason } = cancelOrderSchema.parse(body)
    
    const salesOrderService = new SalesOrderService()
    const salesOrder = await salesOrderService.cancelSalesOrder(params.id, reason, userId)
    
    return NextResponse.json(salesOrder)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error cancelling sales order:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to cancel sales order' },
      { status: 500 }
    )
  }
}