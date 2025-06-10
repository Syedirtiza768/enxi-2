import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { CustomerService } from '@/lib/services/customer.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/leads/[id]/convert - Convert lead to customer
export async function POST(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const _user = await getUserFromRequest(request)
    const params = await context.params
    const body = await request.json()
    
    const customerService = new CustomerService()
    const customer = await customerService.convertLeadToCustomer(
      params.id,
      body,
      _user.id
    )

    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Lead successfully converted to customer'
    })
  } catch (error: unknown) {
    console.error('Error converting lead to customer:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }

    if (error instanceof Error ? error.message : String(error)?.includes('already been converted')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }

    if (error instanceof Error ? error.message : String(error)?.includes('already exists')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to convert lead to customer' },
      { status: 500 }
    )
  }
}