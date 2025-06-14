import { NextRequest, NextResponse } from 'next/server'
import { AuditService } from '@/lib/services/audit.service'
import { auditComplianceSchema } from '@/lib/validators/audit.validator'
import { z } from 'zod'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    
    // Transform dates from strings to Date objects
    const transformedBody = {
      ...body,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    }
    
    const validatedData = auditComplianceSchema.parse(transformedBody)
    
    const auditService = new AuditService()
    const result = await auditService.getComplianceReport(validatedData)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Audit Compliance Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid compliance parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}