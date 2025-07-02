import { NextRequest, NextResponse } from 'next/server'
import { SalesOrderTimelineService } from '@/lib/services/sales-order-timeline.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    const timelineService = new SalesOrderTimelineService()
    
    const timeline = await timelineService.getTimeline(resolvedParams.id)
    
    return NextResponse.json(timeline)
  } catch (error) {
    console.error('Error fetching sales order timeline:', error)
    
    if (error instanceof Error && error.message === 'Sales order not found') {
      return NextResponse.json(
        { error: 'Sales order not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch timeline' },
      { status: 500 }
    )
  }
}