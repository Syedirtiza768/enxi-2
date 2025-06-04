import { AuditService } from '@/lib/services/audit.service'
import { prisma } from '@/lib/db/prisma'
import { AuditAction } from '@/lib/validators/audit.validator'

// Mock Prisma
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

describe('AuditService', () => {
  let auditService: AuditService
  
  beforeEach(() => {
    auditService = new AuditService()
    jest.clearAllMocks()
  })

  describe('logAction', () => {
    it('should create an audit log entry', async () => {
      const auditData = {
        userId: 'user-123',
        action: AuditAction.CREATE,
        entityType: 'User',
        entityId: 'entity-123',
        metadata: { username: 'testuser' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      }

      const mockCreatedLog = {
        id: 'audit-123',
        ...auditData,
        timestamp: new Date(),
      }

      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue(mockCreatedLog)

      const result = await auditService.logAction(auditData)

      expect(result).toEqual(mockCreatedLog)
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: auditData,
      })
    })

    it('should handle errors gracefully', async () => {
      const auditData = {
        userId: 'user-123',
        action: AuditAction.CREATE,
        entityType: 'User',
        entityId: 'entity-123',
      }

      ;(prisma.auditLog.create as jest.Mock).mockRejectedValue(
        new Error('Database error')
      )

      // Should not throw, but log error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      await auditService.logAction(auditData)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to create audit log:',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('getAuditLogs', () => {
    it('should retrieve audit logs with filters', async () => {
      const filters = {
        userId: 'user-123',
        entityType: 'User',
        action: AuditAction.UPDATE,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      }

      const mockLogs = [
        {
          id: 'audit-1',
          userId: 'user-123',
          action: AuditAction.UPDATE,
          entityType: 'User',
          entityId: 'entity-1',
          timestamp: new Date(),
        },
      ]

      ;(prisma.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs)
      ;(prisma.auditLog.count as jest.Mock).mockResolvedValue(1)

      const result = await auditService.getAuditLogs(filters, { page: 1, limit: 10 })

      expect(result).toEqual({
        data: mockLogs,
        total: 1,
        page: 1,
        limit: 10,
      })

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: filters.userId,
          entityType: filters.entityType,
          action: filters.action,
          timestamp: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        },
        orderBy: { timestamp: 'desc' },
        skip: 0,
        take: 10,
      })
    })

    it('should handle pagination correctly', async () => {
      const mockLogs = Array(25).fill(null).map((_, i) => ({
        id: `audit-${i}`,
        userId: 'user-123',
        action: AuditAction.READ,
        entityType: 'Lead',
        entityId: `lead-${i}`,
        timestamp: new Date(),
      }))

      ;(prisma.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs.slice(10, 20))
      ;(prisma.auditLog.count as jest.Mock).mockResolvedValue(25)

      const result = await auditService.getAuditLogs({}, { page: 2, limit: 10 })

      expect(result).toEqual({
        data: mockLogs.slice(10, 20),
        total: 25,
        page: 2,
        limit: 10,
      })

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { timestamp: 'desc' },
        skip: 10,
        take: 10,
      })
    })
  })

  describe('getEntityHistory', () => {
    it('should retrieve history for a specific entity', async () => {
      const entityType = 'User'
      const entityId = 'user-123'

      const mockHistory = [
        {
          id: 'audit-1',
          action: AuditAction.CREATE,
          entityType,
          entityId,
          metadata: { username: 'olduser' },
          timestamp: new Date('2024-01-01'),
        },
        {
          id: 'audit-2',
          action: AuditAction.UPDATE,
          entityType,
          entityId,
          metadata: { username: 'newuser' },
          beforeData: { username: 'olduser' },
          timestamp: new Date('2024-01-02'),
        },
      ]

      ;(prisma.auditLog.findMany as jest.Mock).mockResolvedValue(mockHistory)

      const result = await auditService.getEntityHistory(entityType, entityId)

      expect(result).toEqual(mockHistory)
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { entityType, entityId },
        orderBy: { timestamp: 'desc' },
      })
    })
  })

  describe('getUserActivity', () => {
    it('should retrieve all actions by a specific user', async () => {
      const userId = 'user-123'

      const mockActivity = [
        {
          id: 'audit-1',
          userId,
          action: AuditAction.CREATE,
          entityType: 'Lead',
          entityId: 'lead-1',
          timestamp: new Date(),
        },
        {
          id: 'audit-2',
          userId,
          action: AuditAction.UPDATE,
          entityType: 'SalesCase',
          entityId: 'case-1',
          timestamp: new Date(),
        },
      ]

      ;(prisma.auditLog.findMany as jest.Mock).mockResolvedValue(mockActivity)
      ;(prisma.auditLog.count as jest.Mock).mockResolvedValue(2)

      const result = await auditService.getUserActivity(userId, { page: 1, limit: 10 })

      expect(result).toEqual({
        data: mockActivity,
        total: 2,
        page: 1,
        limit: 10,
      })

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        skip: 0,
        take: 10,
      })
    })
  })

  describe('generateAuditReport', () => {
    it('should generate summary statistics', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')

      const mockLogs = [
        { action: AuditAction.CREATE, entityType: 'Lead', userId: 'user-1' },
        { action: AuditAction.CREATE, entityType: 'Lead', userId: 'user-1' },
        { action: AuditAction.UPDATE, entityType: 'Lead', userId: 'user-2' },
        { action: AuditAction.DELETE, entityType: 'SalesCase', userId: 'user-1' },
      ]

      ;(prisma.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs)

      const result = await auditService.generateAuditReport(startDate, endDate)

      expect(result).toEqual({
        period: { startDate, endDate },
        totalActions: 4,
        actionBreakdown: {
          [AuditAction.CREATE]: 2,
          [AuditAction.UPDATE]: 1,
          [AuditAction.DELETE]: 1,
        },
        entityBreakdown: {
          Lead: 3,
          SalesCase: 1,
        },
        userBreakdown: {
          'user-1': 3,
          'user-2': 1,
        },
      })
    })
  })
})