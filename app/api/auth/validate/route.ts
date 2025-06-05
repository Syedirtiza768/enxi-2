import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/utils/auth'

export async function GET(_request: NextRequest) {
  try {
    // Validate token and get user (this handles both cookies and headers)
    const _user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Return user info without sensitive data
    return NextResponse.json({
      valid: true,
      user: {
        id: _user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    })
  } catch (error: unknown) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { valid: false, error: error instanceof Error ? error.message : String(error)},
      { status: 401 }
    )
  }
}