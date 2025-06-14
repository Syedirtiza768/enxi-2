import { NextRequest, NextResponse } from 'next/server'
import { SalesOrderService } from '@/lib/services/sales-order.service'
import { z } from 'zod'

const convertQuotationSchema = z.object({
  requestedDate: z.string().datetime().optional(),
  promisedDate: z.string().datetime().optional(),
  shippingAddress: z.string().optional(),
  billingAddress: z.string().optional(),
  customerPO: z.string().optional(),
  notes: z.string().optional()
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const body = await request.json()
    const data = convertQuotationSchema.parse(body)
    
    const salesOrderService = new SalesOrderService()
    
    const additionalData = {
      ...data,
      requestedDate: data.requestedDate ? new Date(data.requestedDate) : undefined,
      promisedDate: data.promisedDate ? new Date(data.promisedDate) : undefined,
      createdBy: userId
    }
    
    const salesOrder = await salesOrderService.convertQuotationToSalesOrder(
      resolvedParams.id,
      additionalData
    )
    
    return NextResponse.json(salesOrder, { status: 201 })
  } catch (error) {
    console.error('Error converting quotation to sales order:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to convert quotation to sales order' },
      { status: 500 }
    )
  }
}