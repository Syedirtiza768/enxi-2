import { NextRequest, NextResponse } from 'next/server'
import { AuditService } from '@/lib/services/audit.service'
import { EntityType } from '@/lib/validators/audit.validator'
import { z } from 'zod'

const querySchema = z.object({
  entityType: z.nativeEnum(EntityType),
  entityId: z.string().min(1),
})

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    const { entityType, entityId } = querySchema.parse(params)
    
    const auditService = new AuditService()
    const result = await auditService.getEntityHistory(entityType, entityId)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Entity History Error:', error)
    
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