import { NextRequest, NextResponse } from 'next/server'
import { LeadService } from '@/lib/services/lead.service'
import { LeadSource } from "@/lib/types/shared-enums"

const leadService = new LeadService()

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    
    const filters: unknown = {}
    
    const source = searchParams.get('source')
    if (source && Object.values(LeadSource).includes(source as LeadSource)) {
      filters.source = source as LeadSource
    }
    
    const dateFrom = searchParams.get('dateFrom')
    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom)
    }
    
    const dateTo = searchParams.get('dateTo')
    if (dateTo) {
      filters.dateTo = new Date(dateTo)
    }
    
    const metrics = await leadService.getLeadMetrics(filters)
    
    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error getting lead metrics:', error)
    return NextResponse.json(
      { error: 'Failed to get lead metrics' },
      { status: 500 }
    )
  }
}