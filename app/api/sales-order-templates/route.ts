import { NextRequest, NextResponse } from 'next/server'
// // import { getServerSession } from 'next-auth'
// // import { authOptions } from '@/lib/auth'
import { SalesOrderTemplateService } from '@/lib/services/sales-order-template.service'
import { CreateOrderTemplateInput } from '@/lib/services/sales-order-template.service'
import { z } from 'zod'

const templateItemSchema = z.object({
  lineNumber: z.number().min(1),
  lineDescription: z.string().optional(),
  isLineHeader: z.boolean(),
  itemType: z.enum(['PRODUCT', 'SERVICE']),
  itemId: z.string().optional(),
  itemCode: z.string().min(1),
  description: z.string().min(1),
  internalDescription: z.string().optional(),
  defaultQuantity: z.number().positive(),
  defaultUnitPrice: z.number().min(0),
  unitOfMeasureId: z.string().optional(),
  defaultDiscount: z.number().min(0).max(100).optional(),
  defaultTaxRate: z.number().min(0).max(100).optional(),
  taxRateId: z.string().optional(),
  sortOrder: z.number().optional()
})

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  paymentTerms: z.string().optional(),
  shippingTerms: z.string().optional(),
  shippingAddress: z.string().optional(),
  billingAddress: z.string().optional(),
  notes: z.string().optional(),
  defaultLeadDays: z.number().min(1).max(365).optional(),
  items: z.array(templateItemSchema).min(1)
})

export async function GET(request: NextRequest) {
  try {
    const session = { user: { id: 'system' } }
    // const session = { user: { id: 'system' } }
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive') === 'true'
    const search = searchParams.get('search') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined

    const templateService = new SalesOrderTemplateService()
    const templates = await templateService.getAllTemplates({
      isActive,
      search,
      limit,
      offset
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching sales order templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales order templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = { user: { id: 'system' } }
    // const session = { user: { id: 'system' } }
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const validatedData = createTemplateSchema.parse(body)

    const templateService = new SalesOrderTemplateService()
    const template = await templateService.createTemplate({
      ...validatedData,
      createdBy: session.user.id
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating sales order template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create sales order template' },
      { status: 500 }
    )
  }
}