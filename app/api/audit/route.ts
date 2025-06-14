import { NextRequest, NextResponse } from 'next/server'
import { AuditService } from '@/lib/services/audit.service'
import { 
  AuditAction, 
  EntityType, 
  auditLogSchema
} from '@/lib/validators/audit.validator'
import { extractAuditContext } from '@/lib/utils/audit-context'
import { z } from 'zod'

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  sortBy: z.string().optional().default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  userId: z.string().optional(),
  entityType: z.nativeEnum(EntityType).optional(),
  entityId: z.string().optional(),
  action: z.nativeEnum(AuditAction).optional(),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  search: z.string().optional(),
  ipAddress: z.string().optional(),
  correlationId: z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
})

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    const validatedParams = querySchema.parse(params)
    const { page, limit, sortBy, sortOrder, ...filters } = validatedParams
    
    const auditService = new AuditService()
    const result = await auditService.getAuditLogs(
      filters,
      { page, limit, sortBy, sortOrder }
    )
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Audit API Error:', error)
    
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const validatedData = auditLogSchema.parse(body)
    
    // Extract audit context from request
    const auditContext = extractAuditContext(request)
    
    // Add context data to the audit log
    const auditData = {
      ...validatedData,
      ipAddress: validatedData.ipAddress || auditContext.ipAddress,
      userAgent: validatedData.userAgent || auditContext.userAgent,
    }
    
    const auditService = new AuditService()
    const result = await auditService.logAction(auditData)
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Audit Log Creation Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid audit log data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}