import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db/prisma'

export interface AuthUser {
  id: string
  username: string
  email: string
  role: string
}

export async function authenticateUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const jwtSecret = process.env.JWT_SECRET
    
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not configured')
    }
    
    const decoded = jwt.verify(token, jwtSecret) as { userId?: string }
    
    if (!decoded.userId) {
      return null
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true
      }
    })

    return user
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}