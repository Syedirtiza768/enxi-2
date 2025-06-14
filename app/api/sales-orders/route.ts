import { NextRequest, NextResponse } from 'next/server'
import { SalesOrderService } from '@/lib/services/sales-order.service'
import { OrderStatus } from '@/lib/generated/prisma'
import { getUserFromRequest } from '@/lib/utils/auth'
import { withCrudAudit } from '@/lib/middleware/audit.middleware'
import { EntityType } from '@/lib/validators/audit.validator'
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

// GET /api/sales-orders - List all sales orders with filtering
const getHandler = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request)
    
    const salesOrderService = new SalesOrderService()
    const searchParams = request.nextUrl.searchParams
    
    // Build filters from query parameters
    const filters = {
      status: searchParams.get('status') as OrderStatus || undefined,
      customerId: searchParams.get('customerId') || undefined,
      salesCaseId: searchParams.get('salesCaseId') || undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
    }

    const result = await salesOrderService.getAllSalesOrders(filters)
    
    return NextResponse.json({
      success: true,
      data: result,
      total: result.length
    })
  } catch (error) {
    console.error('Error fetching sales orders:', error)
    
    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch sales orders',
        code: 'FETCH_SALES_ORDERS_ERROR',
        message: 'Unable to retrieve sales order list. Please try again.',
        context: {
          operation: 'fetch_sales_orders',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

// POST /api/sales-orders - Create new sales order
const postHandler = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request)
    
    const body = await request.json()
    
    // Validate request body
    let data;
    try {
      data = createSalesOrderSchema.parse(body)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            message: 'Invalid sales order data provided.',
            details: validationError.errors
          },
          { status: 400 }
        )
      }
      throw validationError
    }
    
    const salesOrderService = new SalesOrderService()
    
    // Prepare sales order data with user context
    const salesOrderData = {
      ...data,
      requestedDate: data.requestedDate ? new Date(data.requestedDate) : undefined,
      promisedDate: data.promisedDate ? new Date(data.promisedDate) : undefined,
      createdBy: user.id
    }
    
    const salesOrder = await salesOrderService.createSalesOrder(salesOrderData)
    
    return NextResponse.json({
      success: true,
      data: salesOrder
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating sales order:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Handle specific error cases
    if (errorMessage.includes('Sales case not found')) {
      return NextResponse.json(
        { 
          error: 'Sales case not found',
          code: 'SALES_CASE_NOT_FOUND',
          message: 'The specified sales case does not exist.'
        },
        { status: 404 }
      )
    }
    
    if (errorMessage.includes('Quotation not found')) {
      return NextResponse.json(
        { 
          error: 'Quotation not found',
          code: 'QUOTATION_NOT_FOUND',
          message: 'The specified quotation does not exist.'
        },
        { status: 404 }
      )
    }
    
    if (errorMessage.includes('Insufficient stock')) {
      return NextResponse.json(
        { 
          error: 'Insufficient stock',
          code: 'INSUFFICIENT_STOCK',
          message: 'One or more items do not have sufficient stock available.'
        },
        { status: 400 }
      )
    }
    
    if (errorMessage.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create sales order',
        code: 'CREATE_SALES_ORDER_ERROR',
        message: 'An error occurred while creating the sales order. Please try again.',
        context: {
          operation: 'create_sales_order',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

// Export audit-wrapped handlers
export const GET = withCrudAudit(getHandler, EntityType.SALES_ORDER, 'GET', {
  metadata: { operation: 'list_sales_orders' }
})

export const POST = withCrudAudit(postHandler, EntityType.SALES_ORDER, 'POST', {
  entityIdField: 'id',
  metadata: { operation: 'create_sales_order' }
})