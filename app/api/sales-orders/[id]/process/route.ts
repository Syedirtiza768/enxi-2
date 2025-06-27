import { NextRequest, NextResponse } from 'next/server'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'
import { SalesOrderService } from '@/lib/services/sales-order.service'
import { SalesWorkflowService } from '@/lib/services/sales-workflow.service'
import { OrderStatus } from '@/lib/constants/order-status'
import { z } from 'zod'

const processOrderSchema = z.object({
  notes: z.string().optional(),
})

const salesOrderService = new SalesOrderService()
const workflowService = new SalesWorkflowService()

/**
 * POST /api/sales-orders/[id]/process - Start processing a sales order
 */
export const POST = createProtectedHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id: orderId } = await params
      const body = await request.json().catch(() => ({}))
      const { notes } = processOrderSchema.parse(body)
      const userId = request.user!.id

      // Get the sales order
      const salesOrder = await salesOrderService.getSalesOrder(orderId)
      
      if (!salesOrder) {
        return NextResponse.json(
          { error: 'Sales order not found' },
          { status: 404 }
        )
      }

      // Validate the order is in APPROVED status
      if (salesOrder.status !== OrderStatus.APPROVED) {
        return NextResponse.json(
          { error: `Cannot process order in ${salesOrder.status} status. Order must be APPROVED.` },
          { status: 400 }
        )
      }

      // Update the order status to PROCESSING
      const updatedOrder = await salesOrderService.updateSalesOrder(orderId, {
        status: OrderStatus.PROCESSING
      })

      return NextResponse.json(updatedOrder)
    } catch (error) {
      console.error('Error starting order processing:', error)
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.errors },
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
        { error: 'Failed to start order processing' },
        { status: 500 }
      )
    }
  },
  { permissions: ['sales_orders.process'] }
)