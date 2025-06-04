import { NextRequest, NextResponse } from 'next/server'
import { LeadService } from '@/lib/services/lead.service'

const leadService = new LeadService()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const timeline = await leadService.getLeadTimeline(params.id)
    
    return NextResponse.json(timeline)
  } catch (error) {
    console.error('Error getting lead timeline:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to get lead timeline' },
      { status: 500 }
    )
  }
}