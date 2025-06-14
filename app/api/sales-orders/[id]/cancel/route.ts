import { NextRequest, NextResponse } from 'next/server'
import { SalesOrderService } from '@/lib/services/sales-order.service'
import { z } from 'zod'

const cancelOrderSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required')
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const body = await request.json()
    const { reason } = cancelOrderSchema.parse(body)
    
    const salesOrderService = new SalesOrderService()
    const salesOrder = await salesOrderService.cancelSalesOrder(resolvedParams.id, reason, userId)
    
    return NextResponse.json(salesOrder)
  } catch (error) {
    console.error('Error cancelling sales order:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel sales order' },
      { status: 500 }
    )
  }
}