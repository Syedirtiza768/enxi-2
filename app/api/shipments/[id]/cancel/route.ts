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
    const body = await _request.json()
    const validatedData = cancelShipmentSchema.parse(body)
    
    const shipmentService = new ShipmentService()
    const shipment = await shipmentService.cancelShipment(params.id, validatedData)
    
    return NextResponse.json(shipment)
  } catch (error) {
    console.error('Error cancelling shipment:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    if (errorMessage.includes('not found')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      )
    }
    
    if (errorMessage.includes('Cannot cancel shipment')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}