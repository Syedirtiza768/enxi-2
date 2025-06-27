import { NextRequest, NextResponse } from 'next/server'
import { createProtectedHandler } from '@/lib/middleware/rbac.middleware'
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

export const GET = createProtectedHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
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
      console.error('Error fetching shipment:', error)
      const errorMessage = error instanceof Error ? error.message : 'Internal server error'
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }
  },
  { permissions: ['shipments.read'] }
)

export const PUT = createProtectedHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
    const resolvedParams = await params
    const body = await request.json()
    const validatedData = updateShipmentSchema.parse(body)
    
    const shipmentService = new ShipmentService()
    const shipment = await shipmentService.updateTrackingInfo(resolvedParams.id, validatedData)
    
    return NextResponse.json(shipment)
    } catch (error) {
      console.error('Error updating shipment:', error)
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.errors },
          { status: 400 }
        )
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Internal server error'
      
      if (errorMessage.includes('not found')) {
        return NextResponse.json(
          { error: errorMessage },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }
  },
  { permissions: ['shipments.update'] }
)