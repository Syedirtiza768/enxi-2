import { NextRequest, NextResponse } from 'next/server'
import { SalesOrderService } from '@/lib/services/sales-order.service'
import { OrderStatus } from '@/lib/generated/prisma'
import { z } from 'zod'

const createSalesOrderSchema = z.object({
  quotationId: z.string().optional(),
  salesCaseId: z.string(),
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
  })).min(1)
})

export async function GET(_request: NextRequest) {
  try {
    const salesOrderService = new SalesOrderService()
    const { searchParams } = new URL(request.url)
    
    const filters = {
      status: searchParams.get('status') as OrderStatus || undefined,
      customerId: searchParams.get('customerId') || undefined,
      salesCaseId: searchParams.get('salesCaseId') || undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined
    }

    const salesOrders = await salesOrderService.getAllSalesOrders(filters)
    
    return NextResponse.json({
      data: salesOrders,
      total: salesOrders.length
    })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(_request: NextRequest) {
  try {
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const body = await request.json()
    const data = createSalesOrderSchema.parse(body)
    
    const salesOrderService = new SalesOrderService()
    
    const salesOrderData = {
      ...data,
      requestedDate: data.requestedDate ? new Date(data.requestedDate) : undefined,
      promisedDate: data.promisedDate ? new Date(data.promisedDate) : undefined,
      createdBy: userId
    }
    
    const salesOrder = await salesOrderService.createSalesOrder(salesOrderData)
    
    return NextResponse.json(salesOrder, { status: 201 })
  } catch (error) {
    console.error('Error creating sales order:', error)
    return NextResponse.json(
      { error: 'Failed to create sales order' },
      { status: 500 }
    )
  }
}