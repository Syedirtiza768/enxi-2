import { NextRequest, NextResponse } from 'next/server'
// // import { getServerSession } from 'next-auth'
// // import { authOptions } from '@/lib/auth'
import { SalesOrderService } from '@/lib/services/sales-order.service'
import { z } from 'zod'

const createOrderFromTemplateSchema = z.object({
  templateId: z.string().min(1),
  salesCaseId: z.string().min(1),
  customerPO: z.string().optional(),
  requestedDate: z.string().datetime().optional(),
  promisedDate: z.string().datetime().optional(),
  shippingAddress: z.string().optional(),
  billingAddress: z.string().optional(),
  notes: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = { user: { id: 'system' } }
    // const session = { user: { id: 'system' } }
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const validatedData = createOrderFromTemplateSchema.parse(body)

    const salesOrderService = new SalesOrderService()
    const salesOrder = await salesOrderService.createSalesOrderFromTemplate(
      validatedData.templateId,
      {
        salesCaseId: validatedData.salesCaseId,
        customerPO: validatedData.customerPO,
        requestedDate: validatedData.requestedDate ? new Date(validatedData.requestedDate) : undefined,
        promisedDate: validatedData.promisedDate ? new Date(validatedData.promisedDate) : undefined,
        shippingAddress: validatedData.shippingAddress,
        billingAddress: validatedData.billingAddress,
        notes: validatedData.notes,
        createdBy: session.user.id
      }
    )

    return NextResponse.json(salesOrder, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating sales order from template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create sales order from template' },
      { status: 500 }
    )
  }
}