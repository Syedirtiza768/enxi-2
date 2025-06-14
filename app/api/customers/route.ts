import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { CustomerService } from '@/lib/services/customer.service'
import { withCrudAudit } from '@/lib/middleware/audit.middleware'
import { EntityType } from '@/lib/validators/audit.validator'

// GET /api/customers - List all customers with search
const getHandler = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Try to get user first and handle auth errors separately
    let user;
    try {
      user = await getUserFromRequest(request)
    } catch (authError) {
      console.error('Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const customerService = new CustomerService()
    const searchParams = request.nextUrl.searchParams
    
    const options = {
      search: searchParams.get('search') || undefined,
      currency: searchParams.get('currency') || undefined,
      industry: searchParams.get('industry') || undefined,
      status: searchParams.get('status') as 'active' | 'inactive' | undefined,
      hasOutstanding: searchParams.get('hasOutstanding') === 'true',
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' | undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page') || '1') : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit') || '10') : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset') || '0') : undefined
    }

    const result = await customerService.getAllCustomers(options)

    return NextResponse.json({
      success: true,
      data: result.customers,
      customers: result.customers,
      total: result.total,
      stats: result.stats,
      pagination: result.pagination
    })
  } catch (error) {
    console.error('Customers API Error:', error);
    
    // Enhanced error response
    return NextResponse.json({
      error: 'Failed to fetch customers',
      code: 'FETCH_CUSTOMERS_ERROR',
      message: 'Unable to retrieve customer list. Please try again.',
      context: {
        operation: 'fetch_customers',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 })
  }
}

// POST /api/customers - Create new customer
const postHandler = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Try to get user first and handle auth errors separately
    let user;
    try {
      user = await getUserFromRequest(request)
    } catch (authError) {
      console.error('Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    
    const { 
      name, 
      email, 
      phone, 
      industry, 
      website, 
      address, 
      taxId,
      currency,
      creditLimit,
      paymentTerms,
      leadId
    } = body

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({
        error: 'Missing required fields',
        code: 'VALIDATION_ERROR',
        message: 'Customer name and email address are required.',
        context: {
          operation: 'create_customer',
          missingFields: [
            ...(!name ? ['name'] : []),
            ...(!email ? ['email'] : [])
          ]
        }
      }, { status: 400 })
    }

    const customerService = new CustomerService()
    
    const customer = await customerService.createCustomer({
      name,
      email,
      phone,
      industry,
      website,
      address,
      taxId,
      currency,
      creditLimit,
      paymentTerms,
      leadId,
      createdBy: user.id
    })

    return NextResponse.json({
      success: true,
      data: customer
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating customer:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Handle specific error cases with enhanced responses
    if (errorMessage.includes('already exists')) {
      return NextResponse.json({
        error: 'Customer already exists',
        code: 'DUPLICATE_CUSTOMER',
        message: 'A customer with this email address already exists.',
        context: {
          operation: 'create_customer',
          duplicateField: 'email',
          suggestion: 'Use a different email address or update the existing customer.'
        }
      }, { status: 409 })
    }
    
    if (errorMessage.includes('Account code already exists')) {
      return NextResponse.json({
        error: 'Account creation failed',
        code: 'ACCOUNT_CODE_CONFLICT',
        message: 'Unable to create customer account due to a system conflict.',
        context: {
          operation: 'create_customer',
          issue: 'account_code_conflict',
          suggestion: 'Please try again or contact support if the problem persists.'
        }
      }, { status: 500 })
    }
    
    if (errorMessage.includes('Unauthorized')) {
      return NextResponse.json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to create customers.',
        context: {
          operation: 'create_customer',
          action_required: 'login'
        }
      }, { status: 401 })
    }

    return NextResponse.json({
      error: 'Failed to create customer',
      code: 'CREATE_CUSTOMER_ERROR',
      message: 'An unexpected error occurred while creating the customer. Please try again.',
      context: {
        operation: 'create_customer',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 })
  }
}

// Export audit-wrapped handlers
export const GET = withCrudAudit(getHandler, EntityType.CUSTOMER, 'GET', {
  metadata: { operation: 'list_customers' }
})

export const POST = withCrudAudit(postHandler, EntityType.CUSTOMER, 'POST', {
  entityIdField: 'id',
  metadata: { operation: 'create_customer' }
})