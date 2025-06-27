import { NextRequest, NextResponse } from 'next/server'
import { CustomerPOService } from '@/lib/services/customer-po.service'
import { z } from 'zod'

const acceptPOSchema = z.object({
  createSalesOrder: z.boolean().default(true)
})

const customerPOService = new CustomerPOService()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const { id } = await params
    
    // Handle empty body case
    let body = {}
    try {
      const contentType = request.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        body = await request.json()
      }
    } catch (parseError) {
      // If body parsing fails, use default values
      console.warn('Failed to parse request body, using defaults:', parseError)
    }
    
    const { createSalesOrder } = acceptPOSchema.parse(body)
    
    const result = await customerPOService.acceptCustomerPO(
      id,
      userId,
      createSalesOrder
    )
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error accepting customer PO:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    let errorMessage = 'Internal server error'
    let statusCode = 500
    
    if (error instanceof Error) {
      errorMessage = error.message
      
      // Set appropriate status codes based on error messages
      if (error.message.includes('not found')) {
        statusCode = 404
      } else if (error.message.includes('already been accepted') || 
                 error.message.includes('Only accepted quotations')) {
        statusCode = 400
      } else if (error.message.includes('Cannot read properties')) {
        // Handle undefined property access errors
        errorMessage = `Missing required data: ${error.message}`
        statusCode = 400
      }
    }
    
    // Add more detailed error info in development
    const errorDetails = process.env.NODE_ENV === 'development' 
      ? { error: errorMessage, details: error instanceof Error ? error.stack : undefined }
      : { error: errorMessage }
    
    return NextResponse.json(
      errorDetails,
      { status: statusCode }
    )
  }
}