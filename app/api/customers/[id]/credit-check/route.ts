import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { CustomerService } from '@/lib/services/customer.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/customers/[id]/credit-check - Perform credit check for customer
export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const user = await getUserFromRequest(request)
    const params = await context.params
    const customerService = new CustomerService()
    
    const creditCheck = await customerService.performCreditCheck(params.id)

    return NextResponse.json({
      success: true,
      data: creditCheck
    })
  } catch (error: any) {
    console.error('Error performing credit check:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to perform credit check' },
      { status: 500 }
    )
  }
}