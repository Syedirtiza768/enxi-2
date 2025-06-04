import { NextRequest, NextResponse } from 'next/server'
import { CustomerPOService } from '@/lib/services/customer-po.service'
import { z } from 'zod'

const validateAmountSchema = z.object({
  quotationId: z.string(),
  poAmount: z.number().positive(),
  tolerance: z.number().min(0).max(1).optional()
})

const customerPOService = new CustomerPOService()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { quotationId, poAmount, tolerance } = validateAmountSchema.parse(body)
    
    const validation = await customerPOService.validatePOAmount(
      quotationId,
      poAmount,
      tolerance
    )
    
    return NextResponse.json(validation)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error validating PO amount:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to validate PO amount' },
      { status: 500 }
    )
  }
}