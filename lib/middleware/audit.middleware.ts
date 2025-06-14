import { NextRequest, NextResponse } from 'next/server'
import { AuditService } from '@/lib/services/audit.service'
import { AuditAction, EntityType } from '@/lib/validators/audit.validator'
import { extractAuditContext } from '@/lib/utils/audit-context'

export interface AuditMiddlewareOptions {
  action: AuditAction
  entityType: EntityType
  entityIdField?: string // Field name in request body to extract entity ID
  entityIdParam?: string // URL parameter name for entity ID
  captureRequest?: boolean
  captureResponse?: boolean
  skipCondition?: (request: NextRequest) => boolean
  metadata?: Record<string, unknown>
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

/**
 * Audit middleware factory for automatic audit logging in API routes
 * Usage:
 * export const POST = withAudit(handler, {
 *   action: AuditAction.CREATE,
 *   entityType: EntityType.CUSTOMER,
 *   entityIdField: 'id'
 * })
 */
export function withAudit<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  options: AuditMiddlewareOptions
): T {
  return (async (request: NextRequest, ...args: any[]) => {
    const auditService = new AuditService()
    const auditContext = extractAuditContext(request)
    
    // Check if audit should be skipped
    if (options.skipCondition && options.skipCondition(request)) {
      return handler(request, ...args)
    }

    let requestBody: any = null
    let beforeData: any = null
    let entityId = 'unknown'
    
    try {
      // Extract entity ID from URL parameters
      if (options.entityIdParam && args[0]?.params) {
        entityId = args[0].params[options.entityIdParam] || 'unknown'
      }
      
      // Capture request data if needed
      if (options.captureRequest || options.entityIdField) {
        try {
          const clonedRequest = request.clone()
          requestBody = await clonedRequest.json()
          
          // Extract entity ID from request body if not found in params
          if (options.entityIdField && requestBody[options.entityIdField]) {
            entityId = requestBody[options.entityIdField]
          }
        } catch (error) {
          // Request might not have JSON body, that's ok
        }
      }

      // Capture before data for UPDATE operations
      if (options.action === AuditAction.UPDATE && entityId !== 'unknown') {
        try {
          beforeData = await captureBeforeData(options.entityType, entityId)
        } catch (error) {
          console.warn('Failed to capture before data:', error)
        }
      }

      // Execute the main handler
      const response = await handler(request, ...args)
      
      // Extract response data for after capture
      let afterData: any = null
      if (options.captureResponse && response.status >= 200 && response.status < 300) {
        try {
          const clonedResponse = response.clone()
          afterData = await clonedResponse.json()
          
          // Update entity ID if it was created
          if (options.action === AuditAction.CREATE && afterData?.id) {
            entityId = afterData.id
          }
        } catch (error) {
          // Response might not be JSON, that's ok
        }
      }

      // Log the audit entry asynchronously (don't block response)
      setImmediate(async () => {
        try {
          await auditService.logAction({
            userId: auditContext.userId,
            action: options.action,
            entityType: options.entityType,
            entityId,
            metadata: {
              ...options.metadata,
              url: request.url,
              method: request.method,
              status: response.status,
              userAgent: auditContext.userAgent,
              requestSize: requestBody ? JSON.stringify(requestBody).length : 0,
              responseSize: afterData ? JSON.stringify(afterData).length : 0,
            },
            beforeData,
            afterData: options.captureResponse ? afterData : undefined,
            ipAddress: auditContext.ipAddress,
            userAgent: auditContext.userAgent,
            severity: options.severity || determineSeverity(options.action, options.entityType, response.status),
          })
        } catch (auditError) {
          console.error('Audit logging failed:', auditError)
        }
      })

      return response
    } catch (error) {
      // Log failed operations
      setImmediate(async () => {
        try {
          await auditService.logAction({
            userId: auditContext.userId,
            action: options.action,
            entityType: options.entityType,
            entityId,
            metadata: {
              ...options.metadata,
              url: request.url,
              method: request.method,
              error: error instanceof Error ? error.message : 'Unknown error',
              requestSize: requestBody ? JSON.stringify(requestBody).length : 0,
            },
            beforeData,
            ipAddress: auditContext.ipAddress,
            userAgent: auditContext.userAgent,
            severity: 'HIGH',
          })
        } catch (auditError) {
          console.error('Audit logging failed:', auditError)
        }
      })

      throw error
    }
  }) as T
}

