import { NextRequest, NextResponse } from 'next/server'
import { ShipmentService } from '@/lib/services/shipment.service'
import { z } from 'zod'

const cancelShipmentSchema = z.object({
  cancelledBy: z.string().min(1, 'Cancelled by is required'),
  reason: z.string().min(1, 'Cancellation reason is required'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validatedData = cancelShipmentSchema.parse(body)
    
    const shipmentService = new ShipmentService()
    const shipment = await shipmentService.cancelShipment(params.id, validatedData)
    
    return NextResponse.json(shipment)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    if (error instanceof Error && error.message.includes('Cannot cancel shipment')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    console.error('Error cancelling shipment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}