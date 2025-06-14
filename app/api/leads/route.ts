import { NextRequest, NextResponse } from 'next/server'
import { LeadService } from '@/lib/services/lead.service'
import { createLeadSchema, leadListQuerySchema } from '@/lib/validators/lead.validator'
import { getUserFromRequest } from '@/lib/utils/auth'
import { withUniversalErrorHandling } from '@/lib/middleware/universal-error-wrapper'

const postHandler = async (request: NextRequest): void => {
  console.warn('[API] Lead POST handler started')
  
  // Authenticate user
  const user = await getUserFromRequest(request)
  console.warn('[API] Authenticated user:', user.id)
  
  // Parse and validate request body
  const body = await request.json()
  console.warn('[API] Request body:', body)
  
  const validatedData = createLeadSchema.parse(body)
  console.warn('[API] Validated data:', validatedData)
  
  // Create lead
  const leadService = new LeadService()
  const lead = await leadService.createLead(validatedData, user.id)
  
  return NextResponse.json(lead, { status: 201 })
}

export const POST = withUniversalErrorHandling(postHandler, '/api/leads', { operation: 'POST createLead' })

const getHandler = async (request: NextRequest): void => {
  // Try to authenticate user but don't fail hard
  let user
  try {
    user = await getUserFromRequest(request)
  } catch (authError) {
    console.warn('Auth check failed in leads route', {
      error: authError instanceof Error ? authError.message : 'Unknown auth error'
    });
    // For now, continue anyway since we're in "bare minimum" auth mode
  }
  
  // Parse query parameters
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  
  // If email is provided, search for leads by email
  if (email) {
    const leadService = new LeadService()
    const leads = await leadService.findByEmail(email)
    return NextResponse.json(leads)
  }
  
  // Otherwise, get paginated leads
  const queryData = {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10'),
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') || undefined,
    source: searchParams.get('source') || undefined,
  }
  
  // Validate query parameters
  const validatedQuery = leadListQuerySchema.parse(queryData)
  
  // Get leads
  const leadService = new LeadService()
  const leads = await leadService.getLeads(validatedQuery)
  
  return NextResponse.json(leads)
}

export const GET = withUniversalErrorHandling(getHandler, '/api/leads', { operation: 'GET leads' })