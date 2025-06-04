import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { JournalEntryService } from '@/lib/services/accounting/journal-entry.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/accounting/journal-entries/[id]/post - Post a journal entry
export async function POST(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const user = await getUserFromRequest(request)
    const params = await context.params
    const journalEntryService = new JournalEntryService()
    
    const journalEntry = await journalEntryService.postJournalEntry(params.id, user.id)

    return NextResponse.json({
      success: true,
      data: journalEntry,
      message: 'Journal entry posted successfully'
    })
  } catch (error: any) {
    console.error('Error posting journal entry:', error)
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'Journal entry not found' },
        { status: 404 }
      )
    }

    if (error.message?.includes('Only draft journal entries can be posted')) {
      return NextResponse.json(
        { error: 'Only draft journal entries can be posted' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to post journal entry' },
      { status: 500 }
    )
  }
}