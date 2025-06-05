import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { TrialBalanceService } from '@/lib/services/accounting/trial-balance.service'

// GET /api/accounting/reports/trial-balance - Generate trial balance
export async function GET(_request: NextRequest) {
  try {
    const _user = await getUserFromRequest(request)
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

    const trialBalanceService = new TrialBalanceService()
    const trialBalance = await trialBalanceService.generateTrialBalance(asOfDate, currency)

    return NextResponse.json({
      success: true,
      data: trialBalance
    })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}