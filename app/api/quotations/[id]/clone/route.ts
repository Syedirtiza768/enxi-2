import { NextRequest, NextResponse } from 'next/server'
// // import { getUserFromRequest } from '@/lib/auth/server-auth'
import { QuotationService } from '@/lib/services/quotation.service'
import { withCrudAudit } from '@/lib/middleware/audit.middleware'
import { EntityType } from '@/lib/validators/audit.validator'

const postHandler = async (
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> => {
  try {
    // Authenticate user
    const session = { user: { id: 'system' } }
    // const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const quotationService = new QuotationService()
    
    // Clone the quotation
    const clonedQuotation = await quotationService.cloneQuotation(
      params.id,
session.user.id
    )

    return NextResponse.json({
      success: true,
      data: clonedQuotation
    }, { status: 201 })
  } catch (error) {
    console.error('Error cloning quotation:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Handle specific error cases
    if (errorMessage.includes('not found')) {
      return NextResponse.json(
        { 
          error: 'Quotation not found',
          code: 'QUOTATION_NOT_FOUND',
          message: 'The specified quotation does not exist.'
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to clone quotation',
        code: 'CLONE_QUOTATION_ERROR',
        message: 'Unable to clone the quotation. Please try again.',
        context: {
          operation: 'clone_quotation',
          quotationId: params.id,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

export const POST = withCrudAudit(postHandler, EntityType.QUOTATION, 'create', {
  entityIdField: 'id',
  metadata: { operation: 'clone_quotation' }
})