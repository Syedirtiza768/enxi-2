import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('Minimal quotation endpoint - start')
  
  try {
    const body = await request.json()
    console.log('Body received')
    
    // Test if we can access prisma
    console.log('Testing prisma connection...')
    const count = await prisma.quotation.count()
    console.log('Current quotation count:', count)
    
    // Try to create a quotation directly with prisma
    console.log('Creating quotation...')
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber: `QUOT-MIN-${Date.now()}`,
        salesCaseId: body.salesCaseId,
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
        totalAmount: 0,
        version: 1
      }
    })
    
    console.log('Quotation created:', quotation.id)
    
    // Add items if provided
    if (body.items && body.items.length > 0) {
      console.log('Creating items...')
      for (const item of body.items) {
        await prisma.quotationItem.create({
          data: {
            quotationId: quotation.id,
            lineNumber: item.lineNumber || 1,
            lineDescription: item.lineDescription || '',
            isLineHeader: item.isLineHeader || false,
            itemType: item.itemType || 'PRODUCT',
            itemCode: item.itemCode || 'ITEM',
            description: item.description || 'Item',
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            discount: item.discount || 0,
            taxRate: item.taxRate || 0,
            subtotal: 0,
            discountAmount: 0,
            taxAmount: 0,
            totalAmount: 0,
            sortOrder: item.sortOrder || 0
          }
        })
      }
    }
    
    console.log('Success!')
    
    return NextResponse.json({
      success: true,
      data: quotation
    })
    
  } catch (error) {
    console.error('Minimal endpoint error:', error)
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown')
    
    return NextResponse.json({
      error: 'Failed in minimal endpoint',
      message: error instanceof Error ? error.message : String(error),
      type: error?.constructor?.name
    }, { status: 500 })
  }
}