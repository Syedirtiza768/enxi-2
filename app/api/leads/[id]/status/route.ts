import { NextRequest, NextResponse } from 'next/server'
import { LeadService } from '@/lib/services/lead.service'
import { LeadStatus } from '@/lib/generated/prisma'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus)
})

const leadService = new LeadService()

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add proper authentication
    const userId = 'system' // Replace with actual user authentication
    
    const body = await request.json()
    const { status } = updateStatusSchema.parse(body)
    
    const lead = await leadService.updateLeadStatus(
      params.id,
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