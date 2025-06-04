import { NextRequest, NextResponse } from 'next/server'
import { ShipmentService } from '@/lib/services/shipment.service'
import { z } from 'zod'

const createShipmentSchema = z.object({
  salesOrderId: z.string().min(1, 'Sales order ID is required'),
  items: z.array(z.object({
    salesOrderItemId: z.string(),
    quantity: z.number().positive('Quantity must be positive'),
  })).min(1, 'At least one item is required'),
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  shippingMethod: z.string().optional(),
  shipFromAddress: z.string().optional(),
  notes: z.string().optional(),
  createdBy: z.string().min(1, 'Created by is required'),
})

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  status: z.string().optional(),
  customerId: z.string().optional(),
  salesOrderId: z.string().optional(),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    const validatedParams = querySchema.parse(params)
    const { page, limit, ...filters } = validatedParams
    
    const shipmentService = new ShipmentService()
    
    // If customerId is provided, use customer-specific method
    if (filters.customerId) {
      const result = await shipmentService.getShipmentsByCustomer(filters.customerId, {
        status: filters.status as any,
        startDate: filters.startDate,
        endDate: filters.endDate,
        page,
        limit,
      })
      return NextResponse.json(result)
    }
    
    // Otherwise, get all shipments with filters
    const result = await shipmentService.getShipments({
      page,
      limit,
      filters,
    })
    
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error fetching shipments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createShipmentSchema.parse(body)
    
    const shipmentService = new ShipmentService()
    const shipment = await shipmentService.createShipmentFromOrder(
      validatedData.salesOrderId,
      validatedData
    )
    
    return NextResponse.json(shipment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('Order must be approved')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('Cannot ship more than')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    console.error('Error creating shipment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}