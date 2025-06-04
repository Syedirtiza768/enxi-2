import { NextRequest, NextResponse } from 'next/server'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'
import { ShipmentService } from '@/lib/services/shipment.service'
import { SalesWorkflowService } from '@/lib/services/sales-workflow.service'
import { z } from 'zod'

const deliverShipmentSchema = z.object({
  deliveredBy: z.string().min(1, 'Delivered by is required'),
  deliveryNotes: z.string().optional(),
  recipientName: z.string().optional(),
})

const shipmentService = new ShipmentService()
const workflowService = new SalesWorkflowService()

/**
 * POST /api/shipments/[id]/deliver - Deliver shipment with workflow automation
 */
export const POST = createProtectedHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id: shipmentId } = await params
      const body = await request.json()
      const validatedData = deliverShipmentSchema.parse(body)
      const userId = request.user!.id
      
      // Step 1: Deliver the shipment
      const shipment = await shipmentService.deliverShipment(shipmentId, {
        ...validatedData,
        deliveredBy: userId
      })
      
      // Step 2: Trigger workflow automation
      const workflowResults = await workflowService.onShipmentDelivered(shipmentId, userId)
      
      return NextResponse.json({
        shipment,
        workflow: {
          invoiceCreated: workflowResults.invoiceCreated,
          invoiceId: workflowResults.invoiceId,
          orderStatusUpdated: workflowResults.orderStatusUpdated,
          glEntriesCreated: workflowResults.glEntriesCreated
        },
        message: workflowResults.invoiceCreated 
          ? 'Shipment delivered and invoice automatically generated'
          : 'Shipment delivered successfully'
      })
    } catch (error) {
      console.error('Error delivering shipment:', error)
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.errors },
          { status: 400 }
        )
      }

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return NextResponse.json(
            { error: error.message },
            { status: 404 }
          )
        }
        
        if (error.message.includes('must be shipped')) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          )
        }

        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to deliver shipment' },
        { status: 500 }
      )
    }
  },
  { permissions: ['shipments.update'] }
)