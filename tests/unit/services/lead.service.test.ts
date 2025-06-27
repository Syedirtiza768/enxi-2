/**
 * Unit tests for LeadService
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { LeadService } from '@/lib/services/lead.service'
import { Prisma } from "@prisma/client"
import { LeadStatus, LeadSource } from "@/lib/types/shared-enums"
import { prismaMock, setupCommonMocks } from '@/tests/helpers/mock-prisma'
import { testFactory } from '@/tests/helpers/test-utils'

describe('LeadService', () => {
  let service: LeadService
  const testUserId = 'test-user-id'

  beforeEach(() => {
    setupCommonMocks()
    service = new LeadService()
  })

  describe('createLead', () => {
    it('should create a lead with default status', async () => {
      const input = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        company: 'Test Company',
        source: LeadSource.WEBSITE,
        createdBy: testUserId,
      }

      const expectedLead = {
        id: 'lead-id',
        ...input,
        status: LeadStatus.NEW,
        createdAt: new Date(),
        updatedAt: new Date(),
        position: null,
        notes: null,
        assignedToId: null,
        convertedAt: null,
        convertedBy: null,
      }

      prismaMock.lead.create.mockResolvedValue(expectedLead)

      const result = await service.createLead(input)

      expect(result).toEqual(expectedLead)
      expect(prismaMock.lead.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...input,
          status: LeadStatus.NEW,
        }),
      })
    })

    it('should handle duplicate email error', async () => {
      const input = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@example.com',
        source: LeadSource.REFERRAL,
        createdBy: testUserId,
      }

      prismaMock.lead.create.mockRejectedValue(
        new Error('Unique constraint failed on the fields: (`email`)')
      )

      await expect(service.createLead(input)).rejects.toThrow('Unique constraint')
    })
  })

  describe('updateLeadStatus', () => {
    it('should update lead status and set convertedAt for CONVERTED status', async () => {
      const leadId = 'lead-id'
      const existingLead = {
        id: leadId,
        status: LeadStatus.CONTACTED,
        firstName: 'John',
        lastName: 'Doe',
      }

      const updatedLead = {
        ...existingLead,
        status: LeadStatus.CONVERTED,
        convertedAt: new Date(),
        convertedBy: testUserId,
      }

      prismaMock.lead.findUnique.mockResolvedValue(existingLead as any)
      prismaMock.lead.update.mockResolvedValue(updatedLead as any)

      const result = await service.updateLeadStatus(leadId, LeadStatus.CONVERTED, testUserId)

      expect(prismaMock.lead.update).toHaveBeenCalledWith({
        where: { id: leadId },
        data: {
          status: LeadStatus.CONVERTED,
          convertedAt: expect.any(Date),
          convertedBy: testUserId,
        },
      })
      expect(result.status).toBe(LeadStatus.CONVERTED)
      expect(result.convertedAt).toBeDefined()
    })

    it('should update status without setting convertedAt for non-CONVERTED status', async () => {
      const leadId = 'lead-id'
      const existingLead = {
        id: leadId,
        status: LeadStatus.NEW,
      }

      prismaMock.lead.findUnique.mockResolvedValue(existingLead as any)
      prismaMock.lead.update.mockResolvedValue({
        ...existingLead,
        status: LeadStatus.QUALIFIED,
      } as any)

      await service.updateLeadStatus(leadId, LeadStatus.QUALIFIED, testUserId)

      expect(prismaMock.lead.update).toHaveBeenCalledWith({
        where: { id: leadId },
        data: {
          status: LeadStatus.QUALIFIED,
        },
      })
    })
  })

  describe('getLeadsByStatus', () => {
    it('should return leads filtered by status', async () => {
      const mockLeads = [
        { id: '1', firstName: 'John', status: LeadStatus.NEW },
        { id: '2', firstName: 'Jane', status: LeadStatus.NEW },
      ]

      prismaMock.lead.findMany.mockResolvedValue(mockLeads as any)

      const result = await service.getLeadsByStatus(LeadStatus.NEW)

      expect(prismaMock.lead.findMany).toHaveBeenCalledWith({
        where: { status: LeadStatus.NEW },
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toEqual(mockLeads)
    })
  })

  describe('searchLeads', () => {
    it('should search leads by multiple fields', async () => {
      const searchTerm = 'john'
      const mockLeads = [
        { id: '1', firstName: 'John', lastName: 'Doe' },
        { id: '2', firstName: 'Johnny', lastName: 'Smith' },
      ]

      prismaMock.lead.findMany.mockResolvedValue(mockLeads as any)

      const result = await service.searchLeads(searchTerm)

      expect(prismaMock.lead.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { company: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toEqual(mockLeads)
    })
  })

  describe('assignLead', () => {
    it('should assign lead to a user', async () => {
      const leadId = 'lead-id'
      const assignToId = 'sales-user-id'

      const updatedLead = {
        id: leadId,
        assignedToId: assignToId,
        firstName: 'John',
        lastName: 'Doe',
      }

      prismaMock.lead.update.mockResolvedValue(updatedLead as any)

      const result = await service.assignLead(leadId, assignToId)

      expect(prismaMock.lead.update).toHaveBeenCalledWith({
        where: { id: leadId },
        data: { assignedToId: assignToId },
      })
      expect(result.assignedToId).toBe(assignToId)
    })
  })
})