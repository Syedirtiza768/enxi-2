import { NextRequest, NextResponse } from 'next/server'
import { SalesOrderService } from '@/lib/services/sales-order.service'

const salesOrderService = new SalesOrderService()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const summary = await salesOrderService.getSalesOrderSummary(resolvedParams.id)
    
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error getting sales order summary:', error)
    return NextResponse.json(
      { error: 'Failed to get sales order summary' },
      { status: 500 }
    )
  }
}