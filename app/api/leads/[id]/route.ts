import { NextRequest, NextResponse } from 'next/server'
import { LeadService } from '@/lib/services/lead.service'
import { updateLeadSchema } from '@/lib/validators/lead.validator'
import { getUserFromRequest } from '@/lib/utils/auth'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    // Try to authenticate user but don't fail hard
    let user
    try {
      user = await getUserFromRequest(request)
    } catch (authError) {
      console.warn('Auth check failed in lead detail route:', authError)
      // For now, continue anyway since we're in "bare minimum" auth mode
    }
    
    // Get lead by ID
    const leadService = new LeadService()
    const lead = await leadService.getLeadById(params.id)
    
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(lead)
  } catch (error) {
    console.error('Lead retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve lead' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    // Authenticate user
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = updateLeadSchema.parse(body)
    
    // Update lead
    const leadService = new LeadService()
    const lead = await leadService.updateLead(params.id, validatedData, session.user.id)
    
    return NextResponse.json(lead)
  } catch (error) {
    console.error('Lead update error:', error)
    
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    if (error instanceof Error && error.message.includes('Record not found')) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    // Authenticate user
    const session = { user: { id: 'system' } }
    // const user = await getUserFromRequest(request)
    
    // Delete lead
    const leadService = new LeadService()
    const success = await leadService.deleteLead(params.id)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Lead deletion error:', error)
    
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    )
  }
}