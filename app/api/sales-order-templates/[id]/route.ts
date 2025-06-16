import { NextRequest, NextResponse } from 'next/server'
// // import { getServerSession } from 'next-auth'
// // import { authOptions } from '@/lib/auth'
import { SalesOrderTemplateService } from '@/lib/services/sales-order-template.service'
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

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  paymentTerms: z.string().optional(),
  shippingTerms: z.string().optional(),
  shippingAddress: z.string().optional(),
  billingAddress: z.string().optional(),
  notes: z.string().optional(),
  defaultLeadDays: z.number().min(1).max(365).optional(),
  items: z.array(templateItemSchema).min(1).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = { user: { id: 'system' } }
    // const session = { user: { id: 'system' } }
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const templateService = new SalesOrderTemplateService()
    const template = await templateService.getTemplate(params.id)

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error fetching sales order template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales order template' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = { user: { id: 'system' } }
    // const session = { user: { id: 'system' } }
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const validatedData = updateTemplateSchema.parse(body)

    const templateService = new SalesOrderTemplateService()
    const template = await templateService.updateTemplate(params.id, validatedData)

    return NextResponse.json(template)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating sales order template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update sales order template' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = { user: { id: 'system' } }
    // const session = { user: { id: 'system' } }
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const templateService = new SalesOrderTemplateService()
    await templateService.deleteTemplate(params.id)

    return NextResponse.json({ message: 'Template deleted successfully' })
  } catch (error) {
    console.error('Error deleting sales order template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete sales order template' },
      { status: 500 }
    )
  }
}