import { NextRequest, NextResponse } from 'next/server'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'
import { SalesOrderService } from '@/lib/services/sales-order.service'
import { SalesWorkflowService } from '@/lib/services/sales-workflow.service'
import { z } from 'zod'

const approveOrderSchema = z.object({
  notes: z.string().optional(),
})

const salesOrderService = new SalesOrderService()
const workflowService = new SalesWorkflowService()

/**
 * POST /api/sales-orders/[id]/approve - Approve sales order with workflow automation
 */
export const POST = createProtectedHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id: orderId } = await params
      const body = await request.json()
      const { notes: _notes } = approveOrderSchema.parse(body)
      const userId = request.user!.id

      // Step 1: Approve the sales order
      const approvedOrder = await salesOrderService.approveSalesOrder(orderId, userId)

      // Step 2: Trigger workflow automation
      const workflowResults = await workflowService.onOrderApproved(orderId, userId)

      return NextResponse.json({
        order: approvedOrder,
        workflow: {
          stockAllocated: workflowResults.stockAllocated,
          reservationsCreated: workflowResults.stockReservations.length,
          shipmentCreated: workflowResults.shipmentCreated,
          notifications: workflowResults.notifications
        },
        message: workflowResults.stockAllocated 
          ? 'Order approved successfully with stock allocated'
          : 'Order approved but some items have insufficient stock'
      })
    } catch (error) {
      console.error('Error approving sales order:', error)
      
      if (error instanceof Error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to approve sales order' },
        { status: 500 }
      )
    }
  },
  { permissions: ['sales_orders.approve'] }
)