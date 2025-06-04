import { NextRequest, NextResponse } from 'next/server'
import { ShipmentService } from '@/lib/services/shipment.service'
import { z } from 'zod'

const confirmShipmentSchema = z.object({
  shippedBy: z.string().min(1, 'Shipped by is required'),
  actualCarrier: z.string().optional(),
  actualTrackingNumber: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validatedData = confirmShipmentSchema.parse(body)
    
    const shipmentService = new ShipmentService()
    const shipment = await shipmentService.confirmShipment(params.id, validatedData)
    
    return NextResponse.json(shipment)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('already shipped')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    console.error('Error confirming shipment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}