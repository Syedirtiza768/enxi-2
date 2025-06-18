import { NextRequest, NextResponse } from 'next/server'
import { QuotationService } from '@/lib/services/quotation.service'
import { prisma } from '@/lib/db/prisma'

export async function POST(request: NextRequest) {
  try {
    console.log('=== TEST CREATE QUOTATION ENDPOINT ===')
    
    // Get request body
    let body
    try {
      body = await request.json()
      console.log('Request body:', JSON.stringify(body, null, 2))
    } catch (parseError) {
      console.error('Failed to parse body:', parseError)
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    
    // Check if sales case exists
    if (body.salesCaseId) {
      console.log('Checking sales case:', body.salesCaseId)
      const salesCase = await prisma.salesCase.findUnique({
        where: { id: body.salesCaseId },
        include: { customer: true }
      })
      console.log('Sales case found:', !!salesCase)
      console.log('Sales case status:', salesCase?.status)
      console.log('Has customer:', !!salesCase?.customer)
      
      if (!salesCase) {
        return NextResponse.json({ 
          error: 'Sales case not found',
          salesCaseId: body.salesCaseId 
        }, { status: 404 })
      }
    }
    
    // Create minimal quotation data
    const minimalData = {
      salesCaseId: body.salesCaseId,
      createdBy: 'system',
      items: body.items || [{
        lineNumber: 1,
        isLineHeader: false,
        itemType: 'PRODUCT',
        itemCode: 'TEST-001',
        description: 'Test Item',
        quantity: 1,
        unitPrice: 100,
        discount: 0,
        taxRate: 0
      }]
    }
    
    console.log('Creating quotation with minimal data:', JSON.stringify(minimalData, null, 2))
    
    // Try to create quotation
    const quotationService = new QuotationService()
    const result = await quotationService.createQuotation(minimalData)
    
    console.log('Quotation created successfully:', result.id)
    
    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        quotationNumber: result.quotationNumber
      }
    })
    
  } catch (error) {
    console.error('=== ERROR IN TEST CREATE ===')
    console.error('Error:', error)
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : undefined)
    
    return NextResponse.json({
      error: 'Test create failed',
      message: error instanceof Error ? error.message : String(error),
      type: error?.constructor?.name,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test create endpoint is working',
    usage: 'POST /api/quotations/test-create with { salesCaseId: "..." }'
  })
}