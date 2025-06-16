import { NextRequest, NextResponse } from 'next/server'
// import { getServerSession } from 'next-auth'
// import { authOptions } from '@/lib/auth'
import { SalesOrderService } from '@/lib/services/sales-order.service'
import { z } from 'zod'

const cloneOrderSchema = z.object({
  salesCaseId: z.string().optional() // Optional - use same sales case if not provided
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = { user: { id: 'system' } }
    // const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = cloneOrderSchema.parse(body)

    const salesOrderService = new SalesOrderService()
    const clonedOrder = await salesOrderService.cloneSalesOrder(
      params.id,
      {
        salesCaseId: validatedData.salesCaseId,
        createdBy: session.user.id
      }
    )

    return NextResponse.json(clonedOrder, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error cloning sales order:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clone sales order' },
      { status: 500 }
    )
  }
}