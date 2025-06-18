import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'
import { JournalEntryService } from '@/lib/services/accounting/journal-entry.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/accounting/journal-entries/[id]/post - Post a journal entry
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { id } = await params
    const journalEntryService = new JournalEntryService()
    
    const journalEntry = await journalEntryService.postJournalEntry(id, user.id)

    return NextResponse.json({
      success: true,
      data: journalEntry,
      message: 'Journal entry posted successfully'
    })
  } catch (error: unknown) {
    console.error('Error posting journal entry:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    if (errorMessage.includes('not found')) {
      return NextResponse.json(
        { error: 'Journal entry not found' },
        { status: 404 }
      )
    }

    if (errorMessage.includes('Only draft journal entries can be posted')) {
      return NextResponse.json(
        { error: 'Only draft journal entries can be posted' },
        { status: 400 }
      )
    }

    // Include more detailed error information in development
    const isDevelopment = process.env.NODE_ENV === 'development'
    const responseError = isDevelopment 
      ? { 
          error: 'Failed to post journal entry',
          details: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        }
      : { error: 'Failed to post journal entry' }

    return NextResponse.json(
      responseError,
      { status: 500 }
    )
  }
}