import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { FinancialStatementsService } from '@/lib/services/accounting/financial-statements.service'

// GET /api/accounting/reports/balance-sheet - Generate balance sheet
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    const searchParams = request.nextUrl.searchParams
    
    const asOfDateParam = searchParams.get('asOfDate')
    const currency = searchParams.get('currency') || 'USD'
    
    if (!asOfDateParam) {
      return NextResponse.json(
        { error: 'asOfDate parameter is required' },
        { status: 400 }
      )
    }

    const asOfDate = new Date(asOfDateParam)
    if (isNaN(asOfDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid asOfDate format' },
        { status: 400 }
      )
    }

    const financialStatementsService = new FinancialStatementsService()
    const balanceSheet = await financialStatementsService.generateBalanceSheet(asOfDate, currency)

    return NextResponse.json({
      success: true,
      data: balanceSheet
    })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}