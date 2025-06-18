import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { SalesOrderService } from '@/lib/services/sales-order.service'

// POST /api/sales-orders/[id]/send - Send sales order (change status to PROCESSING)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    const salesOrderService = new SalesOrderService()
    
    const resolvedParams = await params
    const salesOrder = await salesOrderService.sendSalesOrder(resolvedParams.id, user.id)

    return NextResponse.json({
      success: true,
      data: salesOrder
    })
  } catch (error: unknown) {
    console.error('Error sending sales order:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }

    if (error instanceof Error ? error.message : String(error)?.includes('Only approved sales orders')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to send sales order' },
      { status: 500 }
    )
  }
}