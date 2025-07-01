import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    
    console.log('Test Invoice Endpoint - Received data:', JSON.stringify({
      hasBody: !!body,
      customerId: body.customerId,
      dueDate: body.dueDate,
      itemCount: body.items?.length,
      firstItem: body.items?.[0],
      allKeys: Object.keys(body)
    }, null, 2))
    
    // Basic validation
    const errors = []
    
    if (!body.customerId) errors.push('customerId is required')
    if (!body.dueDate) errors.push('dueDate is required')
    if (!body.items || body.items.length === 0) errors.push('items array is required and must not be empty')
    
    // Check first item structure
    if (body.items && body.items.length > 0) {
      const firstItem = body.items[0]
      const requiredItemFields = ['lineNumber', 'isLineHeader', 'itemType', 'itemCode', 'description', 'quantity', 'unitPrice', 'sortOrder']
      const missingFields = requiredItemFields.filter(field => firstItem[field] === undefined)
      
      if (missingFields.length > 0) {
        errors.push(`First item missing fields: ${missingFields.join(', ')}`)
      }
    }
    
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test validation passed',
      receivedData: {
        customerId: body.customerId,
        dueDate: body.dueDate,
        itemCount: body.items.length
      }
    })
    
  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test endpoint error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}