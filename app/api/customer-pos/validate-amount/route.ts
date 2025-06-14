import { NextRequest, NextResponse } from 'next/server'
import { CustomerPOService } from '@/lib/services/customer-po.service'
import { z } from 'zod'

const validateAmountSchema = z.object({
  quotationId: z.string(),
  poAmount: z.number().positive(),
  tolerance: z.number().min(0).max(1).optional()
})

const customerPOService = new CustomerPOService()

export async function POST(request: NextRequest): Promise<NextResponse> {
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
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 400 }
    )
  }
}