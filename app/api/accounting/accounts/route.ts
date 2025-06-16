import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { ChartOfAccountsService } from '@/lib/services/accounting/chart-of-accounts.service'
import { 
  AccountType, 
  AccountStatus 
} from '@/lib/generated/prisma'

// GET /api/accounting/accounts - List all accounts with filtering
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const chartOfAccountsService = new ChartOfAccountsService()
    const searchParams = request.nextUrl.searchParams
    
    const options: {
      type?: AccountType
      status?: AccountStatus
      currency?: string
    } = {}

    const type = searchParams.get('type')
    if (type && Object.values(AccountType).includes(type as AccountType)) {
      options.type = type as AccountType
    }

    const status = searchParams.get('status')
    if (status && Object.values(AccountStatus).includes(status as AccountStatus)) {
      options.status = status as AccountStatus
    }

    const currency = searchParams.get('currency')
    if (currency) {
      options.currency = currency
    }

    const accounts = await chartOfAccountsService.getAllAccounts(options)

    return NextResponse.json({
      success: true,
      data: accounts
    })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}

// POST /api/accounting/accounts - Create new account
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const body = await request.json()
    const { code, name, type, currency, description, parentId } = body

    // Validate required fields
    if (!code || !name || !type) {
      return NextResponse.json(
        { error: 'Code, name, and type are required' },
        { status: 400 }
      )
    }

    if (!Object.values(AccountType).includes(type)) {
      return NextResponse.json(
        { error: 'Invalid account type' },
        { status: 400 }
      )
    }

    const chartOfAccountsService = new ChartOfAccountsService()
    const account = await chartOfAccountsService.createAccount({
      code,
      name,
      type,
      currency: currency || 'USD',
      description,
      parentId,
      createdBy: session.user.id
    })

    return NextResponse.json({
      success: true,
      data: account
    })
  } catch (error: unknown) {
    console.error('Error creating account:', error)
    
    if (error instanceof Error ? error.message : String(error) === 'Account code already exists') {
      return NextResponse.json(
        { error: 'Account code already exists' },
        { status: 400 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error) === 'Parent account not found') {
      return NextResponse.json(
        { error: 'Parent account not found' },
        { status: 404 }
      )
    }
    
    if (error instanceof Error ? error.message : String(error) === 'Account type must match parent account type') {
      return NextResponse.json(
        { error: 'Account type must match parent account type' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
}
}