/**
 * Simplified audit middleware for common CRUD operations
 */
export function withCrudAudit<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  entityType: EntityType,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  options: Partial<AuditMiddlewareOptions> = {}
): T {
  const actionMap = {
    GET: AuditAction.READ,
    POST: AuditAction.CREATE,
    PUT: AuditAction.UPDATE,
    PATCH: AuditAction.UPDATE,
    DELETE: AuditAction.DELETE,
  }

  return withAudit(handler, {
    action: actionMap[method],
    entityType,
    entityIdParam: 'id',
    entityIdField: 'id',
    captureRequest: method !== 'GET',
    captureResponse: method !== 'DELETE',
    ...options,
  })
}

/**
 * Audit middleware for approval workflows
 */
export function withApprovalAudit<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  entityType: EntityType,
  approved: boolean,
  options: Partial<AuditMiddlewareOptions> = {}
): T {
  return withAudit(handler, {
    action: approved ? AuditAction.APPROVE : AuditAction.REJECT,
    entityType,
    entityIdParam: 'id',
    captureRequest: true,
    captureResponse: true,
    severity: 'HIGH',
    ...options,
  })
}

/**
 * Audit middleware for status changes
 */
export function withStatusChangeAudit<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  entityType: EntityType,
  options: Partial<AuditMiddlewareOptions> = {}
): T {
  return withAudit(handler, {
    action: AuditAction.STATUS_CHANGE,
    entityType,
    entityIdParam: 'id',
    captureRequest: true,
    captureResponse: true,
    severity: 'MEDIUM',
    ...options,
  })
}

/**
 * Audit middleware for bulk operations
 */
export function withBulkAudit<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  action: AuditAction,
  entityType: EntityType,
  options: Partial<AuditMiddlewareOptions> = {}
): T {
  return withAudit(handler, {
    action,
    entityType,
    captureRequest: true,
    captureResponse: true,
    severity: 'HIGH',
    metadata: { operationType: 'bulk-operation' },
    ...options,
  })
}

/**
 * Audit middleware for sensitive data access
 */
export function withSensitiveDataAudit<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  entityType: EntityType,
  options: Partial<AuditMiddlewareOptions> = {}
): T {
  return withAudit(handler, {
    action: AuditAction.SENSITIVE_DATA_VIEW,
    entityType,
    entityIdParam: 'id',
    captureRequest: false,
    captureResponse: false,
    severity: 'HIGH',
    ...options,
  })
}

// Helper functions
async function captureBeforeData(entityType: EntityType, entityId: string): Promise<any> {
  // This would need to be implemented based on the entity type
  // For now, return a placeholder that indicates we should capture the current state
  return {
    _note: `Before state for ${entityType} ${entityId} should be captured here`,
    entityType,
    entityId,
    timestamp: new Date().toISOString(),
  }
}

function determineSeverity(
  action: AuditAction, 
  entityType: EntityType, 
  responseStatus: number
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  // Failed operations are high severity
  if (responseStatus >= 400) {
    return 'HIGH'
  }

  // Critical actions
  if ([
    AuditAction.DELETE,
    AuditAction.SECURITY_VIOLATION,
    AuditAction.PERMISSION_GRANTED,
    AuditAction.PERMISSION_REVOKED,
    AuditAction.DATA_MIGRATION,
  ].includes(action)) {
    return 'CRITICAL'
  }

  // High priority actions
  if ([
    AuditAction.APPROVE,
    AuditAction.REJECT,
    AuditAction.CONFIGURATION_CHANGE,
    AuditAction.BULK_UPDATE,
    AuditAction.BULK_DELETE,
  ].includes(action)) {
    return 'HIGH'
  }

  // Critical entities with any modification
  if ([
    EntityType.USER,
    EntityType.PAYMENT,
    EntityType.INVOICE,
    EntityType.SUPPLIER_PAYMENT,
    EntityType.JOURNAL_ENTRY,
  ].includes(entityType) && action !== AuditAction.READ) {
    return 'MEDIUM'
  }

  return 'LOW'
}

// Export utility functions for manual audit logging
export const auditUtils = {
  extractAuditContext,
  captureBeforeData,
  determineSeverity,
}