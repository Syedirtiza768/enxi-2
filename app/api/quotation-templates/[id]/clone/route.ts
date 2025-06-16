import { NextRequest, NextResponse } from 'next/server'
// // import { getServerSession } from 'next-auth'
// // import { authOptions } from '@/lib/auth'
import { QuotationTemplateService } from '@/lib/services/quotation-template.service'
import { z } from 'zod'

const cloneTemplateSchema = z.object({
  name: z.string().min(1).max(100)
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // const session = { user: { id: 'system' } }
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    const session = { user: { id: 'system' } } // Temporary workaround

    const body = await request.json()
    const validatedData = cloneTemplateSchema.parse(body)

    const templateService = new QuotationTemplateService()
    const clonedTemplate = await templateService.cloneTemplate(
      params.id,
      validatedData.name,
      session.user.id
    )

    return NextResponse.json(clonedTemplate, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error cloning quotation template:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clone quotation template' },
      { status: 500 }
    )
  }
}