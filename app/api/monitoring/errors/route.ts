import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

export async function POST(request: NextRequest) {
  try {
    const { errors } = await request.json()
    
    // Store errors in database for analysis
    const errorRecords = errors.map((error: any) => ({
      type: error.type,
      message: error.message,
      stack: error.stack,
      url: error.url,
      line: error.line,
      column: error.column,
      userAgent: error.userAgent,
      timestamp: new Date(error.timestamp),
      context: error.context,
    }))
    
    // Store in a dedicated error tracking table (if exists)
    // For now, just log to console in production
    if (process.env.NODE_ENV === 'production') {
      console.error('Runtime errors reported:', errorRecords)
    }
    
    // You could also send to external monitoring service
    // await sendToSentry(errorRecords)
    // await sendToDatadog(errorRecords)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error storing error reports:', error)
    return NextResponse.json(
      { error: 'Failed to store error reports' },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Get error statistics
  try {
    // This would query your error tracking table
    const stats = {
      typeErrors: 0,
      totalErrors: 0,
      errorRate: 0,
      lastHour: {
        typeErrors: 0,
        totalErrors: 0,
      },
      topErrors: [] as any[],
    }
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching error stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch error stats' },
      { status: 500 }
    )
  }
}