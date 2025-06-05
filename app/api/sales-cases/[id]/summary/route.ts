import { NextRequest, NextResponse } from 'next/server'
import { SalesCaseService } from '@/lib/services/sales-case.service'

const salesCaseService = new SalesCaseService()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const summary = await salesCaseService.getSalesCaseSummary(params.id)
    
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error getting sales case summary:', error)
    return NextResponse.json(
      { error: 'Failed to get sales case summary' },
      { status: 500 }
    )
  }
}