import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { ChartOfAccountsService } from '@/lib/services/accounting/chart-of-accounts.service'

// GET /api/accounting/accounts/tree - Get hierarchical account tree
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    const chartOfAccountsService = new ChartOfAccountsService()
    const accountTree = await chartOfAccountsService.getAccountTree()

    return NextResponse.json({
      success: true,
      data: accountTree
    })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account tree' },
      { status: 500 }
    )
}
}