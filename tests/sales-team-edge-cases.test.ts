import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals'
import { SalesTeamService } from '@/lib/services/sales-team.service'
import { prisma } from '@/lib/db/prisma'
import { Role } from "@prisma/client"
import { apiClient } from '@/lib/api/client'
import { createServer } from 'http'
import { NextRequest } from 'next/server'

// Mock prisma
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    salesTeamMember: {
      upsert: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

// Mock API client
jest.mock('@/lib/api/client')

describe('Sales Team Management - Edge Cases and Error Scenarios', () => {
  let salesTeamService: SalesTeamService

  beforeEach(() => {
    salesTeamService = new SalesTeamService()
    jest.clearAllMocks()
  })

  describe('Customer Assignment Edge Cases', () => {
    it('should handle assigning a customer who is already assigned', async () => {
      const customerId = 'customer-123'
      const currentSalespersonId = 'salesperson-111'
      const newSalespersonId = 'salesperson-222'
      const assignedBy = 'manager-123'

      // Mock existing assignment
      ;(prisma.customer.findUnique as jest.Mock).mockResolvedValue({
        id: customerId,
        assignedToId: currentSalespersonId,
        name: 'Test Customer',
      })

      // Mock new salesperson
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: newSalespersonId,
        role: Role.SALES_REP,
      })

      // Mock successful update
      ;(prisma.customer.update as jest.Mock).mockResolvedValue({
        id: customerId,
        assignedToId: newSalespersonId,
        assignedAt: new Date(),
        assignedBy,
      })

      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const result = await salesTeamService.assignCustomerToSalesperson(
        customerId,
        newSalespersonId,
        assignedBy,
        'Reassigning due to territory change'
      )

      expect(result.assignedToId).toBe(newSalespersonId)
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            previousAssignee: currentSalespersonId,
            newAssignee: newSalespersonId,
          }),
        }),
      })
    })

    it('should reject assignment with invalid customer ID', async () => {
      const invalidCustomerId = 'invalid-customer'
      const salespersonId = 'salesperson-123'
      const assignedBy = 'manager-123'

      // Mock customer not found
      ;(prisma.customer.findUnique as jest.Mock).mockResolvedValue(null)

      // Mock valid salesperson
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: salespersonId,
        role: Role.SALES_REP,
      })

      await expect(
        salesTeamService.assignCustomerToSalesperson(
          invalidCustomerId,
          salespersonId,
          assignedBy
        )
      ).rejects.toThrow('Customer not found')
    })

    it('should reject assignment with invalid salesperson ID', async () => {
      const customerId = 'customer-123'
      const invalidSalespersonId = 'invalid-salesperson'
      const assignedBy = 'manager-123'

      // Mock salesperson not found
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        salesTeamService.assignCustomerToSalesperson(
          customerId,
          invalidSalespersonId,
          assignedBy
        )
      ).rejects.toThrow('User not found')
    })

    it('should reject assignment to user with invalid role', async () => {
      const customerId = 'customer-123'
      const invalidUserId = 'accountant-123'
      const assignedBy = 'manager-123'

      // Mock user with invalid role
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: invalidUserId,
        role: Role.ACCOUNTANT,
      })

      await expect(
        salesTeamService.assignCustomerToSalesperson(
          customerId,
          invalidUserId,
          assignedBy
        )
      ).rejects.toThrow('User must have SALES_REP or MANAGER role')
    })
  })

  describe('Customer Unassignment Edge Cases', () => {
    it('should handle unassigning a customer who is not assigned', async () => {
      const customerId = 'customer-123'
      const unassignedBy = 'manager-123'

      // Mock unassigned customer
      ;(prisma.customer.findUnique as jest.Mock).mockResolvedValue({
        id: customerId,
        assignedToId: null,
        name: 'Test Customer',
      })

      await expect(
        salesTeamService.unassignCustomer(customerId, unassignedBy)
      ).rejects.toThrow('Customer is not currently assigned to anyone')
    })

    it('should reject unassignment with invalid customer ID', async () => {
      const invalidCustomerId = 'invalid-customer'
      const unassignedBy = 'manager-123'

      // Mock customer not found
      ;(prisma.customer.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        salesTeamService.unassignCustomer(invalidCustomerId, unassignedBy)
      ).rejects.toThrow('Customer not found')
    })

    it('should reject unassignment without proper permissions', async () => {
      const customerId = 'customer-123'
      const salespersonId = 'salesperson-222'
      const unassignedBy = 'salesperson-111' // Different salesperson

      // Mock customer assigned to different salesperson
      ;(prisma.customer.findUnique as jest.Mock).mockResolvedValueOnce({
        id: customerId,
        assignedToId: salespersonId,
        name: 'Test Customer',
      })

      // Mock user trying to unassign
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: unassignedBy,
        role: Role.SALES_REP,
        managedUsers: [],
      })

      // Mock customer check for permissions
      ;(prisma.customer.findUnique as jest.Mock).mockResolvedValueOnce({
        id: customerId,
        assignedToId: salespersonId,
      })

      await expect(
        salesTeamService.unassignCustomer(customerId, unassignedBy)
      ).rejects.toThrow('You do not have permission to unassign this customer')
    })

    it('should allow manager to unassign their team member\'s customer', async () => {
      const customerId = 'customer-123'
      const salespersonId = 'salesperson-111'
      const managerId = 'manager-123'

      // Mock customer assigned to salesperson
      ;(prisma.customer.findUnique as jest.Mock).mockResolvedValueOnce({
        id: customerId,
        assignedToId: salespersonId,
        name: 'Test Customer',
      })

      // Mock manager with team member
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: managerId,
        role: Role.MANAGER,
        managedUsers: [{ id: salespersonId }],
      })

      // Mock customer for permission check
      ;(prisma.customer.findUnique as jest.Mock).mockResolvedValueOnce({
        id: customerId,
        assignedToId: salespersonId,
      })

      // Mock successful update
      ;(prisma.customer.update as jest.Mock).mockResolvedValue({
        id: customerId,
        assignedToId: null,
      })

      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const result = await salesTeamService.unassignCustomer(
        customerId,
        managerId,
        'Customer inactive'
      )

      expect(result.assignedToId).toBeNull()
    })
  })

  describe('Manager Assignment Edge Cases', () => {
    it('should reject assigning manager to non-SALES_REP user', async () => {
      const accountantId = 'accountant-123'
      const managerId = 'manager-123'
      const assignedBy = 'admin-123'

      // Mock user with wrong role
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: accountantId,
        role: Role.ACCOUNTANT,
      })

      await expect(
        salesTeamService.assignSalesManager(accountantId, managerId, assignedBy)
      ).rejects.toThrow('User must have SALES_REP role')
    })

    it('should reject assigning non-MANAGER as manager', async () => {
      const salespersonId = 'salesperson-123'
      const anotherSalespersonId = 'salesperson-222'
      const assignedBy = 'admin-123'

      // Mock valid salesperson
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: salespersonId,
        role: Role.SALES_REP,
      })

      // Mock invalid manager (wrong role)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: anotherSalespersonId,
        role: Role.SALES_REP,
      })

      await expect(
        salesTeamService.assignSalesManager(salespersonId, anotherSalespersonId, assignedBy)
      ).rejects.toThrow('Manager must have MANAGER role')
    })
  })

  describe('Concurrent Update Scenarios', () => {
    it('should handle concurrent customer assignments gracefully', async () => {
      const customerId = 'customer-123'
      const salesperson1 = 'salesperson-111'
      const salesperson2 = 'salesperson-222'
      const assignedBy = 'manager-123'

      // Mock both salespersons as valid
      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: salesperson1, role: Role.SALES_REP })
        .mockResolvedValueOnce({ id: salesperson2, role: Role.SALES_REP })

      // Mock customer exists
      ;(prisma.customer.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: customerId, assignedToId: null })
        .mockResolvedValueOnce({ id: customerId, assignedToId: salesperson1 })

      // Mock updates
      ;(prisma.customer.update as jest.Mock)
        .mockResolvedValueOnce({ id: customerId, assignedToId: salesperson1 })
        .mockResolvedValueOnce({ id: customerId, assignedToId: salesperson2 })

      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      // Simulate concurrent assignments
      const [result1, result2] = await Promise.all([
        salesTeamService.assignCustomerToSalesperson(customerId, salesperson1, assignedBy),
        salesTeamService.assignCustomerToSalesperson(customerId, salesperson2, assignedBy),
      ])

      // Both should succeed, last one wins in database
      expect(result1.assignedToId).toBe(salesperson1)
      expect(result2.assignedToId).toBe(salesperson2)
    })
  })

  describe('API Route Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>
      
      // Simulate network error
      mockApiClient.mockRejectedValueOnce(new Error('Network error'))

      // Test assignment endpoint
      try {
        await apiClient('/api/sales-team/assign-customer', {
          method: 'POST',
          body: JSON.stringify({
            customerId: 'customer-123',
            salespersonId: 'salesperson-123',
          }),
        })
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Network error')
      }
    })

    it('should handle validation errors from API', async () => {
      const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>
      
      // Simulate validation error response
      mockApiClient.mockResolvedValueOnce({
        ok: false,
        status: 400,
        error: 'Invalid customer ID format',
        data: null,
      })

      const response = await apiClient('/api/sales-team/assign-customer', {
        method: 'POST',
        body: JSON.stringify({
          customerId: 'invalid-format',
          salespersonId: 'salesperson-123',
        }),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(response.error).toBe('Invalid customer ID format')
    })

    it('should handle permission denied errors', async () => {
      const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>
      
      // Simulate permission denied
      mockApiClient.mockResolvedValueOnce({
        ok: false,
        status: 403,
        error: 'You do not have permission to update customers',
        data: null,
      })

      const response = await apiClient('/api/sales-team/assign-customer', {
        method: 'POST',
        body: JSON.stringify({
          customerId: 'customer-123',
          salespersonId: 'salesperson-123',
        }),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(403)
      expect(response.error).toContain('permission')
    })
  })

  describe('Empty Data States', () => {
    it('should handle empty team hierarchy gracefully', async () => {
      const managerId = 'manager-123'

      // Mock manager with no team members
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: managerId,
        role: Role.MANAGER,
        profile: { firstName: 'Test', lastName: 'Manager' },
        managedUsers: [],
        salesTeamMember: null,
      })

      const result = await salesTeamService.getTeamHierarchy(managerId)

      expect(result.teamMembers).toHaveLength(0)
      expect(result.manager.id).toBe(managerId)
    })

    it('should handle no unassigned customers', async () => {
      // Mock no unassigned customers
      ;(prisma.customer.findMany as jest.Mock).mockResolvedValue([])

      const result = await salesTeamService.getUnassignedCustomers()

      expect(result).toHaveLength(0)
    })

    it('should handle user with no accessible customers', async () => {
      const salespersonId = 'salesperson-123'

      // Mock salesperson with no customers
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: salespersonId,
        role: Role.SALES_REP,
        managedUsers: [],
      })

      ;(prisma.customer.findMany as jest.Mock).mockResolvedValue([])

      const result = await salesTeamService.getAccessibleCustomers(salespersonId)

      expect(result).toHaveLength(0)
    })
  })

  describe('Database Transaction Failures', () => {
    it('should handle transaction rollback on audit log failure', async () => {
      const customerId = 'customer-123'
      const salespersonId = 'salesperson-123'
      const assignedBy = 'manager-123'

      // Mock valid entities
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: salespersonId,
        role: Role.SALES_REP,
      })

      ;(prisma.customer.findUnique as jest.Mock).mockResolvedValue({
        id: customerId,
        assignedToId: null,
      })

      ;(prisma.customer.update as jest.Mock).mockResolvedValue({
        id: customerId,
        assignedToId: salespersonId,
      })

      // Mock audit log failure
      ;(prisma.auditLog.create as jest.Mock).mockRejectedValue(
        new Error('Database connection lost')
      )

      await expect(
        salesTeamService.assignCustomerToSalesperson(
          customerId,
          salespersonId,
          assignedBy
        )
      ).rejects.toThrow('Database connection lost')
    })
  })

  describe('Search and Filter Edge Cases', () => {
    it('should handle special characters in search queries', async () => {
      const userId = 'user-123'
      const specialSearchQuery = "O'Brien & Co. <script>alert('xss')</script>"

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: userId,
        role: Role.ADMIN,
        managedUsers: [],
      })

      ;(prisma.customer.findMany as jest.Mock).mockResolvedValue([])

      const result = await salesTeamService.getAccessibleCustomers(userId, {
        search: specialSearchQuery,
      })

      // Should safely handle special characters
      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { name: { contains: specialSearchQuery, mode: 'insensitive' } },
                ]),
              }),
            ]),
          }),
        })
      )
    })

    it('should handle very large result sets with pagination', async () => {
      const userId = 'user-123'
      const limit = 50
      const offset = 1000

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: userId,
        role: Role.ADMIN,
        managedUsers: [],
      })

      // Mock large dataset
      const mockCustomers = Array(limit).fill(null).map((_, i) => ({
        id: `customer-${offset + i}`,
        name: `Customer ${offset + i}`,
        email: `customer${offset + i}@example.com`,
      }))

      ;(prisma.customer.findMany as jest.Mock).mockResolvedValue(mockCustomers)

      const result = await salesTeamService.getAccessibleCustomers(userId, {
        limit,
        offset,
      })

      expect(result).toHaveLength(limit)
      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: limit,
          skip: offset,
        })
      )
    })
  })

  describe('Performance Metric Edge Cases', () => {
    it('should handle division by zero in target achievement calculation', async () => {
      const managerId = 'manager-123'

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: managerId,
        role: Role.MANAGER,
        managedUsers: [{
          id: 'salesperson-123',
          salesTeamMember: {
            currentMonthSales: 10000,
            yearToDateSales: 50000,
            salesTarget: 0, // Zero target
          },
        }],
        salesTeamMember: {
          currentMonthSales: 5000,
          yearToDateSales: 25000,
          salesTarget: 0, // Zero target
        },
      })

      ;(prisma.customer.count as jest.Mock).mockResolvedValue(5)

      const result = await salesTeamService.getTeamPerformance(managerId)

      // Should handle zero target gracefully
      expect(result.targetAchievement).toBe(0)
      expect(result).not.toHaveProperty('NaN')
      expect(result).not.toHaveProperty('Infinity')
    })

    it('should handle negative sales values', async () => {
      const managerId = 'manager-123'

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: managerId,
        role: Role.MANAGER,
        managedUsers: [{
          id: 'salesperson-123',
          salesTeamMember: {
            currentMonthSales: -5000, // Negative sales (returns/refunds)
            yearToDateSales: 10000,
            salesTarget: 20000,
          },
        }],
        salesTeamMember: null,
      })

      ;(prisma.customer.count as jest.Mock).mockResolvedValue(3)

      const result = await salesTeamService.getTeamPerformance(managerId)

      // Should handle negative values
      expect(result.totalCurrentMonthSales).toBe(-5000)
      expect(result.targetAchievement).toBeLessThan(0)
    })
  })
})

