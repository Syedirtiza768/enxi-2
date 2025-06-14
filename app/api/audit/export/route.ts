import { NextRequest, NextResponse } from 'next/server'
import { AuditService } from '@/lib/services/audit.service'
import { auditExportSchema } from '@/lib/validators/audit.validator'
import { z } from 'zod'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const validatedData = auditExportSchema.parse(body)
    
    const auditService = new AuditService()
    const result = await auditService.exportAuditLogs(validatedData)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Audit Export Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid export parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}