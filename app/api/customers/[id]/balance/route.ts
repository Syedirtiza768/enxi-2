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
    const _user = await getUserFromRequest(request)
    const params = await context.params
    const customerService = new CustomerService()
    
    const balanceInfo = await customerService.getCustomerBalance(params.id)

    return NextResponse.json({
      success: true,
      data: balanceInfo
    })
  } catch (error: unknown) {
    console.error('Error fetching customer balance:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch customer balance' },
      { status: 500 }
    )
  }
}