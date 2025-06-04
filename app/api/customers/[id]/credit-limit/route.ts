import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { CustomerService } from '@/lib/services/customer.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/customers/[id]/credit-limit - Update customer credit limit
export async function PUT(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const user = await getUserFromRequest(request)
    const params = await context.params
    const body = await request.json()
    
    const { creditLimit } = body

    if (typeof creditLimit !== 'number' || creditLimit < 0) {
      return NextResponse.json(
        { error: 'Valid credit limit is required' },
        { status: 400 }
      )
    }

    const customerService = new CustomerService()
    const customer = await customerService.updateCreditLimit(
      params.id,
      creditLimit,
      user.id
    )

    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Credit limit updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating credit limit:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    if (error.message?.includes('below current used credit')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update credit limit' },
      { status: 500 }
    )
  }
}