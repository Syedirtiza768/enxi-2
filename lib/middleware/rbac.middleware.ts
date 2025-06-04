import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/lib/services/user.service'
import { AuthService } from '@/lib/services/auth.service'
import { prisma } from '@/lib/db/prisma'

interface User {
  id: string
  email: string
  role: string
  isActive: boolean
}

interface AuthenticatedRequest extends NextRequest {
  user?: User
}

/**
 * Authentication middleware - validates session token
 */
export async function authenticateUser(request: NextRequest): Promise<User | null> {
  try {
    // Get token from Authorization header or cookie
    let token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      // Try to get from cookie (use correct cookie name)
      token = request.cookies.get('auth-token')?.value
    }

    if (!token) {
      return null
    }

    // Use AuthService to verify JWT token instead of database session
    const authService = new AuthService()
    const tokenPayload = authService.verifyToken(token)
    
    if (!tokenPayload) {
      return null
    }

    // Verify user still exists and is active  
    const user = await authService.getUserById(tokenPayload.id)
    
    if (!user || !user.isActive) {
      return null
    }
    
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

/**
 * Authorization middleware - checks if user has required permission
 */
export function requirePermission(permission: string) {
  return async (request: AuthenticatedRequest): Promise<NextResponse | null> => {
    const user = request.user || await authenticateUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    try {
      const userService = new UserService()
      const hasPermission = await userService.hasPermission(user.id, permission)
      
      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Forbidden - insufficient permissions' },
          { status: 403 }
        )
      }

      // Attach user to request for use in handler
      request.user = user
      return null // Continue to handler
    } catch (error) {
      console.error('Authorization error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Role-based authorization middleware
 */
export function requireRole(allowedRoles: string[]) {
  return async (request: AuthenticatedRequest): Promise<NextResponse | null> => {
    const user = request.user || await authenticateUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - insufficient role' },
        { status: 403 }
      )
    }

    // Attach user to request for use in handler
    request.user = user
    return null // Continue to handler
  }
}

/**
 * Composite middleware that chains multiple middleware functions
 */
export function withAuth(...middlewares: Array<(req: AuthenticatedRequest) => Promise<NextResponse | null>>) {
  return async (request: NextRequest) => {
    const authRequest = request as AuthenticatedRequest

    for (const middleware of middlewares) {
      const result = await middleware(authRequest)
      if (result) {
        return result // Return error response
      }
    }

    return authRequest // Continue to handler with authenticated request
  }
}

/**
 * Helper function to create protected API route handler
 */
export function createProtectedHandler(
  handler: (request: AuthenticatedRequest, ...args: any[]) => Promise<NextResponse>,
  options: {
    permissions?: string[]
    roles?: string[]
  } = {}
) {
  return async (request: NextRequest, ...args: any[]) => {
    const authRequest = request as AuthenticatedRequest

    // Authenticate user
    const user = await authenticateUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    authRequest.user = user

    // Check roles if specified
    if (options.roles && !options.roles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - insufficient role' },
        { status: 403 }
      )
    }

    // Check permissions if specified
    if (options.permissions) {
      const userService = new UserService()
      
      for (const permission of options.permissions) {
        const hasPermission = await userService.hasPermission(user.id, permission)
        if (!hasPermission) {
          return NextResponse.json(
            { error: `Forbidden - missing permission: ${permission}` },
            { status: 403 }
          )
        }
      }
    }

    // Call the actual handler
    return handler(authRequest, ...args)
  }
}

/**
 * Rate limiting middleware
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
  return async (request: AuthenticatedRequest): Promise<NextResponse | null> => {
    const user = request.user
    if (!user) return null // Skip rate limiting for unauthenticated requests

    const key = `rate_limit:${user.id}`
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean up old entries
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetTime < now) {
        rateLimitMap.delete(k)
      }
    }

    const current = rateLimitMap.get(key)
    
    if (!current || current.resetTime < windowStart) {
      // First request in window or window expired
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
      return null
    }

    if (current.count >= maxRequests) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((current.resetTime - now) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(current.resetTime / 1000).toString(),
          }
        }
      )
    }

    // Increment counter
    current.count++
    
    return null
  }
}

/**
 * Audit logging middleware
 */
export function auditLog(action: string, entityType: string) {
  return async (request: AuthenticatedRequest): Promise<NextResponse | null> => {
    const user = request.user
    if (!user) return null

    try {
      // Extract entity ID from URL if possible
      const url = new URL(request.url)
      const pathParts = url.pathname.split('/')
      const entityId = pathParts[pathParts.length - 1] || 'unknown'

      // Log the action (fire and forget)
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action,
          entityType,
          entityId,
          metadata: {
            method: request.method,
            url: request.url,
            userAgent: request.headers.get('user-agent'),
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          },
        },
      }).catch(error => {
        console.error('Audit log error:', error)
      })
    } catch (error) {
      console.error('Audit log middleware error:', error)
    }

    return null
  }
}

/**
 * Resource ownership middleware - checks if user owns the resource
 */
export function requireOwnership(getResourceUserId: (request: AuthenticatedRequest) => Promise<string | null>) {
  return async (request: AuthenticatedRequest): Promise<NextResponse | null> => {
    const user = request.user
    if (!user) return null

    try {
      const resourceUserId = await getResourceUserId(request)
      
      if (!resourceUserId) {
        return NextResponse.json(
          { error: 'Resource not found' },
          { status: 404 }
        )
      }

      // Super admins and admins can access any resource
      if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
        return null
      }

      if (user.id !== resourceUserId) {
        return NextResponse.json(
          { error: 'Forbidden - you can only access your own resources' },
          { status: 403 }
        )
      }

      return null
    } catch (error) {
      console.error('Ownership check error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}