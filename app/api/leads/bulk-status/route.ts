import { NextRequest, NextResponse } from 'next/server'
import { LeadService } from '@/lib/services/lead.service'
import { LeadStatus } from '@/lib/generated/prisma'
import { z } from 'zod'

const bulkUpdateStatusSchema = z.object({
  leadIds: z.array(z.string()),
  status: z.nativeEnum(LeadStatus)
})

const leadService = new LeadService()

export async function POST(_request: NextRequest) {
  try {
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const body = await _request.json()
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