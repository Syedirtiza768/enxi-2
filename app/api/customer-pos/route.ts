import { NextRequest, NextResponse } from 'next/server'
import { CustomerPOService } from '@/lib/services/customer-po.service'
import { z } from 'zod'

const createCustomerPOSchema = z.object({
  poNumber: z.string(),
  customerId: z.string(),
  quotationId: z.string().optional(),
  poDate: z.string(), // Accept any date string format
  poAmount: z.number().positive(),
  currency: z.string().optional(),
  attachmentUrl: z.string().optional(),
  notes: z.string().optional()
})

const customerPOService = new CustomerPOService()

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const body = await request.json()
    
    // Validate the request data
    const validationResult = createCustomerPOSchema.safeParse(body)
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error)
      return NextResponse.json(
        { 
          error: 'Validation error', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }
    
    const data = validationResult.data
    
    // Parse the date - handle both date-only and datetime formats
    let poDate: Date
    try {
      poDate = new Date(data.poDate)
      if (isNaN(poDate.getTime())) {
        throw new Error('Invalid date format')
      }
    } catch (dateError) {
      console.error('Date parsing error:', dateError)
      return NextResponse.json(
        { error: 'Invalid date format. Please provide a valid date.' },
        { status: 400 }
      )
    }
    
    const customerPO = await customerPOService.createCustomerPO({
      ...data,
      poDate,
      createdBy: userId
    })
    
    return NextResponse.json(customerPO, { status: 201 })
  } catch (error) {
    console.error('Customer PO creation error:', error)
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('PO number already exists')) {
        return NextResponse.json(
          { error: 'PO number already exists. Please use a different number.' },
          { status: 409 }
        )
      }
      if (error.message.includes('Quotation not found')) {
        return NextResponse.json(
          { error: 'The specified quotation was not found.' },
          { status: 404 }
        )
      }
      if (error.message.includes('Quotation does not belong to this customer')) {
        return NextResponse.json(
          { error: 'The quotation does not belong to the selected customer.' },
          { status: 400 }
        )
      }
      if (error.message.includes('Quotation must be sent')) {
        return NextResponse.json(
          { error: 'The quotation must be sent to the customer before creating a PO.' },
          { status: 400 }
        )
      }
      
      // Log the full error for debugging
      console.error('Unhandled error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    return NextResponse.json(
      { error: 'Failed to create customer PO. Please try again or contact support.' },
      { status: 500 }
    )
  }
}