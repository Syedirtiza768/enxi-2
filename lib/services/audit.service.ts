import { prisma } from '@/lib/db/prisma'
import { AuditLog, AuditFilter, Pagination, AuditAction as _AuditAction } from '@/lib/validators/audit.validator'

export class AuditService {
  async logAction(data: AuditLog) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          metadata: data.metadata || undefined,
          beforeData: data.beforeData || undefined,
          afterData: data.afterData || undefined,
          ipAddress: data.ipAddress || undefined,
          userAgent: data.userAgent || undefined,
        },
      })
    } catch (error) {
      console.error('Error logging action:', error);
      throw error;
    }
  }

  async getAuditLogs(
    filters: AuditFilter = {},
    pagination: Pagination = { page: 1, limit: 10 }
  ) {
    const where: Record<string, unknown> = {}

    if (filters.userId) where.userId = filters.userId
    if (filters.entityType) where.entityType = filters.entityType
    if (filters.entityId) where.entityId = filters.entityId
    if (filters.action) where.action = filters.action
    
    if (filters.startDate || filters.endDate) {
      where.timestamp = {}
      if (filters.startDate) where.timestamp.gte = filters.startDate
      if (filters.endDate) where.timestamp.lte = filters.endDate
    }

    const skip = (pagination.page - 1) * pagination.limit

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: pagination.limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    return {
      data,
      total,
      page: pagination.page,
      limit: pagination.limit,
    }
  }

  async getEntityHistory(entityType: string, entityId: string) {
    return prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { timestamp: 'desc' },
    })
  }

  async getUserActivity(userId: string, pagination: Pagination = { page: 1, limit: 10 }) {
    const skip = (pagination.page - 1) * pagination.limit

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        skip,
        take: pagination.limit,
      }),
      prisma.auditLog.count({ where: { userId } }),
    ])

    return {
      data,
      total,
      page: pagination.page,
      limit: pagination.limit,
    }
  }

  async generateAuditReport(startDate: Date, endDate: Date) {
    const logs = await prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    const actionBreakdown: Record<string, number> = {}
    const entityBreakdown: Record<string, number> = {}
    const userBreakdown: Record<string, number> = {}

    logs.forEach((log) => {
      // Count by action
      actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1
      
      // Count by entity type
      entityBreakdown[log.entityType] = (entityBreakdown[log.entityType] || 0) + 1
      
      // Count by user
      userBreakdown[log.userId] = (userBreakdown[log.userId] || 0) + 1
    })

    return {
      period: { startDate, endDate },
      totalActions: logs.length,
      actionBreakdown,
      entityBreakdown,
      userBreakdown,
    }
  }
}