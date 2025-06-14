import { NextRequest, NextResponse } from 'next/server'
import { LeadService } from '@/lib/services/lead.service'

const leadService = new LeadService()

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const timeline = await leadService.getLeadTimeline(resolvedParams.id)
    
    return NextResponse.json(timeline)
  } catch (error) {
    console.error('Error getting lead timeline:', error)
    return NextResponse.json(
      { error: 'Failed to get lead timeline' },
      { status: 500 }
    )
  }
}