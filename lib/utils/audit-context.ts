import { AuditService } from '@/lib/services/audit.service'
import { AuditAction } from '@/lib/validators/audit.validator'
import { NextRequest } from 'next/server'

export interface AuditContext {
  userId: string
  ipAddress?: string
  userAgent?: string
}

export async function withAudit<T>(
  context: AuditContext,
  action: AuditAction,
  entityType: string,
  entityId: string,
  operation: () => Promise<T>,
  options?: {
    metadata?: Record<string, unknown>
    captureBeforeData?: () => Promise<unknown>
  }
): Promise<T> {
  const auditService = new AuditService()
  
  // Capture before state if needed
  let beforeData: unknown = undefined
  if (options?.captureBeforeData && action === AuditAction.UPDATE) {
    try {
      beforeData = await options.captureBeforeData()
    } catch (error) {
      console.error('Error capturing before data:', error);
    }
  }

  try {
    // Execute the operation
    const result = await operation()
    
    // Log the action
    await auditService.logAction({
      userId: context.userId,
      action,
      entityType,
      entityId,
      metadata: options?.metadata,
      beforeData,
      afterData: action === AuditAction.CREATE || action === AuditAction.UPDATE ? result as Record<string, unknown> : undefined,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
    
    return result
  } catch (error) {
    console.error('Error in audit context:', error);
    
    if (context.auditService) {
      try {
        await context.auditService.logAction({
          userId: context.userId,
          action: context.action,
          entityType: context.entityType,
          entityId: context.entityId || 'unknown',
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        })
      } catch (auditError) {
        console.error('Error logging audit action:', auditError);
      }
    }
    throw error
  }
}

export function extractAuditContext(request: NextRequest): AuditContext {
  // Try to extract user ID from various sources
  let userId = 'anonymous'
  
  // Try to get user from auth token if available
  try {
    const { getUserFromRequest } = require('@/lib/utils/auth')
    // This is async, but we need sync for middleware
    // For now, we'll check if there's an auth token and assume it's valid
    const cookieToken = request.cookies.get('auth-token')?.value
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null
    
    if (cookieToken || bearerToken) {
      // If there's a token, we'll extract user ID from it later in the middleware
      // For now, mark as pending authentication
      userId = 'pending-auth'
    }
  } catch (error) {
    // If auth module fails, keep as anonymous
    console.error('[Audit] Error extracting user context:', error)
  }
  
  // Try custom header approach
  const customUserId = request.headers.get('x-user-id')
  if (customUserId) {
    userId = customUserId
  }
  
  const ipAddress = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    request.ip ||
                    'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  return { userId, ipAddress, userAgent }
}