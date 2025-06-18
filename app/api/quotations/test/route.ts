import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    
    console.log('Test quotation endpoint - received:', body)
    
    // Test database connection
    const salesCase = await prisma.salesCase.findUnique({
      where: { id: body.salesCaseId },
      include: { customer: true }
    })
    
    if (!salesCase) {
      return NextResponse.json({ error: 'Sales case not found' }, { status: 404 })
    }
    
    console.log('Sales case found:', salesCase.caseNumber)
    
    // Try to create a minimal quotation
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber: `QUOT-TEST-${Date.now()}`,
        salesCaseId: salesCase.id,
        validUntil: new Date(body.validUntil),
        paymentTerms: body.paymentTerms || '',
        deliveryTerms: body.deliveryTerms || '',
        notes: body.notes || '',
        internalNotes: body.internalNotes || '',
        createdBy: 'system',
        status: 'DRAFT',
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: 0
      }
    })
    
    console.log('Quotation created:', quotation.id)
    
    return NextResponse.json({
      success: true,
      data: quotation
    })
  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({
      error: 'Test endpoint failed',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    // Test database connection
    const count = await prisma.quotation.count()
    return NextResponse.json({
      success: true,
      message: 'Test endpoint working',
      quotationCount: count
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}