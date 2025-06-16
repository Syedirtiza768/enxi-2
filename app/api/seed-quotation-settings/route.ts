import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check if settings exist
    let settings = await prisma.companySettings.findFirst()
    
    if (!settings) {
      // Create default settings
      settings = await prisma.companySettings.create({
        data: {
          companyName: 'Your Company Name',
          quotationPrefix: 'QT',
          quotationNumberFormat: 'PREFIX-YYYY-NNNN',
          quotationValidityDays: 30,
          quotationTermsAndConditions: 'Net 30 days',
          quotationFooterNotes: 'Thank you for your business',
          showCompanyLogoOnQuotations: false,
          showTaxBreakdown: true,
          defaultCurrency: 'USD'
        }
      })
      
      return NextResponse.json({
        success: true,
        message: 'Quotation settings created',
        settings
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Quotation settings already exist',
      settings
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}