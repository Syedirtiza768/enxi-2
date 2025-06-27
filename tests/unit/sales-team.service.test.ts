import { SalesTeamService } from '@/lib/services/sales-team.service'
import { prisma } from '@/lib/db/prisma'
import { Role } from "@prisma/client"
import bcrypt from 'bcryptjs'

// Mock the prisma client
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    salesTeamMember: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}))

// Mock bcrypt
jest.mock('bcryptjs')

describe('SalesTeamService', () => {
  let salesTeamService: SalesTeamService
  const mockPrisma = prisma as jest.Mocked<typeof prisma>

  beforeEach(() => {
    salesTeamService = new SalesTeamService()
    jest.clearAllMocks()
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password')
  })

  describe('assignSalesManager', () => {
    it('should assign a sales manager to a salesperson', async () => {
      const salespersonId = 'salesperson-1'
      const managerId = 'manager-1'
      const assignedBy = 'admin-1'

      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: salespersonId,
          role: Role.SALES_REP,
        } as any)
        .mockResolvedValueOnce({
          id: managerId,
          role: Role.MANAGER,
        } as any)

      mockPrisma.user.update.mockResolvedValue({
        id: salespersonId,
        managerId,
      } as any)

      const result = await salesTeamService.assignSalesManager(
        salespersonId,
        managerId,
        assignedBy
      )

      expect(result.managerId).toBe(managerId)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: salespersonId },
        data: { managerId },
      })
    })

    it('should throw error if salesperson is not SALES_REP', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        role: Role.ADMIN,
      } as any)

      await expect(
        salesTeamService.assignSalesManager('user-1', 'manager-1', 'admin-1')
      ).rejects.toThrow('User must have SALES_REP role')
    })

    it('should throw error if manager is not MANAGER role', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'salesperson-1',
          role: Role.SALES_REP,
        } as any)
        .mockResolvedValueOnce({
          id: 'user-1',
          role: Role.USER,
        } as any)

      await expect(
        salesTeamService.assignSalesManager('salesperson-1', 'user-1', 'admin-1')
      ).rejects.toThrow('Manager must have MANAGER role')
    })
  })

  describe('assignCustomerToSalesperson', () => {
    it('should assign a customer to a salesperson', async () => {
      const customerId = 'customer-1'
      const salespersonId = 'salesperson-1'
      const assignedBy = 'admin-1'

      mockPrisma.user.findUnique.mockResolvedValue({
        id: salespersonId,
        role: Role.SALES_REP,
      } as any)

      mockPrisma.customer.findUnique.mockResolvedValue({
        id: customerId,
      } as any)

      mockPrisma.customer.update.mockResolvedValue({
        id: customerId,
        assignedToId: salespersonId,
        assignedAt: new Date(),
        assignedBy,
      } as any)

      const result = await salesTeamService.assignCustomerToSalesperson(
        customerId,
        salespersonId,
        assignedBy
      )

      expect(result.assignedToId).toBe(salespersonId)
      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: customerId },
        data: {
          assignedToId: salespersonId,
          assignedAt: expect.any(Date),
          assignedBy,
        },
      })
    })

    it('should allow assigning customer to manager', async () => {
      const customerId = 'customer-1'
      const managerId = 'manager-1'
      const assignedBy = 'admin-1'

      mockPrisma.user.findUnique.mockResolvedValue({
        id: managerId,
        role: Role.MANAGER,
      } as any)

      mockPrisma.customer.findUnique.mockResolvedValue({
        id: customerId,
      } as any)

      mockPrisma.customer.update.mockResolvedValue({
        id: customerId,
        assignedToId: managerId,
      } as any)

      const result = await salesTeamService.assignCustomerToSalesperson(
        customerId,
        managerId,
        assignedBy
      )

      expect(result.assignedToId).toBe(managerId)
    })
  })

  describe('getTeamHierarchy', () => {
    it('should return team hierarchy for a manager', async () => {
      const managerId = 'manager-1'
      const teamMembers = [
        { id: 'rep-1', username: 'rep1', managerId },
        { id: 'rep-2', username: 'rep2', managerId },
      ]

      mockPrisma.user.findUnique.mockResolvedValue({
        id: managerId,
        username: 'manager',
        role: Role.MANAGER,
        managedUsers: teamMembers.map(tm => ({
          ...tm,
          assignedCustomers: [],
          profile: null,
          salesTeamMember: null,
        })),
      } as any)

      const result = await salesTeamService.getTeamHierarchy(managerId)

      expect(result.manager.id).toBe(managerId)
      expect(result.teamMembers).toHaveLength(2)
      expect(result.teamMembers[0].id).toBe('rep-1')
    })
  })

  describe('getAccessibleCustomers', () => {
    it('should return only assigned customers for salesperson', async () => {
      const salespersonId = 'salesperson-1'
      const customers = [
        { id: 'customer-1', name: 'Customer 1', assignedToId: salespersonId },
        { id: 'customer-2', name: 'Customer 2', assignedToId: salespersonId },
      ]

      mockPrisma.user.findUnique.mockResolvedValue({
        id: salespersonId,
        role: Role.SALES_REP,
      } as any)

      mockPrisma.customer.findMany.mockResolvedValue(customers as any)

      const result = await salesTeamService.getAccessibleCustomers(salespersonId)

      expect(result).toHaveLength(2)
      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assignedToId: salespersonId },
        })
      )
    })

    it('should return team customers for manager', async () => {
      const managerId = 'manager-1'
      const teamMemberIds = ['rep-1', 'rep-2']
      const customers = [
        { id: 'customer-1', name: 'Customer 1', assignedToId: managerId },
        { id: 'customer-2', name: 'Customer 2', assignedToId: 'rep-1' },
        { id: 'customer-3', name: 'Customer 3', assignedToId: 'rep-2' },
      ]

      mockPrisma.user.findUnique.mockResolvedValue({
        id: managerId,
        role: Role.MANAGER,
        managedUsers: teamMemberIds.map(id => ({ id })),
      } as any)

      mockPrisma.customer.findMany.mockResolvedValue(customers as any)

      const result = await salesTeamService.getAccessibleCustomers(managerId)

      expect(result).toHaveLength(3)
      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { assignedToId: managerId },
              { assignedToId: { in: teamMemberIds } },
            ],
          },
        })
      )
    })

    it('should return all customers for admin', async () => {
      const adminId = 'admin-1'
      const customers = [
        { id: 'customer-1', name: 'Customer 1' },
        { id: 'customer-2', name: 'Customer 2' },
      ]

      mockPrisma.user.findUnique.mockResolvedValue({
        id: adminId,
        role: Role.ADMIN,
      } as any)

      mockPrisma.customer.findMany.mockResolvedValue(customers as any)

      const result = await salesTeamService.getAccessibleCustomers(adminId)

      expect(result).toHaveLength(2)
      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      )
    })
  })

  describe('canAccessCustomer', () => {
    it('should allow salesperson to access assigned customer', async () => {
      const salespersonId = 'salesperson-1'
      const customerId = 'customer-1'

      mockPrisma.user.findUnique.mockResolvedValue({
        id: salespersonId,
        role: Role.SALES_REP,
      } as any)

      mockPrisma.customer.findUnique.mockResolvedValue({
        id: customerId,
        assignedToId: salespersonId,
      } as any)

      const result = await salesTeamService.canAccessCustomer(salespersonId, customerId)

      expect(result).toBe(true)
    })

    it('should deny salesperson access to unassigned customer', async () => {
      const salespersonId = 'salesperson-1'
      const customerId = 'customer-1'

      mockPrisma.user.findUnique.mockResolvedValue({
        id: salespersonId,
        role: Role.SALES_REP,
      } as any)

      mockPrisma.customer.findUnique.mockResolvedValue({
        id: customerId,
        assignedToId: 'other-salesperson',
      } as any)

      const result = await salesTeamService.canAccessCustomer(salespersonId, customerId)

      expect(result).toBe(false)
    })

    it('should allow manager to access team member customer', async () => {
      const managerId = 'manager-1'
      const customerId = 'customer-1'
      const salespersonId = 'salesperson-1'

      mockPrisma.user.findUnique.mockResolvedValue({
        id: managerId,
        role: Role.MANAGER,
        managedUsers: [{ id: salespersonId }],
      } as any)

      mockPrisma.customer.findUnique.mockResolvedValue({
        id: customerId,
        assignedToId: salespersonId,
      } as any)

      const result = await salesTeamService.canAccessCustomer(managerId, customerId)

      expect(result).toBe(true)
    })
  })

  describe('getTeamPerformance', () => {
    it('should return performance metrics for a team', async () => {
      const managerId = 'manager-1'
      const teamMembers = [
        { 
          id: 'rep-1', 
          salesTeamMember: { 
            currentMonthSales: 10000,
            yearToDateSales: 50000,
            salesTarget: 15000,
          },
        },
        { 
          id: 'rep-2', 
          salesTeamMember: { 
            currentMonthSales: 12000,
            yearToDateSales: 60000,
            salesTarget: 15000,
          },
        },
      ]

      mockPrisma.user.findUnique.mockResolvedValue({
        id: managerId,
        role: Role.MANAGER,
        managedUsers: teamMembers,
      } as any)

      mockPrisma.customer.count
        .mockResolvedValueOnce(5) // manager's customers
        .mockResolvedValueOnce(10) // rep-1's customers
        .mockResolvedValueOnce(8) // rep-2's customers

      const result = await salesTeamService.getTeamPerformance(managerId)

      expect(result.totalCurrentMonthSales).toBe(22000)
      expect(result.totalYearToDateSales).toBe(110000)
      expect(result.totalTarget).toBe(30000)
      expect(result.teamMembers).toHaveLength(2)
      expect(result.totalCustomers).toBe(23)
    })
  })
})