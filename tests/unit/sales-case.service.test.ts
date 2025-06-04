import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { SalesCaseService } from '@/lib/services/sales-case.service'
import { CustomerService } from '@/lib/services/customer.service'
import { SalesCaseStatus } from '@/lib/generated/prisma'
import { prisma } from '@/lib/db/prisma'

describe('Sales Case Service', () => {
  let service: SalesCaseService
  let customerService: CustomerService
  let testUserId: string
  let testCustomerId: string

  beforeEach(async () => {
    service = new SalesCaseService()
    customerService = new CustomerService()
    
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'USER'
      }
    })
    testUserId = testUser.id

    // Create a test customer
    const testCustomer = await customerService.createCustomer({
      name: 'Test Customer',
      email: 'customer@test.com',
      createdBy: testUserId
    })
    testCustomerId = testCustomer.id
  })

  afterEach(async () => {
    // Clean up test data in correct order
    await prisma.auditLog.deleteMany()
    await prisma.journalLine.deleteMany()
    await prisma.journalEntry.deleteMany()
    await prisma.quotation.deleteMany()
    await prisma.salesCase.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.account.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Sales Case Creation', () => {
    it('should create a new sales case', async () => {
      const caseData = {
        customerId: testCustomerId,
        title: 'New Software Implementation',
        description: 'Implementation of ERP system',
        estimatedValue: 50000,
        assignedTo: testUserId,
        createdBy: testUserId
      }

      const salesCase = await service.createSalesCase(caseData)

      expect(salesCase).toBeDefined()
      expect(salesCase.caseNumber).toMatch(/^CASE-\d{4}$/)
      expect(salesCase.title).toBe('New Software Implementation')
      expect(salesCase.status).toBe(SalesCaseStatus.OPEN)
      expect(salesCase.estimatedValue).toBe(50000)
      expect(salesCase.customer).toBeDefined()
    })

    it('should generate sequential case numbers', async () => {
      const case1 = await service.createSalesCase({
        customerId: testCustomerId,
        title: 'Case 1',
        createdBy: testUserId
      })

      const case2 = await service.createSalesCase({
        customerId: testCustomerId,
        title: 'Case 2',
        createdBy: testUserId
      })

      expect(case1.caseNumber).toBe('CASE-0001')
      expect(case2.caseNumber).toBe('CASE-0002')
    })

    it('should handle non-existent customer', async () => {
      await expect(
        service.createSalesCase({
          customerId: 'non-existent-id',
          title: 'Test Case',
          createdBy: testUserId
        })
      ).rejects.toThrow('Customer not found')
    })
  })

  describe('Sales Case Updates', () => {
    let salesCaseId: string

    beforeEach(async () => {
      const salesCase = await service.createSalesCase({
        customerId: testCustomerId,
        title: 'Update Test Case',
        estimatedValue: 30000,
        createdBy: testUserId
      })
      salesCaseId = salesCase.id
    })

    it('should update sales case details', async () => {
      const updates = {
        title: 'Updated Case Title',
        estimatedValue: 45000,
        description: 'Updated description'
      }

      const updatedCase = await service.updateSalesCase(salesCaseId, updates, testUserId)

      expect(updatedCase.title).toBe('Updated Case Title')
      expect(updatedCase.estimatedValue).toBe(45000)
      expect(updatedCase.description).toBe('Updated description')
    })

    it('should calculate profit margin on update', async () => {
      const updates = {
        actualValue: 40000,
        cost: 25000
      }

      const updatedCase = await service.updateSalesCase(salesCaseId, updates, testUserId)

      expect(updatedCase.actualValue).toBe(40000)
      expect(updatedCase.cost).toBe(25000)
      expect(updatedCase.profitMargin).toBe(37.5) // (40000 - 25000) / 40000 * 100
    })
  })

  describe('Sales Case Workflow', () => {
    let salesCaseId: string

    beforeEach(async () => {
      const salesCase = await service.createSalesCase({
        customerId: testCustomerId,
        title: 'Workflow Test Case',
        estimatedValue: 100000,
        createdBy: testUserId
      })
      salesCaseId = salesCase.id
    })

    it('should close sales case as won', async () => {
      const closedCase = await service.closeSalesCase(
        salesCaseId,
        SalesCaseStatus.WON,
        120000,
        70000,
        testUserId
      )

      expect(closedCase.status).toBe(SalesCaseStatus.WON)
      expect(closedCase.actualValue).toBe(120000)
      expect(closedCase.cost).toBe(70000)
      expect(closedCase.profitMargin).toBeCloseTo(41.67, 2) // (120000 - 70000) / 120000 * 100
      expect(closedCase.closedAt).toBeDefined()
    })

    it('should close sales case as lost', async () => {
      const closedCase = await service.closeSalesCase(
        salesCaseId,
        SalesCaseStatus.LOST,
        0,
        5000, // Costs incurred
        testUserId
      )

      expect(closedCase.status).toBe(SalesCaseStatus.LOST)
      expect(closedCase.actualValue).toBe(0)
      expect(closedCase.cost).toBe(5000)
      expect(closedCase.closedAt).toBeDefined()
    })

    it('should prevent closing already closed case', async () => {
      await service.closeSalesCase(
        salesCaseId,
        SalesCaseStatus.WON,
        100000,
        60000,
        testUserId
      )

      await expect(
        service.closeSalesCase(
          salesCaseId,
          SalesCaseStatus.LOST,
          0,
          0,
          testUserId
        )
      ).rejects.toThrow('Sales case is already closed')
    })

    it('should assign sales case to user', async () => {
      const assignedCase = await service.assignSalesCase(
        salesCaseId,
        'new-user-id',
        testUserId
      )

      expect(assignedCase.assignedTo).toBe('new-user-id')
    })
  })

  describe('Sales Case Metrics', () => {
    beforeEach(async () => {
      // Create multiple sales cases for metrics testing
      const cases = [
        {
          title: 'Won Case 1',
          estimatedValue: 50000,
          status: SalesCaseStatus.WON,
          actualValue: 55000,
          cost: 30000
        },
        {
          title: 'Won Case 2',
          estimatedValue: 80000,
          status: SalesCaseStatus.WON,
          actualValue: 75000,
          cost: 40000
        },
        {
          title: 'Lost Case',
          estimatedValue: 60000,
          status: SalesCaseStatus.LOST,
          actualValue: 0,
          cost: 5000
        },
        {
          title: 'Open Case',
          estimatedValue: 100000,
          status: SalesCaseStatus.OPEN
        }
      ]

      for (const caseData of cases) {
        const salesCase = await service.createSalesCase({
          customerId: testCustomerId,
          title: caseData.title,
          estimatedValue: caseData.estimatedValue,
          createdBy: testUserId
        })

        if (caseData.status !== SalesCaseStatus.OPEN) {
          await service.closeSalesCase(
            salesCase.id,
            caseData.status,
            caseData.actualValue || 0,
            caseData.cost || 0,
            testUserId
          )
        }
      }
    })

    it('should calculate sales metrics correctly', async () => {
      const metrics = await service.getSalesCaseMetrics()

      expect(metrics.totalCases).toBe(4)
      expect(metrics.openCases).toBe(1)
      expect(metrics.wonCases).toBe(2)
      expect(metrics.lostCases).toBe(1)
      expect(metrics.totalEstimatedValue).toBe(290000) // 50k + 80k + 60k + 100k
      expect(metrics.totalActualValue).toBe(130000) // 55k + 75k
      expect(metrics.totalProfit).toBe(55000) // 130k - 75k
      expect(metrics.averageWinRate).toBe(66.67) // 2 won / 3 closed * 100
    })

    it('should filter metrics by customer', async () => {
      const metrics = await service.getSalesCaseMetrics({
        customerId: testCustomerId
      })

      expect(metrics.totalCases).toBe(4)
    })

    it('should filter metrics by date range', async () => {
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const metrics = await service.getSalesCaseMetrics({
        dateFrom: today,
        dateTo: tomorrow
      })

      expect(metrics.totalCases).toBe(4) // All created today
    })
  })

  describe('Sales Case Timeline', () => {
    let salesCaseId: string

    beforeEach(async () => {
      const salesCase = await service.createSalesCase({
        customerId: testCustomerId,
        title: 'Timeline Test Case',
        createdBy: testUserId
      })
      salesCaseId = salesCase.id

      // Update the case to generate timeline events
      await service.updateSalesCase(
        salesCaseId,
        { estimatedValue: 75000 },
        testUserId
      )
    })

    it('should get sales case timeline', async () => {
      const timeline = await service.getSalesCaseTimeline(salesCaseId)

      expect(timeline).toBeDefined()
      expect(timeline.length).toBeGreaterThan(0)
      expect(timeline.some(event => event.action === 'CREATE')).toBe(true)
      expect(timeline.some(event => event.action === 'UPDATE')).toBe(true)
    })

    it('should handle non-existent sales case timeline', async () => {
      await expect(
        service.getSalesCaseTimeline('non-existent-id')
      ).rejects.toThrow('Sales case not found')
    })
  })

  describe('Sales Case Queries', () => {
    beforeEach(async () => {
      // Create multiple sales cases
      await service.createSalesCase({
        customerId: testCustomerId,
        title: 'Open Case 1',
        status: SalesCaseStatus.OPEN,
        createdBy: testUserId
      })

      await service.createSalesCase({
        customerId: testCustomerId,
        title: 'Open Case 2',
        status: SalesCaseStatus.OPEN,
        assignedTo: 'other-user',
        createdBy: testUserId
      })

      const wonCase = await service.createSalesCase({
        customerId: testCustomerId,
        title: 'Won Case',
        createdBy: testUserId
      })

      await service.closeSalesCase(
        wonCase.id,
        SalesCaseStatus.WON,
        50000,
        30000,
        testUserId
      )
    })

    it('should get all sales cases', async () => {
      const cases = await service.getAllSalesCases()
      expect(cases).toHaveLength(3)
    })

    it('should filter by status', async () => {
      const openCases = await service.getAllSalesCases({ status: SalesCaseStatus.OPEN })
      expect(openCases).toHaveLength(2)

      const wonCases = await service.getAllSalesCases({ status: SalesCaseStatus.WON })
      expect(wonCases).toHaveLength(1)
    })

    it('should filter by assigned user', async () => {
      const cases = await service.getAllSalesCases({ assignedTo: 'other-user' })
      expect(cases).toHaveLength(1)
      expect(cases[0].title).toBe('Open Case 2')
    })

    it('should search by title', async () => {
      const cases = await service.getAllSalesCases({ search: 'Won' })
      expect(cases).toHaveLength(1)
      expect(cases[0].title).toBe('Won Case')
    })

    it('should paginate results', async () => {
      const page1 = await service.getAllSalesCases({ limit: 2, offset: 0 })
      const page2 = await service.getAllSalesCases({ limit: 2, offset: 2 })

      expect(page1).toHaveLength(2)
      expect(page2).toHaveLength(1)
    })
  })
})