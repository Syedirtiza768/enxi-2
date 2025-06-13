import { NextRequest } from 'next/server'
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
      console.log('Auth attempt: User not found or inactive', { userId: user.id })
      throw new Error('User not found or inactive')
    }

    // Authentication successful
    console.log('Auth successful for user:', dbUser.username)

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