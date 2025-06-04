import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { JournalEntryService } from '@/lib/services/accounting/journal-entry.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/accounting/journal-entries/[id] - Get specific journal entry
export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const user = await getUserFromRequest(request)
    const params = await context.params
    const journalEntryService = new JournalEntryService()
    const journalEntry = await journalEntryService.getJournalEntry(params.id)

    if (!journalEntry) {
      return NextResponse.json(
        { error: 'Journal entry not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: journalEntry
    })
  } catch (error) {
    console.error('Error fetching journal entry:', error)
    return NextResponse.json(
      { error: 'Failed to fetch journal entry' },
      { status: 500 }
    )
  }
}