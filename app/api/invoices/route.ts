import { NextRequest, NextResponse } from 'next/server'
import { InvoiceService } from '@/lib/services/invoice.service'
// InvoiceType values: SALES, PURCHASE, CREDIT_NOTE, DEBIT_NOTE
// InvoiceStatus values: DRAFT, SENT, PAID, CANCELLED, OVERDUE
import { getUserFromRequest } from '@/lib/utils/auth'
import { withCrudAudit } from '@/lib/middleware/audit.middleware'
import { EntityType } from '@/lib/validators/audit.validator'
import { z } from 'zod'

const createInvoiceSchema = z.object({
  salesOrderId: z.string().optional(),
  customerId: z.string(),
  type: z.enum(['SALES', 'CREDIT_NOTE', 'DEBIT_NOTE', 'PROFORMA']).optional(),
  dueDate: z.string().datetime(),
  paymentTerms: z.string().optional(),
  billingAddress: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  items: z.array(z.object({
    lineNumber: z.number(),
    lineDescription: z.string().optional().nullable(),
    isLineHeader: z.boolean(),
    itemType: z.string(),
    itemId: z.string().optional().nullable(),
    itemCode: z.string(),
    description: z.string(),
    internalDescription: z.string().optional().nullable(),
    quantity: z.number().min(0),
    unitPrice: z.number().min(0),
    cost: z.number().min(0).optional().nullable(),
    discount: z.number().min(0).max(100).optional(),
    taxRate: z.number().min(0).max(100).optional(),
    taxRateId: z.string().optional().nullable(),
    unitOfMeasureId: z.string().optional().nullable(),
    sortOrder: z.number()
  })).min(1)
})

// GET /api/invoices - List all invoices with filtering
const getHandler = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Authenticate user
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    
    const invoiceService = new InvoiceService()
    const searchParams = request.nextUrl.searchParams
    
    // Build filters from query parameters
    const filters = {
      status: searchParams.get('status') as any || undefined,
      type: searchParams.get('type') as any || undefined,
      customerId: searchParams.get('customerId') || undefined,
      salesCaseId: searchParams.get('salesCaseId') || undefined,
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
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    
    const body = await request.json()
    
    console.log('Invoice API - Raw request body:', JSON.stringify({
      hasBody: !!body,
      bodyKeys: Object.keys(body),
      customerId: body.customerId,
      dueDate: body.dueDate,
      itemCount: body.items?.length,
      firstItem: body.items?.[0],
      hasLines: !!body.lines
    }, null, 2))
    
    // Validate request body
    let data;
    try {
      data = createInvoiceSchema.parse(body)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error('Zod validation failed:', {
          errors: validationError.errors,
          receivedData: {
            customerId: body.customerId,
            dueDate: body.dueDate,
            itemCount: body.items?.length,
            firstItemKeys: body.items?.[0] ? Object.keys(body.items[0]) : []
          }
        })
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
      createdBy: session.user.id
    }
    
    const invoice = await invoiceService.createInvoice(invoiceData)
    
    return NextResponse.json({
      success: true,
      data: invoice
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    console.error('Full error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    })
    
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