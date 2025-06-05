import { NextRequest, NextResponse } from 'next/server'
import { CustomerPOService } from '@/lib/services/customer-po.service'
import { z } from 'zod'

const createCustomerPOSchema = z.object({
  poNumber: z.string(),
  customerId: z.string(),
  quotationId: z.string(),
  poDate: z.string().datetime(),
  poAmount: z.number().positive(),
  currency: z.string().optional(),
  attachmentUrl: z.string().optional(),
  notes: z.string().optional()
})

const customerPOService = new CustomerPOService()

export async function GET(_request: NextRequest) {
  try {
    const { searchParams } = new URL(_request.url)
    
    const filters: unknown = {}
    
    const customerId = searchParams.get('customerId')
    if (customerId) filters.customerId = customerId
    
    const quotationId = searchParams.get('quotationId')
    if (quotationId) filters.quotationId = quotationId
    
    const salesCaseId = searchParams.get('salesCaseId')
    if (salesCaseId) filters.salesCaseId = salesCaseId
    
    const isAccepted = searchParams.get('isAccepted')
    if (isAccepted !== null) filters.isAccepted = isAccepted === 'true'
    
    const dateFrom = searchParams.get('dateFrom')
    if (dateFrom) filters.dateFrom = new Date(dateFrom)
    
    const dateTo = searchParams.get('dateTo')
    if (dateTo) filters.dateTo = new Date(dateTo)
    
    const customerPOs = await customerPOService.getAllCustomerPOs(filters)
    
    return NextResponse.json(customerPOs)
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to get customer POs' },
      { status: 500 }
    )
  }
}

export async function POST(_request: NextRequest) {
  try {
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const body = await _request.json()
    const data = createCustomerPOSchema.parse(body)
    
    const customerPO = await customerPOService.createCustomerPO({
      ...data,
      poDate: new Date(data.poDate),
      createdBy: userId
    })
    
    return NextResponse.json(customerPO, { status: 201 })
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 400 }
    )
  }
}