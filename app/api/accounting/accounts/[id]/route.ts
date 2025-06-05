import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { ChartOfAccountsService } from '@/lib/services/accounting/chart-of-accounts.service'
import { 
  AccountStatus 
} from '@/lib/generated/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/accounting/accounts/[id] - Get specific account
export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const _user = await getUserFromRequest(request)
    const params = await context.params
    const chartOfAccountsService = new ChartOfAccountsService()
    const account = await chartOfAccountsService.getAccount(params.id)

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: account
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/accounting/accounts/[id] - Update account
export async function PUT(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const _user = await getUserFromRequest(request)
    const params = await context.params
    const body = await _request.json()
    const { name, description, status } = body

    const updateData: Record<string, unknown> = {}
    
    if (name !== undefined) {
      updateData.name = name
    }
    
    if (description !== undefined) {
      updateData.description = description
    }
    
    if (status !== undefined) {
      if (!Object.values(AccountStatus).includes(status)) {
        return NextResponse.json(
          { error: 'Invalid account status' },
          { status: 400 }
        )
      }
      updateData.status = status
    }

    const chartOfAccountsService = new ChartOfAccountsService()
    const account = await chartOfAccountsService.updateAccount(
      params.id,
      updateData,
      _user.id
    )

    return NextResponse.json({
      success: true,
      data: account
    })
  } catch (error: unknown) {
    console.error('Error updating account:', error)
    
    if (error instanceof Error && error instanceof Error ? error.message : String(error) === 'Account not found') {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }
    
    if (error instanceof Error && error instanceof Error ? error.message : String(error) === 'System accounts cannot be modified') {
      return NextResponse.json(
        { error: 'System accounts cannot be modified' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    )
  }
}