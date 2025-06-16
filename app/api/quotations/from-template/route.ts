import { NextRequest, NextResponse } from 'next/server'
// // import { getServerSession } from 'next-auth'
// // import { authOptions } from '@/lib/auth'
import { QuotationService } from '@/lib/services/quotation.service'
import { z } from 'zod'

const createFromTemplateSchema = z.object({
  templateId: z.string().min(1),
  salesCaseId: z.string().min(1),
  overrides: z.object({
    validUntil: z.string().datetime().optional(),
    paymentTerms: z.string().optional(),
    deliveryTerms: z.string().optional(),
    notes: z.string().optional(),
    internalNotes: z.string().optional(),
    items: z.array(z.object({
      lineNumber: z.number(),
      lineDescription: z.string().optional(),
      isLineHeader: z.boolean(),
      itemType: z.enum(['PRODUCT', 'SERVICE']),
      itemId: z.string().optional(),
      itemCode: z.string(),
      description: z.string(),
      internalDescription: z.string().optional(),
      quantity: z.number().positive(),
      unitPrice: z.number().min(0),
      unitOfMeasureId: z.string().optional(),
      cost: z.number().min(0).optional(),
      discount: z.number().min(0).max(100).optional(),
      taxRate: z.number().min(0).max(100).optional(),
      taxRateId: z.string().optional(),
      sortOrder: z.number().optional()
    })).optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    // const session = { user: { id: 'system' } }
    // const session = await getServerSession(authOptions)
    const session = { user: { id: 'system' } }
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createFromTemplateSchema.parse(body)

    const quotationService = new QuotationService()
    const quotation = await quotationService.createQuotationFromTemplate(
      validatedData.templateId,
      validatedData.salesCaseId,
      session.user.id,
      validatedData.overrides
    )

    return NextResponse.json(quotation, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating quotation from template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create quotation from template' },
      { status: 500 }
    )
  }
}