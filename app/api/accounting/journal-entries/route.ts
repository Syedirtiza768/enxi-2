import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { JournalEntryService } from '@/lib/services/accounting/journal-entry.service'
import { JournalStatus } from "@prisma/client"

// GET /api/accounting/journal-entries - List journal entries with filtering
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const journalEntryService = new JournalEntryService()
    const searchParams = request.nextUrl.searchParams
    
    const options: {
      status?: JournalStatus
      dateFrom?: Date
      dateTo?: Date
      accountId?: string
      reference?: string
      limit?: number
      offset?: number
    } = {}

    const status = searchParams.get('status')
    if (status && Object.values(JournalStatus).includes(status as JournalStatus)) {
      options.status = status as JournalStatus
    }

    const dateFrom = searchParams.get('dateFrom')
    if (dateFrom) {
      options.dateFrom = new Date(dateFrom)
    }

    const dateTo = searchParams.get('dateTo')
    if (dateTo) {
      options.dateTo = new Date(dateTo)
    }

    const accountId = searchParams.get('accountId')
    if (accountId) {
      options.accountId = accountId
    }

    const reference = searchParams.get('reference')
    if (reference) {
      options.reference = reference
    }

    const limit = searchParams.get('limit')
    if (limit) {
      options.limit = parseInt(limit)
    }

    const offset = searchParams.get('offset')
    if (offset) {
      options.offset = parseInt(offset)
    }

    const journalEntries = await journalEntryService.getAllJournalEntries(options)

    return NextResponse.json({
      success: true,
      data: journalEntries
    })
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/accounting/journal-entries - Create new journal entry
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const body = await request.json()
    
    const { date, description, reference, currency, exchangeRate, lines } = body

    // Validate required fields
    if (!date || !description || !lines || !Array.isArray(lines)) {
      return NextResponse.json(
        { error: 'Date, description, and lines are required' },
        { status: 400 }
      )
    }

    // Validate lines structure
    for (const line of lines) {
      if (!line.accountId || (line.debitAmount === undefined && line.creditAmount === undefined)) {
        return NextResponse.json(
          { error: 'Each line must have accountId and either debitAmount or creditAmount' },
          { status: 400 }
        )
      }
    }

    const journalEntryService = new JournalEntryService()
    const journalEntry = await journalEntryService.createJournalEntry({
      date: new Date(date),
      description,
      reference,
      currency: currency || 'USD',
      exchangeRate: exchangeRate || 1.0,
      lines: lines.map((line: unknown) => ({
        accountId: line.accountId,
        description: line.description,
        debitAmount: line.debitAmount || 0,
        creditAmount: line.creditAmount || 0
      })),
      createdBy: session.user.id
    })

    return NextResponse.json({
      success: true,
      data: journalEntry
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating journal entry:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not balanced')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }

    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 404 }
      )
    }

    if (error instanceof Error ? error.message : String(error)?.includes('must have at least 2 lines')) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create journal entry' },
      { status: 500 }
    )
  }
}