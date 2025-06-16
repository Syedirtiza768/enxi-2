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
  validUntil: z.string().datetime(),
  paymentTerms: z.string().optional(),
  deliveryTerms: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  items: z.array(z.object({
    lineNumber: z.number().int().positive().optional(),
    lineDescription: z.string().optional(),
    isLineHeader: z.boolean().optional(),
    itemType: z.enum(['PRODUCT', 'SERVICE']).optional(),
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
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { 
          error: 'Invalid request body',
          code: 'INVALID_JSON',
          message: 'The request body is not valid JSON'
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
      validUntil: new Date(data.validUntil),
      createdBy: session.user.id
    }
    
    // Log only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Creating quotation with data:', JSON.stringify(quotationData, null, 2))
    }
    
    const quotation = await quotationService.createQuotation(quotationData)

    return NextResponse.json({
      success: true,
      data: quotation
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating quotation:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    if (process.env.NODE_ENV === 'development') {
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

// Export audit-wrapped handlers
export const GET = withCrudAudit(getHandler, EntityType.QUOTATION, 'GET', {
  metadata: { operation: 'list_quotations' }
})

export const POST = withCrudAudit(postHandler, EntityType.QUOTATION, 'POST', {
  entityIdField: 'id',
  metadata: { operation: 'create_quotation' }
})