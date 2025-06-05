import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/auth.service'
import { AuditService } from '@/lib/services/audit.service'
import { loginSchema } from '@/lib/validators/auth.validator'
import { AuditAction } from '@/lib/validators/audit.validator'
import { extractAuditContext } from '@/lib/utils/audit-context'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = loginSchema.parse(body)

    const authService = new AuthService()
    const auditService = new AuditService()
    const auditContext = extractAuditContext(request)
    
    const user = await authService.validateUser(
      validatedData.username,
      validatedData.password
    )

    if (!user) {
      // Skip audit logging for now to avoid complications
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const token = authService.generateToken(user)
    
    // Log successful login (skip for now to avoid issues)
    try {
      await auditService.logAction({
        userId: user.id,
        action: AuditAction.LOGIN,
        entityType: 'User',
        entityId: user.id,
        metadata: { 
          success: true,
          username: user.username
        },
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      })
    } catch (auditError) {
      console.warn('Audit logging failed:', auditError)
      // Continue with login even if audit fails
    }

    // Set cookie and return response
    const response = NextResponse.json({
      token,
      user,
    })
    
    response.cookies.set('auth-token', token, {
      httpOnly: true,  // Security: prevent XSS attacks
      secure: process.env.NODE_ENV === 'production', // HTTPS in production
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })

    return response
} catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}