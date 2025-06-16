import { NextRequest, NextResponse } from 'next/server'
import { LeadService } from '@/lib/services/lead.service'
import { getUserFromRequest } from '@/lib/utils/auth'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Try to authenticate user but don't fail hard
    try {
      const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    } catch (authError) {
      console.warn('Auth check failed in stats route:', authError)
      // For now, continue anyway since we're in "bare minimum" auth mode
    }
    
    // Get lead statistics
    const leadService = new LeadService()
    const stats = await leadService.getLeadStats()
    
    return NextResponse.json(stats)
} catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}