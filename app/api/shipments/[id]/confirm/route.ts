import { NextRequest, NextResponse } from 'next/server'
import { ShipmentService } from '@/lib/services/shipment.service'
import { z } from 'zod'

const confirmShipmentSchema = z.object({
  shippedBy: z.string().min(1, 'Shipped by is required'),
  actualCarrier: z.string().optional(),
  actualTrackingNumber: z.string().optional(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const body = await request.json()
    const validatedData = confirmShipmentSchema.parse(body)
    
    const shipmentService = new ShipmentService()
    const shipment = await shipmentService.confirmShipment(resolvedParams.id, validatedData)
    
    return NextResponse.json(shipment)
  } catch (error) {
    console.error('Error confirming shipment:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    
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
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}