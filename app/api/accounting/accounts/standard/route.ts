import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { ChartOfAccountsService } from '@/lib/services/accounting/chart-of-accounts.service'

// POST /api/accounting/accounts/standard - Create standard COA
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const body = await request.json()
    const { currency = 'USD' } = body

    const chartOfAccountsService = new ChartOfAccountsService()
    
    // Check if accounts already exist
    const existingAccounts = await chartOfAccountsService.getAllAccounts()
    if (existingAccounts.length > 0) {
      return NextResponse.json(
        { error: 'Chart of accounts already exists' },
        { status: 400 }
      )
    }

    await chartOfAccountsService.createStandardCOA(currency, session.user.id)

    // Return the created accounts
    const accounts = await chartOfAccountsService.getAllAccounts()

    return NextResponse.json({
      success: true,
      message: 'Standard chart of accounts created successfully',
      data: accounts
    })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to create standard chart of accounts' },
      { status: 500 }
    )
}
}