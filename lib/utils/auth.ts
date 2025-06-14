import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/auth.service'
import { prisma } from '@/lib/db/prisma'

export interface AuthUser {
  id: string
  username: string
  email: string
  role: string
}

export async function getUserFromRequest(request: NextRequest): Promise<AuthUser> {
  try {
    // Get token from cookie or Authorization header
    const cookieToken = request.cookies.get('auth-token')?.value
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null
    
    const token = cookieToken || bearerToken

    // Log attempt for debugging
    if (!token) {
      console.log('Auth attempt: No token found in cookies or Authorization header')
    }

    if (!token) {
      throw new Error('No authentication token provided')
    }

    const authService = new AuthService()
    const user = authService.verifyToken(token)

    if (!user) {
      console.log('Auth attempt: Token verification failed')
      throw new Error('Invalid authentication token')
    }

    // Verify user exists and is active in database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, username: true, email: true, role: true, isActive: true }
    })

    if (!dbUser || !dbUser.isActive) {
      throw new Error('User not found or inactive')
    }

    // Authentication successful
    return {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.role
    }
  } catch (error) {
    console.error('Authentication error:', error instanceof Error ? error.message : error)
    throw new Error('Unauthorized')
  }
}

/**
 * Higher-order function to wrap API routes with authentication
 * @param request - The NextRequest object
 * @param handler - The route handler function
 * @param allowedRoles - Optional array of allowed roles
 */
export async function withAuth(
  request: NextRequest,
  handler: (session: { user: AuthUser }) => Promise<NextResponse>,
  allowedRoles?: string[]
): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(request)
    
    // Check role authorization if specified
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden - insufficient role' },
          { status: 403 }
        )
      }
    }
    
    // Call the handler with the authenticated session
    return await handler({ user })
  } catch (error) {
    console.error('Auth middleware error:', error)
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}