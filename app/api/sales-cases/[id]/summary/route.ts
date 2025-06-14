import { NextRequest, NextResponse } from 'next/server'
import { SalesCaseService } from '@/lib/services/sales-case.service'

const salesCaseService = new SalesCaseService()

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const summary = await salesCaseService.getSalesCaseSummary(resolvedParams.id)
    
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error getting sales case summary:', error)
    return NextResponse.json(
      { error: 'Failed to get sales case summary' },
      { status: 500 }
    )
  }
}