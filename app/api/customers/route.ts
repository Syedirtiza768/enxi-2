import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { CustomerService } from '@/lib/services/customer.service'

// GET /api/customers - List all customers with search
export async function GET(request: NextRequest) {
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
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
    }

    const customers = await customerService.getAllCustomers(options)

    return NextResponse.json({
      success: true,
      data: customers
    })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/customers - Create new customer
export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    const customerService = new CustomerService()
    
    console.log('Creating customer with data:', {
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
      userId: user.id
    })
    
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
    
    // Handle specific error cases
    if (errorMessage.includes('already exists')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 409 }
      )
    }
    
    if (errorMessage.includes('Account code already exists')) {
      // This is a known issue with AR account creation, provide helpful message
      return NextResponse.json(
        { error: 'Unable to create customer account. Please try again.' },
        { status: 500 }
      )
    }
    
    if (errorMessage.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create customer', details: errorMessage },
      { status: 500 }
    )
  }
}