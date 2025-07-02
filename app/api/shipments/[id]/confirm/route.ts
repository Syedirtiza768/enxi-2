import { NextRequest, NextResponse } from 'next/server'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'
import { ShipmentService } from '@/lib/services/shipment.service'
import { z } from 'zod'

const confirmShipmentSchema = z.object({
  actualCarrier: z.string().optional(),
  actualTrackingNumber: z.string().optional(),
})

export const POST = createProtectedHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
    const resolvedParams = await params
    const body = await request.json()
    const validatedData = confirmShipmentSchema.parse(body)
    
    const shipmentService = new ShipmentService()
    const shipment = await shipmentService.confirmShipment(resolvedParams.id, {
      ...validatedData,
      shippedBy: request.user!.id
    })
    
    return NextResponse.json(shipment)
  } catch (error) {
    console.error('Error confirming shipment:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    if (errorMessage.includes('already shipped')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }
    
    if (errorMessage.includes('not found')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    )
    }
  },
  { permissions: ['shipments.update'] }
)