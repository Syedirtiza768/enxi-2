import { NextRequest, NextResponse } from 'next/server'
import { AuditService } from '@/lib/services/audit.service'
import { AuditAction } from '@/lib/validators/audit.validator'
import { z } from 'zod'

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  userId: z.string().optional(),
  entityType: z.string().optional(),
  action: z.string().optional().transform(val => val ? val as AuditAction : undefined),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    const validatedParams = querySchema.parse(params)
    const { page, limit, ...filters } = validatedParams
    
    const auditService = new AuditService()
    const result = await auditService.getAuditLogs(
      filters,
      { page, limit }
    )
    
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}