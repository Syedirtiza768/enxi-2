import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { FinancialStatementsService } from '@/lib/services/accounting/financial-statements.service'

// GET /api/accounting/reports/income-statement - Generate income statement
export async function GET(_request: NextRequest) {
  try {
    const _user = await getUserFromRequest(request)
    const searchParams = request.nextUrl.searchParams
    
    const fromDateParam = searchParams.get('fromDate')
    const toDateParam = searchParams.get('toDate')
    const currency = searchParams.get('currency') || 'USD'
    
    if (!fromDateParam || !toDateParam) {
      return NextResponse.json(
        { error: 'fromDate and toDate parameters are required' },
        { status: 400 }
      )
    }

    const fromDate = new Date(fromDateParam)
    const toDate = new Date(toDateParam)
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    if (fromDate >= toDate) {
      return NextResponse.json(
        { error: 'fromDate must be before toDate' },
        { status: 400 }
      )
    }

    const financialStatementsService = new FinancialStatementsService()
    const incomeStatement = await financialStatementsService.generateIncomeStatement(fromDate, toDate, currency)

    return NextResponse.json({
      success: true,
      data: incomeStatement
    })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}