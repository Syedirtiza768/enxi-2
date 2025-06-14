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
  let userId = request.headers.get('x-user-id') || 'anonymous'
  
  // Try to get user from auth token if available
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      // This is a simplified approach - in production you might want to decode the JWT
      // For now, we'll use the header approach or fallback to anonymous
      userId = request.headers.get('x-user-id') || 'anonymous'
    } catch (error) {
      // If token parsing fails, keep as anonymous
    }
  }
  
  const ipAddress = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    request.ip ||
                    'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  return { userId, ipAddress, userAgent }
}