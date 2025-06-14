import { NextRequest, NextResponse } from 'next/server'
import { ShipmentService } from '@/lib/services/shipment.service'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const updateShipmentSchema = z.object({
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  shippingMethod: z.string().optional(),
  estimatedDeliveryDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const shipment = await prisma.shipment.findUnique({
      where: { id: resolvedParams.id },
      include: {
        items: {
          include: {
            item: true,
          },
        },
        salesOrder: {
          include: {
            salesCase: {
              include: {
                customer: true,
              },
            },
          },
        },
      },
    })

    if (!shipment) {
      return NextResponse.json(
        { error: 'Shipment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(shipment)
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const body = await request.json()
    const validatedData = updateShipmentSchema.parse(body)
    
    const shipmentService = new ShipmentService()
    const shipment = await shipmentService.updateTrackingInfo(resolvedParams.id, validatedData)
    
    return NextResponse.json(shipment)
  } catch (error) {
    console.error('Error updating shipment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}