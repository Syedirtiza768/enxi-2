import { NextRequest, NextResponse } from 'next/server'
import { AuditService } from '@/lib/services/audit.service'
import { auditStatsSchema } from '@/lib/validators/audit.validator'
import { z } from 'zod'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const validatedData = auditStatsSchema.parse(body)
    
    const auditService = new AuditService()
    const result = await auditService.getAuditStats(validatedData)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Audit Stats Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid stats parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    // Transform query params to match schema
    const transformedParams = {
      ...params,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
    }
    
    const validatedData = auditStatsSchema.parse(transformedParams)
    
    const auditService = new AuditService()
    const result = await auditService.getAuditStats(validatedData)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Audit Stats Error:', error)
    
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