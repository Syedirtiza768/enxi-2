import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { ChartOfAccountsService } from '@/lib/services/accounting/chart-of-accounts.service'
import { 
  AccountStatus 
} from "@prisma/client"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/accounting/accounts/[id] - Get specific account
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const { id } = await params
    const chartOfAccountsService = new ChartOfAccountsService()
    const account = await chartOfAccountsService.getAccount(id)

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
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const { id } = await params
    const body = await request.json()
    const { code, name, type, currency, description, status, parentId } = body

    const updateData: Record<string, unknown> = {}
    
    if (code !== undefined) {
      updateData.code = code
    }
    
    if (name !== undefined) {
      updateData.name = name
    }
    
    if (type !== undefined) {
      updateData.type = type
    }
    
    if (currency !== undefined) {
      updateData.currency = currency
    }
    
    if (description !== undefined) {
      updateData.description = description
    }
    
    if (parentId !== undefined) {
      updateData.parentId = parentId
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
      id,
      updateData,
      session.user.id
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