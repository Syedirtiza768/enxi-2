import { NextRequest, NextResponse } from 'next/server'
import { SalesOrderService } from '@/lib/services/sales-order.service'
import { z } from 'zod'

const updateSalesOrderSchema = z.object({
  requestedDate: z.string().datetime().optional(),
  promisedDate: z.string().datetime().optional(),
  paymentTerms: z.string().optional(),
  shippingTerms: z.string().optional(),
  shippingAddress: z.string().optional(),
  billingAddress: z.string().optional(),
  customerPO: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().optional(),
    itemCode: z.string(),
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).max(100).optional(),
    taxRate: z.number().min(0).max(100).optional(),
    unitOfMeasureId: z.string().optional()
  })).optional()
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const salesOrderService = new SalesOrderService()
    const salesOrder = await salesOrderService.getSalesOrder(resolvedParams.id)
    
    if (!salesOrder) {
      return NextResponse.json(
        { error: 'Sales order not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(salesOrder)
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
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const body = await request.json()
    const data = updateSalesOrderSchema.parse(body)
    
    const salesOrderService = new SalesOrderService()
    
    const updateData = {
      ...data,
      requestedDate: data.requestedDate ? new Date(data.requestedDate) : undefined,
      promisedDate: data.promisedDate ? new Date(data.promisedDate) : undefined,
      updatedBy: userId
    }
    
    const salesOrder = await salesOrderService.updateSalesOrder(resolvedParams.id, updateData)
    
    return NextResponse.json(salesOrder)
  } catch (error) {
    console.error('Error updating sales order:', error)
    return NextResponse.json(
      { error: 'Failed to update sales order' },
      { status: 500 }
    )
  }
}