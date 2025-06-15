import { prisma } from '@/lib/db/prisma'
import { BaseService } from './base.service'
import { 
  AuditLog, 
  AuditFilter, 
  Pagination, 
  AuditAction, 
  EntityType,
  BulkAuditLog,
  AuditExport,
  AuditStats,
  AuditCompliance,
  AUDIT_CONFIG
} from '@/lib/validators/audit.validator'
import { v4 as uuidv4 } from 'uuid'

export class AuditService extends BaseService {
  constructor() {
    super('AuditService')
  }

  async logAction(data: AuditLog) {
    return this.withLogging('logAction', async () => {
      try {
        // Sanitize sensitive data
        const sanitizedData = this.sanitizeAuditData(data)
        
        // Determine severity if not provided
        const severity = data.severity || this.determineSeverity(data.action, data.entityType)
        
        // Add correlation ID for tracking related operations
        const correlationId = data.correlationId || uuidv4()
        
        return await prisma.auditLog.create({
          data: {
            userId: sanitizedData.userId,
            action: sanitizedData.action,
            entityType: sanitizedData.entityType,
            entityId: sanitizedData.entityId,
            metadata: sanitizedData.metadata || undefined,
            beforeData: sanitizedData.beforeData || undefined,
            afterData: sanitizedData.afterData || undefined,
            ipAddress: sanitizedData.ipAddress || undefined,
            userAgent: sanitizedData.userAgent || undefined,
          },
        })
      } catch (error) {
        // Don't throw audit logging errors to prevent disrupting main operations
        console.error('[AuditService] Failed to log action:', {
          error: error instanceof Error ? error.message : error,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId
        });
        
        // Return a mock response to prevent breaking the flow
        return {
          id: 'audit-error',
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          timestamp: new Date()
        }
      }
    })
  }

  async logBulkActions(data: BulkAuditLog) {
    return this.withLogging('logBulkActions', async () => {
      try {
        const batchId = data.batchId || uuidv4()
        const sanitizedLogs = data.logs.map(log => ({
          ...this.sanitizeAuditData(log),
          correlationId: log.correlationId || batchId,
        }))

        // Process in batches to avoid overwhelming the database
        const batches = this.chunkArray(sanitizedLogs, AUDIT_CONFIG.BATCH_SIZE)
        const results = []

        for (const batch of batches) {
          const batchResult = await prisma.auditLog.createMany({
            data: batch.map(log => ({
              userId: log.userId,
              action: log.action,
              entityType: log.entityType,
              entityId: log.entityId,
              metadata: log.metadata || undefined,
              beforeData: log.beforeData || undefined,
              afterData: log.afterData || undefined,
              ipAddress: log.ipAddress || undefined,
              userAgent: log.userAgent || undefined,
            })),
            skipDuplicates: true
          })
          results.push(batchResult)
        }

        return {
          batchId,
          totalLogs: sanitizedLogs.length,
          results
        }
      } catch (error) {
        console.error('[AuditService] Failed to log bulk actions:', error)
        throw error
      }
    })
  }

