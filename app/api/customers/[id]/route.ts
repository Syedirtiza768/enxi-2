import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { CustomerService } from '@/lib/services/customer.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/customers/[id] - Get specific customer
export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const user = await getUserFromRequest(request)
    const params = await context.params
    const customerService = new CustomerService()
    const customer = await customerService.getCustomer(params.id)

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: customer
    })
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    )
  }
}

// PUT /api/customers/[id] - Update customer
export async function PUT(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const user = await getUserFromRequest(request)
    const params = await context.params
    const body = await request.json()
    
    const customerService = new CustomerService()
    const customer = await customerService.updateCustomer(
      params.id,
      body,
      user.id
    )

    return NextResponse.json({
      success: true,
      data: customer
    })
  } catch (error: any) {
    console.error('Error updating customer:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    if (error.message?.includes('already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}