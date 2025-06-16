import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { JournalEntryService } from '@/lib/services/accounting/journal-entry.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/accounting/journal-entries/[id]/cancel - Cancel a journal entry
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    const { id } = await params
    const journalEntryService = new JournalEntryService()
    
    const journalEntry = await journalEntryService.cancelJournalEntry(id, session.user.id)

    return NextResponse.json({
      success: true,
      data: journalEntry,
      message: 'Journal entry cancelled successfully'
    })
  } catch (error: unknown) {
    console.error('Error cancelling journal entry:', error)
    
    if (error instanceof Error ? error.message : String(error)?.includes('not found')) {
      return NextResponse.json(
        { error: 'Journal entry not found' },
        { status: 404 }
      )
    }

    if (error instanceof Error ? error.message : String(error)?.includes('already cancelled')) {
      return NextResponse.json(
        { error: 'Journal entry is already cancelled' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to cancel journal entry' },
      { status: 500 }
    )
  }
}