  async getAuditLogs(
    filters: AuditFilter = {},
    pagination: Pagination = { page: 1, limit: 50, sortBy: 'timestamp', sortOrder: 'desc' }
  ) {
    return this.withLogging('getAuditLogs', async () => {
      const where: Record<string, unknown> = {}

      // Basic filters
      if (filters.userId) where.userId = filters.userId
      if (filters.entityType) where.entityType = filters.entityType
      if (filters.entityId) where.entityId = filters.entityId
      if (filters.action) where.action = filters.action
      if (filters.ipAddress) where.ipAddress = { contains: filters.ipAddress }
      if (filters.correlationId) where.correlationId = filters.correlationId
      
      // Date range filter
      if (filters.startDate || filters.endDate) {
        where.timestamp = {}
        if (filters.startDate) where.timestamp.gte = filters.startDate
        if (filters.endDate) where.timestamp.lte = filters.endDate
      }

      // Search filter - search in metadata and other text fields
      if (filters.search) {
        where.OR = [
          { metadata: { search: filters.search } },
          { entityId: { contains: filters.search } },
        ]
      }

      const skip = (pagination.page - 1) * pagination.limit
      const orderBy: Record<string, string> = {}
      orderBy[pagination.sortBy] = pagination.sortOrder

      const [data, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          },
          orderBy,
          skip,
          take: pagination.limit,
        }),
        prisma.auditLog.count({ where })])

      return {
        data,
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      }
    })
  }

  async getEntityHistory(entityType: string, entityId: string) {
    return this.withLogging('getEntityHistory', async () => {
      return prisma.auditLog.findMany({
        where: { entityType, entityId },
        include: {
          user: {
            select: {
              username: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: { timestamp: 'desc' },
      })
    })
  }

  async getUserActivity(userId: string, pagination: Pagination = { page: 1, limit: 50, sortBy: 'timestamp', sortOrder: 'desc' }) {
    return this.withLogging('getUserActivity', async () => {
      const skip = (pagination.page - 1) * pagination.limit

      const [data, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: { userId },
          orderBy: { timestamp: 'desc' },
          skip,
          take: pagination.limit,
        }),
        prisma.auditLog.count({ where: { userId } })])

      return {
        data,
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      }
    })
  }

  async getAuditStats(options: AuditStats) {
    return this.withLogging('getAuditStats', async () => {
      const { period, groupBy, startDate, endDate } = options
      
      // Calculate date range
      const now = new Date()
      const dateRange = this.calculateDateRange(period, startDate, endDate, now)
      
      const logs = await prisma.auditLog.findMany({
        where: {
          timestamp: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        select: {
          action: true,
          entityType: true,
          userId: true,
          timestamp: true,
        }
      })

      return this.aggregateStatistics(logs, groupBy)
    })
  }

  async exportAuditLogs(options: AuditExport) {
    return this.withLogging('exportAuditLogs', async () => {
      const logs = await this.getAuditLogs(
        options.filters || {},
        { page: 1, limit: 10000, sortBy: 'timestamp', sortOrder: 'desc' }
      )

      switch (options.format) {
        case 'CSV':
          return this.exportToCSV(logs.data, options)
        case 'JSON':
          return this.exportToJSON(logs.data, options)
        case 'PDF':
          return this.exportToPDF(logs.data, options)
        default:
          throw new Error(`Unsupported export format: ${options.format}`)
      }
    })
  }

  async getComplianceReport(options: AuditCompliance) {
    return this.withLogging('getComplianceReport', async () => {
      const where: Record<string, unknown> = {
        timestamp: {
          gte: options.startDate,
          lte: options.endDate,
        }
      }

      if (options.entityTypes?.length) {
        where.entityType = { in: options.entityTypes }
      }

      const logs = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              username: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { timestamp: 'desc' }
      })

      return this.generateComplianceReport(logs, options)
    })
  }

  async getSecurityEvents(startDate?: Date, endDate?: Date) {
    return this.withLogging('getSecurityEvents', async () => {
      const securityActions = [
        AuditAction.LOGIN_FAILED,
        AuditAction.SECURITY_VIOLATION,
        AuditAction.PERMISSION_GRANTED,
        AuditAction.PERMISSION_REVOKED,
        AuditAction.PASSWORD_CHANGED,
        AuditAction.DATA_ACCESS,
        AuditAction.SENSITIVE_DATA_VIEW,
      ]

      const where: Record<string, unknown> = {
        action: { in: securityActions }
      }

      if (startDate && endDate) {
        where.timestamp = {
          gte: startDate,
          lte: endDate,
        }
      }

      return prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              username: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { timestamp: 'desc' }
      })
    })
  }

  async cleanupOldLogs(): Promise<number> {
    return this.withLogging('cleanupOldLogs', async () => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - AUDIT_CONFIG.RETENTION_DAYS)

      const result = await prisma.auditLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      })

      return {
        deletedCount: result.count,
        cutoffDate
      }
    })
  }

  async getAuditIndexStatus(): Promise<Promise<number> | null> {
    return this.withLogging('getAuditIndexStatus', async () => {
      // Get table statistics for performance monitoring
      const totalLogs = await prisma.auditLog.count()
      const oldestLog = await prisma.auditLog.findFirst({
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true }
      })
      const newestLog = await prisma.auditLog.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true }
      })

      return {
        totalLogs,
        oldestLog: oldestLog?.timestamp,
        newestLog: newestLog?.timestamp,
        retentionDays: AUDIT_CONFIG.RETENTION_DAYS,
        recommendations: this.generatePerformanceRecommendations(totalLogs)
      }
    })
  }

  async archiveOldLogs(archiveDays: number = 365) {
    return this.withLogging('archiveOldLogs', async () => {
      const archiveDate = new Date()
      archiveDate.setDate(archiveDate.getDate() - archiveDays)

      // In a production system, you might want to export these to a separate archive table
      // or external storage before deletion
      const logsToArchive = await prisma.auditLog.findMany({
        where: {
          timestamp: {
            lt: archiveDate,
            gte: new Date(archiveDate.getTime() - (90 * 24 * 60 * 60 * 1000)) // Last 90 days before archive
          }
        },
        take: 10000 // Process in batches
      })

      // For now, just return the count that would be archived
      return {
        eligibleForArchive: logsToArchive.length,
        archiveDate,
        recommendation: 'Consider implementing external archive storage for long-term retention'
      }
    })
  }

  async optimizeAuditTables(): Promise<unknown> {
    return this.withLogging('optimizeAuditTables', async () => {
      // This would typically run database-specific optimization commands
      // For SQLite in development, we'll just analyze table statistics
      const stats = await this.getAuditIndexStatus()
      
      return {
        optimizationRun: true,
        timestamp: new Date(),
        tableStats: stats,
        recommendations: [
          'Regular cleanup of old logs improves query performance',
          'Consider partitioning audit tables by date for large volumes',
          'Index on userId, entityType, and timestamp for common queries',
          'Archive old logs to separate storage for compliance'
        ]
      }
    })
  }

  // Helper methods
  private sanitizeAuditData(data: AuditLog): AuditLog {
    const sanitized = { ...data }

    // Remove sensitive fields from metadata
    if (sanitized.metadata) {
      sanitized.metadata = this.removeSensitiveFields(sanitized.metadata)
    }

    // Remove sensitive fields from before/after data
    if (sanitized.beforeData) {
      sanitized.beforeData = this.removeSensitiveFields(sanitized.beforeData)
    }

    if (sanitized.afterData) {
      sanitized.afterData = this.removeSensitiveFields(sanitized.afterData)
    }

    // Limit metadata size
    if (sanitized.metadata && JSON.stringify(sanitized.metadata).length > AUDIT_CONFIG.MAX_METADATA_SIZE) {
      sanitized.metadata = { 
        ...sanitized.metadata, 
        _truncated: true,
        _originalSize: JSON.stringify(sanitized.metadata).length
      }
    }

    return sanitized
  }

  private removeSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
    const cleaned = { ...obj }
    
    AUDIT_CONFIG.SENSITIVE_FIELDS.forEach(field => {
      if (cleaned[field]) {
        cleaned[field] = '[REDACTED]'
      }
    })

    return cleaned
  }

  private determineSeverity(action: AuditAction, entityType: EntityType): string {
    if (AUDIT_CONFIG.HIGH_PRIORITY_ACTIONS.includes(action)) {
      return 'HIGH'
    }

    if (AUDIT_CONFIG.CRITICAL_ENTITIES.includes(entityType)) {
      return 'MEDIUM'
    }

    return 'LOW'
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  private calculateDateRange(period: string, startDate?: Date, endDate?: Date, now: Date = new Date()) {
    if (startDate && endDate) {
      return { start: startDate, end: endDate }
    }

    const end = endDate || now
    let start: Date

    switch (period) {
      case 'day':
        start = new Date(end)
        start.setDate(start.getDate() - 1)
        break
      case 'week':
        start = new Date(end)
        start.setDate(start.getDate() - 7)
        break
      case 'month':
        start = new Date(end)
        start.setMonth(start.getMonth() - 1)
        break
      case 'year':
        start = new Date(end)
        start.setFullYear(start.getFullYear() - 1)
        break
      default:
        start = new Date(end)
        start.setMonth(start.getMonth() - 1)
    }

    return { start, end }
  }

  private aggregateStatistics(logs: Array<{ action: string; entityType: string; userId: string; timestamp: Date }>, groupBy: string) {
    const stats: Record<string, number> = {}

    logs.forEach(log => {
      let key: string
      
      switch (groupBy) {
        case 'action':
          key = log.action
          break
        case 'entityType':
          key = log.entityType
          break
        case 'user':
          key = log.userId
          break
        case 'day':
          key = new Date(log.timestamp).toISOString().split('T')[0]
          break
        case 'hour':
          key = new Date(log.timestamp).toISOString().slice(0, 13)
          break
        default:
          key = log.action
      }

      stats[key] = (stats[key] || 0) + 1
    })

    return {
      groupBy,
      totalLogs: logs.length,
      breakdown: stats,
    }
  }

  private exportToCSV(data: Array<Record<string, unknown>>, options: AuditExport) {
    const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'IP Address']
    
    if (options.includeMetadata) {
      headers.push('Metadata')
    }
    
    if (options.includeBeforeAfter) {
      headers.push('Before Data', 'After Data')
    }

    const rows = data.map(log => {
      const row = [
        log.timestamp,
        log.user?.username || log.userId,
        log.action,
        log.entityType,
        log.entityId,
        log.ipAddress || '',
      ]

      if (options.includeMetadata) {
        row.push(JSON.stringify(log.metadata || {}))
      }

      if (options.includeBeforeAfter) {
        row.push(JSON.stringify(log.beforeData || {}))
        row.push(JSON.stringify(log.afterData || {}))
      }

      return row
    })

    return {
      format: 'CSV',
      headers,
      data: rows,
      filename: `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
    }
  }

  private exportToJSON(data: any[], options: AuditExport) {
    const exportData = data.map(log => {
      const item: Record<string, unknown> = {
        timestamp: log.timestamp,
        user: log.user?.username || log.userId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        ipAddress: log.ipAddress,
      }

      if (options.includeMetadata) {
        item.metadata = log.metadata
      }

      if (options.includeBeforeAfter) {
        item.beforeData = log.beforeData
        item.afterData = log.afterData
      }

      return item
    })

    return {
      format: 'JSON',
      data: exportData,
      filename: `audit-logs-${new Date().toISOString().split('T')[0]}.json`
    }
  }

  private exportToPDF(data: any[], options: AuditExport) {
    // This would require a PDF generation library
    // For now, return structured data that can be used by a PDF generator
    return {
      format: 'PDF',
      title: 'Audit Log Report',
      generatedAt: new Date().toISOString(),
      totalRecords: data.length,
      data: data.slice(0, 100), // Limit for PDF
      filename: `audit-logs-${new Date().toISOString().split('T')[0]}.pdf`
    }
  }

  private generateComplianceReport(logs: any[], options: AuditCompliance) {
    const report = {
      period: {
        startDate: options.startDate,
        endDate: options.endDate
      },
      summary: {
        totalEvents: logs.length,
        uniqueUsers: new Set(logs.map(l => l.userId)).size,
        criticalEvents: logs.filter(l => 
          AUDIT_CONFIG.HIGH_PRIORITY_ACTIONS.includes(l.action)
        ).length,
        securityEvents: logs.filter(l => [
          AuditAction.LOGIN_FAILED,
          AuditAction.SECURITY_VIOLATION,
          AuditAction.PERMISSION_GRANTED,
          AuditAction.PERMISSION_REVOKED
        ].includes(l.action)).length,
      },
      breakdown: {
        byAction: this.groupBy(logs, 'action'),
        byEntityType: this.groupBy(logs, 'entityType'),
        byUser: this.groupBy(logs, 'userId'),
        byDay: this.groupByDay(logs),
      },
      anomalies: this.detectAnomalies(logs),
      recommendations: this.generateRecommendations(logs),
    }

    return report
  }

  private groupBy(logs: any[], field: string) {
    return logs.reduce((acc, log) => {
      const key = log[field]
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }

  private groupByDay(logs: any[]) {
    return logs.reduce((acc, log) => {
      const day = new Date(log.timestamp).toISOString().split('T')[0]
      acc[day] = (acc[day] || 0) + 1
      return acc
    }, {})
  }

  private detectAnomalies(logs: any[]) {
    const anomalies = []

    // Detect unusual activity patterns
    const userActivity = this.groupBy(logs, 'userId')
    const avgActivity = Object.values(userActivity).reduce((sum: number, count: number) => sum + count, 0) / Object.keys(userActivity).length

    Object.entries(userActivity).forEach(([userId, count]) => {
      if (count > avgActivity * 3) {
        anomalies.push({
          type: 'HIGH_USER_ACTIVITY',
          userId,
          count,
          threshold: avgActivity * 3
        })
      }
    })

    // Detect failed login attempts
    const failedLogins = logs.filter(l => l.action === AuditAction.LOGIN_FAILED)
    if (failedLogins.length > 10) {
      anomalies.push({
        type: 'MULTIPLE_FAILED_LOGINS',
        count: failedLogins.length,
        threshold: 10
      })
    }

    return anomalies
  }

  private generateRecommendations(logs: any[]) {
    const recommendations = []

    // Check for security recommendations
    const securityEvents = logs.filter(l => [
      AuditAction.LOGIN_FAILED,
      AuditAction.SECURITY_VIOLATION
    ].includes(l.action))

    if (securityEvents.length > 0) {
      recommendations.push({
        category: 'SECURITY',
        priority: 'HIGH',
        message: 'Review security events and consider implementing additional security measures'
      })
    }

    // Check for data access patterns
    const dataAccessEvents = logs.filter(l => l.action === AuditAction.SENSITIVE_DATA_VIEW)
    if (dataAccessEvents.length > 100) {
      recommendations.push({
        category: 'DATA_PRIVACY',
        priority: 'MEDIUM',
        message: 'High volume of sensitive data access detected. Consider reviewing access controls'
      })
    }

    return recommendations
  }

  private generatePerformanceRecommendations(totalLogs: number) {
    const recommendations = []

    if (totalLogs > 1000000) {
      recommendations.push({
        type: 'CRITICAL',
        message: 'Large audit log table detected. Consider partitioning or archiving.',
        action: 'Implement log archiving strategy'
      })
    } else if (totalLogs > 100000) {
      recommendations.push({
        type: 'WARNING',
        message: 'Audit log table is growing large. Monitor performance.',
        action: 'Schedule regular cleanup jobs'
      })
    }

    if (totalLogs > 50000) {
      recommendations.push({
        type: 'INFO',
        message: 'Consider implementing log aggregation for reporting.',
        action: 'Create summary tables for common queries'
      })
    }

    return recommendations
  }
}