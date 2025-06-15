import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/middleware/rbac.middleware'

export async function GET(request: NextRequest) {
  try {
    // Get token from various sources
    const authHeader = request.headers.get('authorization')
    const cookieToken = request.cookies.get('auth-token')?.value
    
    // Try to authenticate
    const user = await authenticateUser(request)
    
    return NextResponse.json({
      success: true,
      debug: {
        hasAuthHeader: !!authHeader,
        authHeader: authHeader ? authHeader.substring(0, 20) + '...' : null,
        hasCookie: !!cookieToken,
        cookieToken: cookieToken ? cookieToken.substring(0, 20) + '...' : null,
        authenticated: !!user,
        user: user ? {
          id: user.id,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        } : null
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}