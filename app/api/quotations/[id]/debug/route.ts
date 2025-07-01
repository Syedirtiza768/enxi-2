import { NextRequest, NextResponse } from 'next/server'
import { QuotationService } from '@/lib/services/quotation.service'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    // Get raw data from database
    const rawQuotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' }
        },
        salesCase: {
          include: {
            customer: true
          }
        }
      }
    })
    
    if (!rawQuotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }
    
    // Get processed data from service
    const quotationService = new QuotationService()
    const internalView = await quotationService.getQuotationInternalView(id)
    const clientView = await quotationService.getQuotationClientView(id)
    
    return NextResponse.json({
      success: true,
      data: {
        raw: {
          id: rawQuotation.id,
          quotationNumber: rawQuotation.quotationNumber,
          itemCount: rawQuotation.items.length,
          items: rawQuotation.items.map(item => ({
            id: item.id,
            lineNumber: item.lineNumber,
            lineDescription: item.lineDescription,
            isLineHeader: item.isLineHeader,
            itemCode: item.itemCode,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }))
        },
        internalView: {
          hasLines: !!internalView.lines,
          lineCount: internalView.lines?.length || 0,
          hasItems: !!internalView.items,
          itemCount: internalView.items?.length || 0,
          lines: internalView.lines?.map((line: any) => ({
            lineNumber: line.lineNumber,
            lineDescription: line.lineDescription,
            itemCount: line.items?.length || 0,
            items: line.items?.map((item: any) => ({
              itemCode: item.itemCode,
              lineDescription: item.lineDescription
            }))
          }))
        },
        clientView: {
          hasLines: !!clientView.lines,
          lineCount: clientView.lines?.length || 0,
          hasItems: !!clientView.items,
          itemCount: clientView.items?.length || 0
        }
      }
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}