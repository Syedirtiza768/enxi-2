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
    metadata?: Record<string, any>
    captureBeforeData?: () => Promise<any>
  }
): Promise<T> {
  const auditService = new AuditService()
  
  // Capture before state if needed
  let beforeData: any = undefined
  if (options?.captureBeforeData && action === AuditAction.UPDATE) {
    try {
      beforeData = await options.captureBeforeData()
    } catch (error) {
      console.error('Failed to capture before data:', error)
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
      afterData: action === AuditAction.CREATE || action === AuditAction.UPDATE ? result as Record<string, any> : undefined,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
    
    return result
  } catch (error) {
    // Log failed attempts for critical operations
    if (action !== AuditAction.READ) {
      await auditService.logAction({
        userId: context.userId,
        action,
        entityType,
        entityId,
        metadata: {
          ...options?.metadata,
          error: error instanceof Error ? error.message : 'Unknown error',
          failed: true,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    }
    throw error
  }
}

export function extractAuditContext(request: NextRequest): AuditContext {
  const userId = request.headers.get('x-user-id') || 'anonymous'
  const ipAddress = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  return { userId, ipAddress, userAgent }
}