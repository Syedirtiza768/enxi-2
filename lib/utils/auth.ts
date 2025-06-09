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

    // Log attempt for debugging if needed

    if (!token) {
      throw new Error('No authentication token provided')
    }

    const authService = new AuthService()
    const user = authService.verifyToken(token)

    if (!user) {
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
    console.error('Authentication error:', error);
    throw new Error('Unauthorized')
  }
}