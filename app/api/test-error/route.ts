import { NextRequest, NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  console.log('Test error endpoint called')
  
  try {
    // Test if console.log works
    console.log('About to throw error')
    throw new Error('Test error message')
  } catch (error) {
    console.log('Caught error:', error)
    return NextResponse.json({
      error: 'Test error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    console.log('Test POST received:', body)
    
    // Test response
    return NextResponse.json({
      success: true,
      received: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Test POST error:', error)
    return NextResponse.json({
      error: 'Failed',
      message: error instanceof Error ? error.message : 'Unknown'
    }, { status: 500 })
  }
}