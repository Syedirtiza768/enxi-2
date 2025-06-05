import { NextRequest } from 'next/server'
import { AuthService } from '@/lib/services/auth.service'

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

    // Authentication successful

    return user
  } catch (error) {
    console.error('Authentication error:', error);
    return null
  }
}