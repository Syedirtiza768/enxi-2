import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function POST(request: NextRequest) {
  console.log('=== DEBUG CREATE QUOTATION - DIRECT ===')
  
  try {
    // Parse body
    const body = await request.json()
    console.log('Body received:', JSON.stringify(body, null, 2))
    
    // Check database connection
    console.log('Testing database connection...')
    const testQuery = await prisma.salesCase.findFirst()
    console.log('Database connection OK, found sales case:', !!testQuery)
    
    // Check if sales case exists
    if (!body.salesCaseId) {
      return NextResponse.json({ 
        error: 'salesCaseId is required',
        received: body 
      }, { status: 400 })
    }
    
    console.log('Checking sales case:', body.salesCaseId)
    const salesCase = await prisma.salesCase.findUnique({
      where: { id: body.salesCaseId },
      include: { customer: true }
    })
    
    if (!salesCase) {
      return NextResponse.json({ 
        error: 'Sales case not found',
        salesCaseId: body.salesCaseId 
      }, { status: 404 })
    }
    
    console.log('Sales case found:', {
      id: salesCase.id,
      caseNumber: salesCase.caseNumber,
      status: salesCase.status,
      hasCustomer: !!salesCase.customer
    })
    
    // Generate quotation number
    const quotationNumber = `QUOT-${Date.now()}`
    console.log('Generated quotation number:', quotationNumber)
    
    // Create minimal quotation directly
    console.log('Creating quotation in database...')
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        salesCaseId: body.salesCaseId,
        version: 1,
        status: 'DRAFT',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        subtotal: 100,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: 100,
        createdBy: 'system',
        items: {
          create: [{
            lineNumber: 1,
            isLineHeader: false,
            itemType: 'PRODUCT',
            itemCode: 'TEST-001',
            description: 'Test Item',
            quantity: 1,
            unitPrice: 100,
            discount: 0,
            taxRate: 0,
            subtotal: 100,
            discountAmount: 0,
            taxAmount: 0,
            totalAmount: 100,
            sortOrder: 0
          }]
        }
      },
      include: {
        items: true
      }
    })
    
    console.log('Quotation created successfully:', {
      id: quotation.id,
      quotationNumber: quotation.quotationNumber,
      itemCount: quotation.items.length
    })
    
    return NextResponse.json({
      success: true,
      data: quotation,
      debug: {
        salesCaseStatus: salesCase.status,
        hasCustomer: !!salesCase.customer,
        itemsCreated: quotation.items.length
      }
    })
    
  } catch (error) {
    console.error('=== ERROR IN DEBUG CREATE ===')
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : undefined)
    
    // Check if it's a Prisma error
    if (error?.code) {
      console.error('Prisma error code:', error.code)
      console.error('Prisma error meta:', error.meta)
    }
    
    return NextResponse.json({
      error: 'Debug create failed',
      message: error instanceof Error ? error.message : String(error),
      type: error?.constructor?.name,
      code: error?.code,
      meta: error?.meta,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function GET() {
  // Test database connection
  try {
    const count = await prisma.salesCase.count()
    const openCases = await prisma.salesCase.findMany({
      where: { status: 'OPEN' },
      take: 5,
      include: { customer: true }
    })
    
    return NextResponse.json({
      message: 'Debug create endpoint ready',
      database: 'connected',
      totalSalesCases: count,
      openSalesCases: openCases.map(sc => ({
        id: sc.id,
        caseNumber: sc.caseNumber,
        status: sc.status,
        hasCustomer: !!sc.customer
      })),
      usage: 'POST /api/quotations/debug-create with { salesCaseId: "..." }'
    })
  } catch (error) {
    return NextResponse.json({
      message: 'Debug endpoint error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}