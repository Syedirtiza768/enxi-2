import { NextRequest, NextResponse } from 'next/server'
import { CustomerPOService } from '@/lib/services/customer-po.service'
import { z } from 'zod'

const updateCustomerPOSchema = z.object({
  poAmount: z.number().positive().optional(),
  currency: z.string().optional(),
  attachmentUrl: z.string().optional(),
  notes: z.string().optional()
})

const customerPOService = new CustomerPOService()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerPO = await customerPOService.getCustomerPO(params.id)
    
    if (!customerPO) {
      return NextResponse.json(
        { error: 'Customer PO not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(customerPO)
  } catch (error) {
    console.error('Error getting customer PO:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to get customer PO' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const body = await request.json()
    const data = updateCustomerPOSchema.parse(body)
    
    const customerPO = await customerPOService.updateCustomerPO(
      params.id,
      { ...data, updatedBy: userId }
    )
    
    return NextResponse.json(customerPO)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating customer PO:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update customer PO' },
      { status: 500 }
    )
  }
}