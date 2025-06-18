import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { CustomerService } from '@/lib/services/customer.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/customers/[id]/credit-check - Perform credit check for customer
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { id } = await params
    const customerService = new CustomerService()
    
    const creditCheck = await customerService.performCreditCheck(id)

    return NextResponse.json({
      success: true,
      data: creditCheck
    })
  } catch (error: unknown) {
    console.error('Error performing credit check:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to perform credit check' },
      { status: 500 }
    )
  }
}