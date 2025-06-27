import { NextRequest, NextResponse } from 'next/server'
import { LeadService } from '@/lib/services/lead.service'
// LeadStatus values: NEW, CONTACTED, QUALIFIED, PROPOSAL_SENT, NEGOTIATING, CONVERTED, LOST, DISQUALIFIED
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATING', 'CONVERTED', 'LOST', 'DISQUALIFIED'])
})

const leadService = new LeadService()

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const resolvedParams = await params
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const body = await request.json()
    const { status } = updateStatusSchema.parse(body)
    
    const lead = await leadService.updateLeadStatus(
      resolvedParams.id,
      status,
      userId
    )
    
    return NextResponse.json(lead)
  } catch (error) {
    console.error('Error updating lead status:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update lead status' },
      { status: 500 }
    )
  }
}