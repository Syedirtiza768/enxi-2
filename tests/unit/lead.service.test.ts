import { LeadService } from '@/lib/services/lead.service'
import { CreateLeadData, UpdateLeadData, LeadResponse } from '@/lib/types/lead.types'
import { LeadSource, LeadStatus } from "@/lib/types/shared-enums"

// Mock Prisma
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    lead: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  },
}))

import { prisma } from '@/lib/db/prisma'

describe('LeadService', () => {
  let leadService: LeadService
  const mockUserId = 'user-123'
  const mockPrisma = prisma as jest.Mocked<typeof prisma>

  beforeEach(() => {
    leadService = new LeadService()
    jest.clearAllMocks()
  })

  describe('createLead', () => {
    const createData: CreateLeadData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      company: 'Acme Corp',
      jobTitle: 'Manager',
      source: LeadSource.WEBSITE,
      notes: 'Interested in our services',
    }

    it('should create a lead successfully', async () => {
      const mockLead = {
        id: 'lead-123',
        ...createData,
        status: LeadStatus.NEW,
        createdBy: mockUserId,
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.lead.create.mockResolvedValue(mockLead as any)

      const result = await leadService.createLead(createData, mockUserId)

      expect(mockPrisma.lead.create).toHaveBeenCalledWith({
        data: {
          ...createData,
          status: LeadStatus.NEW,
          createdBy: mockUserId,
        },
      })
      expect(result).toEqual(mockLead)
    })

    it('should handle database errors during creation', async () => {
      mockPrisma.lead.create.mockRejectedValue(new Error('Database error'))

      await expect(leadService.createLead(createData, mockUserId)).rejects.toThrow('Database error')
    })

    it('should validate required fields', async () => {
      const invalidData = {
        firstName: '',
        lastName: 'Doe',
        email: 'invalid-email',
      } as CreateLeadData

      await expect(leadService.createLead(invalidData, mockUserId)).rejects.toThrow()
    })
  })

  describe('getLeads', () => {
    it('should retrieve leads with pagination', async () => {
      const mockLeads = [
        {
          id: 'lead-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: LeadStatus.NEW,
          createdAt: new Date(),
        },
        {
          id: 'lead-2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          status: LeadStatus.CONTACTED,
          createdAt: new Date(),
        },
      ]

      mockPrisma.lead.findMany.mockResolvedValue(mockLeads as any)
      mockPrisma.lead.count.mockResolvedValue(2)

      const result = await leadService.getLeads({ page: 1, limit: 10 })

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toEqual({
        data: mockLeads,
        total: 2,
        page: 1,
        limit: 10,
      })
    })

    it('should filter leads by status', async () => {
      const mockLeads = [
        {
          id: 'lead-1',
          firstName: 'John',
          lastName: 'Doe',
          status: LeadStatus.QUALIFIED,
        },
      ]

      mockPrisma.lead.findMany.mockResolvedValue(mockLeads as any)
      mockPrisma.lead.count.mockResolvedValue(1)

      await leadService.getLeads({ page: 1, limit: 10, status: LeadStatus.QUALIFIED })

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: { status: LeadStatus.QUALIFIED },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should search leads by name or email', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([])
      mockPrisma.lead.count.mockResolvedValue(0)

      await leadService.getLeads({ page: 1, limit: 10, search: 'john' })

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {
          OR: [
            { firstName: { contains: 'john' } },
            { lastName: { contains: 'john' } },
            { email: { contains: 'john' } },
            { company: { contains: 'john' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('getLeadById', () => {
    it('should retrieve a lead by ID', async () => {
      const mockLead = {
        id: 'lead-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        status: LeadStatus.NEW,
      }

      mockPrisma.lead.findUnique.mockResolvedValue(mockLead as any)

      const result = await leadService.getLeadById('lead-123')

      expect(mockPrisma.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 'lead-123' },
      })
      expect(result).toEqual(mockLead)
    })

    it('should return null for non-existent lead', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null)

      const result = await leadService.getLeadById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('updateLead', () => {
    const updateData: UpdateLeadData = {
      status: LeadStatus.CONTACTED,
      notes: 'Updated notes',
    }

    it('should update a lead successfully', async () => {
      const mockUpdatedLead = {
        id: 'lead-123',
        firstName: 'John',
        lastName: 'Doe',
        status: LeadStatus.CONTACTED,
        notes: 'Updated notes',
        updatedBy: mockUserId,
      }

      mockPrisma.lead.update.mockResolvedValue(mockUpdatedLead as any)

      const result = await leadService.updateLead('lead-123', updateData, mockUserId)

      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-123' },
        data: {
          ...updateData,
          updatedBy: mockUserId,
        },
      })
      expect(result).toEqual(mockUpdatedLead)
    })

    it('should handle non-existent lead updates', async () => {
      mockPrisma.lead.update.mockRejectedValue(new Error('Record not found'))

      await expect(leadService.updateLead('non-existent', updateData, mockUserId))
        .rejects.toThrow('Record not found')
    })
  })

  describe('deleteLead', () => {
    it('should delete a lead successfully', async () => {
      mockPrisma.lead.delete.mockResolvedValue({ id: 'lead-123' } as any)

      const result = await leadService.deleteLead('lead-123')

      expect(mockPrisma.lead.delete).toHaveBeenCalledWith({
        where: { id: 'lead-123' },
      })
      expect(result).toBe(true)
    })

    it('should return false for non-existent lead deletion', async () => {
      mockPrisma.lead.delete.mockRejectedValue(new Error('Record not found'))

      const result = await leadService.deleteLead('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('getLeadStats', () => {
    it('should return lead statistics by status', async () => {
      const mockStats = [
        { status: LeadStatus.NEW, _count: 5 },
        { status: LeadStatus.CONTACTED, _count: 3 },
        { status: LeadStatus.QUALIFIED, _count: 2 },
      ]

      ;(mockPrisma.lead as any).groupBy.mockResolvedValue(mockStats)

      const result = await leadService.getLeadStats()

      expect((mockPrisma.lead as any).groupBy).toHaveBeenCalledWith({
        by: ['status'],
        _count: true,
      })
      expect(result).toEqual({
        NEW: 5,
        CONTACTED: 3,
        QUALIFIED: 2,
        PROPOSAL_SENT: 0,
        NEGOTIATING: 0,
        CONVERTED: 0,
        LOST: 0,
        DISQUALIFIED: 0,
      })
    })
  })
})