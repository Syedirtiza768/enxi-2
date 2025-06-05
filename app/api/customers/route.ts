import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { CustomerService } from '@/lib/services/customer.service'

// GET /api/customers - List all customers with search
export async function GET(_request: NextRequest) {
  try {
    const _user = await getUserFromRequest(request)
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
export async function POST(_request: NextRequest) {
  try {
    const _user = await getUserFromRequest(request)
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
      createdBy: _user.id
    })

    return NextResponse.json({
      success: true,
      data: customer
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating customer:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('already exists')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    )
  }
}