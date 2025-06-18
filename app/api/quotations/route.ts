import { NextRequest, NextResponse } from 'next/server'
// // import { verifyJWTFromRequest } from '@/lib/auth/server-auth'
import { QuotationService } from '@/lib/services/quotation.service'
import { QuotationStatus } from '@/lib/generated/prisma'
import { withCrudAudit } from '@/lib/middleware/audit.middleware'
import { EntityType } from '@/lib/validators/audit.validator'
import { z } from 'zod'

// Schema for creating quotations
const createQuotationSchema = z.object({
  salesCaseId: z.string(),
  validUntil: z.string().datetime().optional(),
  paymentTerms: z.string().optional(),
  deliveryTerms: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  items: z.array(z.object({
    lineNumber: z.number().int().positive().optional().default(1),
    lineDescription: z.string().optional(),
    isLineHeader: z.boolean().optional().default(false),
    itemType: z.enum(['PRODUCT', 'SERVICE']).optional().default('PRODUCT'),
    itemId: z.string().optional(),
    itemCode: z.string(),
    description: z.string(),
    internalDescription: z.string().optional(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).max(100).optional(),
    taxRate: z.number().min(0).max(100).optional(),
    taxRateId: z.string().optional(),
    unitOfMeasureId: z.string().optional(),
    cost: z.number().min(0).optional(),
    sortOrder: z.number().int().optional()
  })).min(1)
})

// GET /api/quotations - List all quotations with filtering
const getHandler = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Authenticate user
    const session = { user: { id: 'system' } }
    // const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    
    const quotationService = new QuotationService()
    const searchParams = request.nextUrl.searchParams
    
    const options: {
      salesCaseId?: string
      status?: QuotationStatus
      customerId?: string
      search?: string
      dateFrom?: Date
      dateTo?: Date
      limit?: number
      offset?: number
    } = {}

    const salesCaseId = searchParams.get('salesCaseId')
    if (salesCaseId) options.salesCaseId = salesCaseId

    const status = searchParams.get('status')
    if (status && Object.values(QuotationStatus).includes(status as QuotationStatus)) {
      options.status = status as QuotationStatus
    }

    const customerId = searchParams.get('customerId')
    if (customerId) options.customerId = customerId

    const search = searchParams.get('search')
    if (search) options.search = search

    const dateFrom = searchParams.get('dateFrom')
    if (dateFrom) options.dateFrom = new Date(dateFrom)

    const dateTo = searchParams.get('dateTo')
    if (dateTo) options.dateTo = new Date(dateTo)

    const limit = searchParams.get('limit')
    if (limit) options.limit = parseInt(limit)

    const offset = searchParams.get('offset')
    if (offset) options.offset = parseInt(offset)

    const result = await quotationService.getAllQuotations(options)

    return NextResponse.json({
      success: true,
      data: result,
      total: result.length
    })
  } catch (error) {
    console.error('Error fetching quotations:', error)
    
    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch quotations',
        code: 'FETCH_QUOTATIONS_ERROR',
        message: 'Unable to retrieve quotation list. Please try again.',
        context: {
          operation: 'fetch_quotations',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

// POST /api/quotations - Create new quotation
const postHandler = async (request: NextRequest): Promise<NextResponse> => {
  const debugMode = request.headers.get('x-debug') === 'true' || process.env.NODE_ENV === 'development'
  
  if (debugMode) {
    console.log('=== QUOTATION CREATE DEBUG MODE ===')
    console.log('Request URL:', request.url)
    console.log('Request method:', request.method)
    console.log('Request headers:', Object.fromEntries(request.headers.entries()))
  }
  
  try {
    // Authenticate user
    const session = { user: { id: 'system' } }
    // const session = { user: { id: 'system' } }
    // const user = await verifyJWTFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    
    let body;
    try {
      body = await request.json();
      if (debugMode) {
        console.log('Request body:', JSON.stringify(body, null, 2))
      }
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { 
          error: 'Invalid request body',
          code: 'INVALID_JSON',
          message: 'The request body is not valid JSON',
          details: parseError instanceof Error ? parseError.message : String(parseError)
        },
        { status: 400 }
      );
    }
    
    // Validate request body
    let data;
    try {
      data = createQuotationSchema.parse(body)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            message: 'Invalid quotation data provided.',
            details: validationError.errors
          },
          { status: 400 }
        )
      }
      throw validationError
    }

    const quotationService = new QuotationService()
    
    // Prepare quotation data with user context
    const quotationData = {
      ...data,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      createdBy: session.user.id
    }
    
    // Log in debug mode
    if (debugMode) {
      console.log('Creating quotation with processed data:', JSON.stringify(quotationData, null, 2))
      console.log('Validation passed, calling service...')
    }
    
    const quotation = await quotationService.createQuotation(quotationData)

    return NextResponse.json({
      success: true,
      data: quotation
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating quotation:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Error type:', error?.constructor?.name)
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
    
    if (process.env.NODE_ENV === 'development' && typeof body !== 'undefined') {
      console.error('Request body received:', body)
    }
    
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
    
    if (errorMessage.includes('Can only create quotations')) {
      return NextResponse.json(
        { 
          error: 'Invalid sales case status',
          code: 'INVALID_SALES_CASE_STATUS',
          message: 'Quotations can only be created for sales cases in OPEN or NEGOTIATION status.'
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
        error: 'Failed to create quotation',
        code: 'CREATE_QUOTATION_ERROR',
        message: errorMessage || 'An error occurred while creating the quotation. Please try again.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        context: {
          operation: 'create_quotation',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

// Export audit-wrapped handlers with error handling
export const GET = withCrudAudit(getHandler, EntityType.QUOTATION, 'GET', {
  metadata: { operation: 'list_quotations' }
})

// Wrap POST handler with additional error handling
export const POST = async (request: NextRequest) => {
  try {
    const handler = withCrudAudit(postHandler, EntityType.QUOTATION, 'POST', {
      entityIdField: 'id',
      metadata: { operation: 'create_quotation' }
    })
    return await handler(request)
  } catch (error) {
    console.error('Error in POST handler wrapper:', error)
    console.error('Error details:', {
      name: error?.constructor?.name,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while processing your request.',
        details: process.env.NODE_ENV === 'development' ? {
          error: error instanceof Error ? error.message : String(error),
          type: error?.constructor?.name
        } : undefined
      },
      { status: 500 }
    )
  }
}