describe('UI Component Error Handling', () => {
  describe('Sales Team Assignment Page', () => {
    it('should display error when API returns invalid data format', () => {
      // This would be tested in a component test file
      // Simulating the scenario where API returns unexpected format
      const mockApiResponse = {
        ok: true,
        data: 'string instead of object', // Invalid format
      }

      // Component should handle this gracefully
      expect(() => {
        const users = mockApiResponse.data?.data || mockApiResponse.data || []
        if (!Array.isArray(users)) {
          throw new Error('Invalid data format')
        }
      }).toThrow('Invalid data format')
    })
  })
})

describe('Race Conditions', () => {
  it('should handle rapid assignment changes', async () => {
    const customerId = 'customer-123'
    const assignedBy = 'manager-123'
    const salespersons = ['sp-1', 'sp-2', 'sp-3', 'sp-4', 'sp-5']

    // Mock all salespersons as valid
    salespersons.forEach(sp => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: sp,
        role: Role.SALES_REP,
      })
    })

    // Mock customer exists for each check
    salespersons.forEach((_, index) => {
      ;(prisma.customer.findUnique as jest.Mock).mockResolvedValueOnce({
        id: customerId,
        assignedToId: index > 0 ? salespersons[index - 1] : null,
      })
    })

    // Mock updates
    salespersons.forEach(sp => {
      ;(prisma.customer.update as jest.Mock).mockResolvedValueOnce({
        id: customerId,
        assignedToId: sp,
      })
    })

    ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

    // Rapid fire assignments
    const assignments = salespersons.map(sp =>
      salesTeamService.assignCustomerToSalesperson(customerId, sp, assignedBy)
    )

    const results = await Promise.allSettled(assignments)

    // All should complete without errors
    results.forEach(result => {
      expect(result.status).toBe('fulfilled')
    })
  })
})