import { NextRequest, NextResponse } from 'next/server'
import { InvoiceService } from '@/lib/services/invoice.service'
import { InvoiceType, InvoiceStatus } from '@/lib/generated/prisma'
import { getUserFromRequest } from '@/lib/utils/auth'
import { withCrudAudit } from '@/lib/middleware/audit.middleware'
import { EntityType } from '@/lib/validators/audit.validator'
import { z } from 'zod'

const createInvoiceSchema = z.object({
  salesOrderId: z.string().optional(),
  customerId: z.string(),
  type: z.nativeEnum(InvoiceType).optional(),
  dueDate: z.string().datetime(),
  paymentTerms: z.string().optional(),
  billingAddress: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().optional(),
    itemCode: z.string(),
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).max(100).optional(),
    taxRate: z.number().min(0).max(100).optional()
  })).min(1)
})

// GET /api/invoices - List all invoices with filtering
const getHandler = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request)
    
    const invoiceService = new InvoiceService()
    const searchParams = request.nextUrl.searchParams
    
    // Build filters from query parameters
    const filters = {
      status: searchParams.get('status') as InvoiceStatus || undefined,
      type: searchParams.get('type') as InvoiceType || undefined,
      customerId: searchParams.get('customerId') || undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      overdue: searchParams.get('overdue') === 'true',
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
    }

    const result = await invoiceService.getAllInvoices(filters)
    
    return NextResponse.json({
      success: true,
      data: result,
      total: result.length
    })
  } catch (error) {
    console.error('Error getting invoices:', error)
    
    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch invoices',
        code: 'FETCH_INVOICES_ERROR',
        message: 'Unable to retrieve invoice list. Please try again.',
        context: {
          operation: 'fetch_invoices',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

// POST /api/invoices - Create new invoice
const postHandler = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request)
    
    const body = await request.json()
    
    // Validate request body
    let data;
    try {
      data = createInvoiceSchema.parse(body)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            message: 'Invalid invoice data provided.',
            details: validationError.errors
          },
          { status: 400 }
        )
      }
      throw validationError
    }
    
    const invoiceService = new InvoiceService()
    
    // Prepare invoice data with user context
    const invoiceData = {
      ...data,
      dueDate: new Date(data.dueDate),
      createdBy: user.id
    }
    
    const invoice = await invoiceService.createInvoice(invoiceData)
    
    return NextResponse.json({
      success: true,
      data: invoice
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Handle specific error cases
    if (errorMessage.includes('Sales order not found')) {
      return NextResponse.json(
        { 
          error: 'Sales order not found',
          code: 'SALES_ORDER_NOT_FOUND',
          message: 'The specified sales order does not exist.'
        },
        { status: 404 }
      )
    }
    
    if (errorMessage.includes('Customer not found')) {
      return NextResponse.json(
        { 
          error: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND',
          message: 'The specified customer does not exist.'
        },
        { status: 404 }
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
        error: 'Failed to create invoice',
        code: 'CREATE_INVOICE_ERROR',
        message: 'An error occurred while creating the invoice. Please try again.',
        context: {
          operation: 'create_invoice',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

// Export audit-wrapped handlers
export const GET = withCrudAudit(getHandler, EntityType.INVOICE, 'GET', {
  metadata: { operation: 'list_invoices' }
})

export const POST = withCrudAudit(postHandler, EntityType.INVOICE, 'POST', {
  entityIdField: 'id',
  metadata: { operation: 'create_invoice' }
})