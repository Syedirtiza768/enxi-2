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
    const _user = await getUserFromRequest(request)
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
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}