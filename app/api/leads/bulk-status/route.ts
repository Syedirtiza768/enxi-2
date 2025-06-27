import { NextRequest, NextResponse } from 'next/server'
import { LeadService } from '@/lib/services/lead.service'
// LeadStatus values: NEW, CONTACTED, QUALIFIED, PROPOSAL_SENT, NEGOTIATING, CONVERTED, LOST, DISQUALIFIED
import { z } from 'zod'

const bulkUpdateStatusSchema = z.object({
  leadIds: z.array(z.string()),
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATING', 'CONVERTED', 'LOST', 'DISQUALIFIED'])
})

const leadService = new LeadService()

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const body = await request.json()
    const { leadIds, status } = bulkUpdateStatusSchema.parse(body)
    
    const updatedCount = await leadService.bulkUpdateLeadStatus(
      leadIds,
      status,
      userId
    )
    
    return NextResponse.json({
      success: true,
      updatedCount,
      message: `${updatedCount} leads updated successfully`
    })
  } catch (error) {
    console.error('Error bulk updating lead status:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to bulk update lead status' },
      { status: 500 }
    )
  }
}