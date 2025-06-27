import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createServer } from 'http'
import { NextRequest } from 'next/server'
import { POST as assignCustomerRoute } from '@/app/api/sales-team/assign-customer/route'
import { POST as unassignCustomerRoute } from '@/app/api/sales-team/unassign-customer/route'
import { GET as salesTeamRoute } from '@/app/api/sales-team/route'
import { prisma } from '@/lib/db/prisma'
import { Role } from "@prisma/client"

describe('Sales Team Management Integration Tests', () => {
  let testUsers: any = {}
  let testCustomers: any = {}

  beforeAll(async () => {
    // Create test data
    const admin = await prisma.user.create({
      data: {
        username: 'test_admin_integration',
        email: 'admin_int@example.com',
        password: 'hashed',
        role: Role.ADMIN,
      },
    })

    const manager = await prisma.user.create({
      data: {
        username: 'test_manager_integration',
        email: 'manager_int@example.com',
        password: 'hashed',
        role: Role.MANAGER,
      },
    })

    const salesperson1 = await prisma.user.create({
      data: {
        username: 'test_salesperson1_integration',
        email: 'sp1_int@example.com',
        password: 'hashed',
        role: Role.SALES_REP,
        managerId: manager.id,
      },
    })

    const salesperson2 = await prisma.user.create({
      data: {
        username: 'test_salesperson2_integration',
        email: 'sp2_int@example.com',
        password: 'hashed',
        role: Role.SALES_REP,
        managerId: manager.id,
      },
    })

    const customer1 = await prisma.customer.create({
      data: {
        customerNumber: 'INT-001',
        name: 'Integration Test Customer 1',
        email: 'customer1_int@example.com',
        phone: '555-1001',
        status: 'active',
      },
    })

    const customer2 = await prisma.customer.create({
      data: {
        customerNumber: 'INT-002',
        name: 'Integration Test Customer 2',
        email: 'customer2_int@example.com',
        phone: '555-1002',
        status: 'active',
      },
    })

    testUsers = { admin, manager, salesperson1, salesperson2 }
    testCustomers = { customer1, customer2 }
  })

  afterAll(async () => {
    // Cleanup test data
    await prisma.auditLog.deleteMany({
      where: {
        userId: {
          in: Object.values(testUsers).map((u: any) => u.id),
        },
      },
    })

    await prisma.customer.deleteMany({
      where: {
        id: {
          in: Object.values(testCustomers).map((c: any) => c.id),
        },
      },
    })

    await prisma.user.deleteMany({
      where: {
        id: {
          in: Object.values(testUsers).map((u: any) => u.id),
        },
      },
    })

    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Reset customer assignments
    await prisma.customer.updateMany({
      where: {
        id: {
          in: Object.values(testCustomers).map((c: any) => c.id),
        },
      },
      data: {
        assignedToId: null,
        assignedAt: null,
        assignedBy: null,
        assignmentNotes: null,
      },
    })
  })

  describe('Assignment Flow', () => {
    it('should handle complete assignment and unassignment flow', async () => {
      // Step 1: Assign customer to salesperson
      const assignRequest = new NextRequest(
        new URL('http://localhost:3000/api/sales-team/assign-customer'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerId: testCustomers.customer1.id,
            salespersonId: testUsers.salesperson1.id,
            notes: 'Initial assignment',
          }),
        }
      )

      // Mock authenticated user
      ;(assignRequest as any).user = { id: testUsers.manager.id }

      const assignResponse = await assignCustomerRoute(assignRequest)
      expect(assignResponse.status).toBe(200)

      const assignedCustomer = await assignResponse.json()
      expect(assignedCustomer.assignedToId).toBe(testUsers.salesperson1.id)

      // Step 2: Try to reassign to another salesperson
      const reassignRequest = new NextRequest(
        new URL('http://localhost:3000/api/sales-team/assign-customer'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerId: testCustomers.customer1.id,
            salespersonId: testUsers.salesperson2.id,
            notes: 'Reassignment test',
          }),
        }
      )

      ;(reassignRequest as any).user = { id: testUsers.manager.id }

      const reassignResponse = await assignCustomerRoute(reassignRequest)
      expect(reassignResponse.status).toBe(200)

      const reassignedCustomer = await reassignResponse.json()
      expect(reassignedCustomer.assignedToId).toBe(testUsers.salesperson2.id)

      // Step 3: Unassign the customer
      const unassignRequest = new NextRequest(
        new URL('http://localhost:3000/api/sales-team/unassign-customer'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerId: testCustomers.customer1.id,
            reason: 'Customer became inactive',
          }),
        }
      )

      ;(unassignRequest as any).user = { id: testUsers.manager.id }

      const unassignResponse = await unassignCustomerRoute(unassignRequest)
      expect(unassignResponse.status).toBe(200)

      const unassignedCustomer = await unassignResponse.json()
      expect(unassignedCustomer.assignedToId).toBeNull()
    })

    it('should prevent unauthorized unassignment', async () => {
      // First assign customer
      await prisma.customer.update({
        where: { id: testCustomers.customer1.id },
        data: {
          assignedToId: testUsers.salesperson1.id,
          assignedAt: new Date(),
          assignedBy: testUsers.manager.id,
        },
      })

      // Try to unassign as different salesperson
      const unassignRequest = new NextRequest(
        new URL('http://localhost:3000/api/sales-team/unassign-customer'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerId: testCustomers.customer1.id,
            reason: 'Unauthorized attempt',
          }),
        }
      )

      ;(unassignRequest as any).user = { id: testUsers.salesperson2.id }

      const response = await unassignCustomerRoute(unassignRequest)
      expect(response.status).toBe(400)

      const errorResponse = await response.json()
      expect(errorResponse.error).toContain('permission')
    })
  })

  describe('Data Validation', () => {
    it('should reject invalid data formats', async () => {
      const invalidRequests = [
        // Missing required fields
        {
          salespersonId: testUsers.salesperson1.id,
        },
        // Invalid ID format
        {
          customerId: 'not-a-valid-uuid',
          salespersonId: testUsers.salesperson1.id,
        },
        // Empty strings
        {
          customerId: '',
          salespersonId: '',
        },
      ]

      for (const invalidData of invalidRequests) {
        const request = new NextRequest(
          new URL('http://localhost:3000/api/sales-team/assign-customer'),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(invalidData),
          }
        )

        ;(request as any).user = { id: testUsers.manager.id }

        const response = await assignCustomerRoute(request)
        expect(response.status).toBe(400)
      }
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/sales-team/assign-customer'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: '{ invalid json }',
        }
      )

      ;(request as any).user = { id: testUsers.manager.id }

      const response = await assignCustomerRoute(request)
      expect(response.status).toBe(500)
    })
  })

  describe('Team Hierarchy', () => {
    it('should correctly return team hierarchy', async () => {
      // Assign customers to team members
      await prisma.customer.update({
        where: { id: testCustomers.customer1.id },
        data: { assignedToId: testUsers.salesperson1.id },
      })

      await prisma.customer.update({
        where: { id: testCustomers.customer2.id },
        data: { assignedToId: testUsers.salesperson2.id },
      })

      const request = new NextRequest(
        new URL('http://localhost:3000/api/sales-team')
      )

      ;(request as any).user = { id: testUsers.manager.id }

      const response = await salesTeamRoute(request)
      expect(response.status).toBe(200)

      const hierarchy = await response.json()
      expect(hierarchy.manager).toBeTruthy()
      expect(hierarchy.teamMembers).toHaveLength(2)
      expect(hierarchy.teamMembers[0].customerCount).toBeGreaterThan(0)
    })

    it('should return unassigned customers when requested', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/sales-team?view=unassigned')
      )

      ;(request as any).user = { id: testUsers.manager.id }

      const response = await salesTeamRoute(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.customers).toBeDefined()
      expect(Array.isArray(data.customers)).toBe(true)
    })
  })

  describe('Edge Case Scenarios', () => {
    it('should handle rapid concurrent assignments', async () => {
      const requests = Array(5).fill(null).map((_, index) => {
        const request = new NextRequest(
          new URL('http://localhost:3000/api/sales-team/assign-customer'),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customerId: testCustomers.customer1.id,
              salespersonId: index % 2 === 0 ? testUsers.salesperson1.id : testUsers.salesperson2.id,
              notes: `Concurrent assignment ${index}`,
            }),
          }
        )
        ;(request as any).user = { id: testUsers.manager.id }
        return assignCustomerRoute(request)
      })

      const responses = await Promise.allSettled(requests)
      
      // All requests should complete
      responses.forEach(result => {
        expect(result.status).toBe('fulfilled')
      })

      // Check final state
      const customer = await prisma.customer.findUnique({
        where: { id: testCustomers.customer1.id },
      })
      
      // Customer should be assigned to one of the salespersons
      expect([testUsers.salesperson1.id, testUsers.salesperson2.id]).toContain(customer?.assignedToId)
    })

    it('should handle special characters in search', async () => {
      // Create customer with special characters
      const specialCustomer = await prisma.customer.create({
        data: {
          customerNumber: 'SPECIAL-001',
          name: "O'Brien & Associates <test>",
          email: 'obrien@example.com',
          phone: '555-9999',
          status: 'active',
        },
      })

      try {
        const request = new NextRequest(
          new URL(`http://localhost:3000/api/sales-team?view=unassigned&search=${encodeURIComponent("O'Brien & Associates")}`)
        )

        ;(request as any).user = { id: testUsers.manager.id }

        const response = await salesTeamRoute(request)
        expect(response.status).toBe(200)

        const data = await response.json()
        expect(data.customers).toBeDefined()
        
        // Should find the customer with special characters
        const found = data.customers.find((c: any) => c.id === specialCustomer.id)
        expect(found).toBeTruthy()
      } finally {
        // Cleanup
        await prisma.customer.delete({ where: { id: specialCustomer.id } })
      }
    })
  })
})