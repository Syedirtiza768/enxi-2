import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { JournalEntryService } from '@/lib/services/accounting/journal-entry.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/accounting/journal-entries/[id]/post - Post a journal entry
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const { id } = await params
    const journalEntryService = new JournalEntryService()
    
    const journalEntry = await journalEntryService.postJournalEntry(id, session.user.id)

    return NextResponse.json({
      success: true,
      data: journalEntry,
      message: 'Journal entry posted successfully'
    })
  } catch (error: unknown) {
    console.error('Error posting journal entry:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: 'Journal entry not found' },
        { status: 404 }
      )
    }

    if (error instanceof Error ? error.message : String(error)?.includes('Only draft journal entries can be posted')) {
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