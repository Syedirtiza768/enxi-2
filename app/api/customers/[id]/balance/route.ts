import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { CustomerService } from '@/lib/services/customer.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/customers/[id]/balance - Get customer balance and credit status
export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const user = await getUserFromRequest(request)
    const params = await context.params
    const customerService = new CustomerService()
    
    const balanceInfo = await customerService.getCustomerBalance(params.id)

    return NextResponse.json({
      success: true,
      data: balanceInfo
    })
  } catch (error: any) {
    console.error('Error fetching customer balance:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch customer balance' },
      { status: 500 }
    )
  }
}