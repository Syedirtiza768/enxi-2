import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/leads/route'
import { POST as PostById, PUT, DELETE } from '@/app/api/leads/[id]/route'
import { LeadSource, LeadStatus } from '@/lib/generated/prisma'

// Mock the LeadService
jest.mock('@/lib/services/lead.service')
import { LeadService } from '@/lib/services/lead.service'

// Mock authentication
jest.mock('@/lib/utils/auth', () => ({
  getUserFromRequest: jest.fn().mockResolvedValue({
    id: 'user-123',
    username: 'testuser',
    role: 'USER'
  })
}))

describe('/api/leads', () => {
  let mockLeadService: jest.Mocked<LeadService>

  beforeEach(() => {
    mockLeadService = {
      createLead: jest.fn(),
      getLeads: jest.fn(),
      getLeadById: jest.fn(),
      updateLead: jest.fn(),
      deleteLead: jest.fn(),
      getLeadStats: jest.fn(),
    } as any

    ;(LeadService as jest.MockedClass<typeof LeadService>).mockImplementation(() => mockLeadService)
    jest.clearAllMocks()
  })

  describe('POST /api/leads', () => {
    it('should create a lead successfully', async () => {
      const leadData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        company: 'Acme Corp',
        jobTitle: 'Manager',
        source: LeadSource.WEBSITE,
        notes: 'Interested in our services',
      }

      const mockCreatedLead = {
        id: 'lead-123',
        ...leadData,
        status: LeadStatus.NEW,
        createdBy: 'user-123',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockLeadService.createLead.mockResolvedValue(mockCreatedLead)

      const request = new NextRequest('http://localhost:3000/api/leads', {
        method: 'POST',
        body: JSON.stringify(leadData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(201)
      expect(mockLeadService.createLead).toHaveBeenCalledWith(leadData, 'user-123')
      expect(result).toEqual(mockCreatedLead)
    })

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        firstName: '', // Empty required field
        lastName: 'Doe',
        email: 'invalid-email', // Invalid email
      }

      const request = new NextRequest('http://localhost:3000/api/leads', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('validation')
    })

    it('should handle service errors', async () => {
      const leadData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        source: LeadSource.WEBSITE,
      }

      mockLeadService.createLead.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/leads', {
        method: 'POST',
        body: JSON.stringify(leadData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Failed to create lead')
    })
  })

  describe('GET /api/leads', () => {
    it('should retrieve leads with pagination', async () => {
      const mockLeads = {
        data: [
          {
            id: 'lead-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            status: LeadStatus.NEW,
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      }

      mockLeadService.getLeads.mockResolvedValue(mockLeads)

      const request = new NextRequest('http://localhost:3000/api/leads?page=1&limit=10')

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(mockLeadService.getLeads).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      })
      expect(result).toEqual(mockLeads)
    })

    it('should handle search and filter parameters', async () => {
      const mockLeads = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      }

      mockLeadService.getLeads.mockResolvedValue(mockLeads)

      const request = new NextRequest('http://localhost:3000/api/leads?search=john&status=NEW&source=WEBSITE')

      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockLeadService.getLeads).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'john',
        status: LeadStatus.NEW,
        source: LeadSource.WEBSITE,
      })
    })
  })
})

describe('/api/leads/[id]', () => {
  let mockLeadService: jest.Mocked<LeadService>

  beforeEach(() => {
    mockLeadService = {
      createLead: jest.fn(),
      getLeads: jest.fn(),
      getLeadById: jest.fn(),
      updateLead: jest.fn(),
      deleteLead: jest.fn(),
      getLeadStats: jest.fn(),
    } as any

    ;(LeadService as jest.MockedClass<typeof LeadService>).mockImplementation(() => mockLeadService)
    jest.clearAllMocks()
  })

  describe('PUT /api/leads/[id]', () => {
    it('should update a lead successfully', async () => {
      const updateData = {
        status: LeadStatus.CONTACTED,
        notes: 'Updated notes',
      }

      const mockUpdatedLead = {
        id: 'lead-123',
        firstName: 'John',
        lastName: 'Doe',
        status: LeadStatus.CONTACTED,
        notes: 'Updated notes',
        updatedBy: 'user-123',
      }

      mockLeadService.updateLead.mockResolvedValue(mockUpdatedLead)

      const request = new NextRequest('http://localhost:3000/api/leads/lead-123', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: { id: 'lead-123' } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(mockLeadService.updateLead).toHaveBeenCalledWith('lead-123', updateData, 'user-123')
      expect(result).toEqual(mockUpdatedLead)
    })

    it('should return 404 for non-existent lead', async () => {
      const updateData = {
        status: LeadStatus.CONTACTED,
      }

      mockLeadService.updateLead.mockRejectedValue(new Error('Record not found'))

      const request = new NextRequest('http://localhost:3000/api/leads/non-existent', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: { id: 'non-existent' } })
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('Lead not found')
    })
  })

  describe('DELETE /api/leads/[id]', () => {
    it('should delete a lead successfully', async () => {
      mockLeadService.deleteLead.mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/leads/lead-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: 'lead-123' } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(mockLeadService.deleteLead).toHaveBeenCalledWith('lead-123')
      expect(result).toEqual({ success: true })
    })

    it('should return 404 for non-existent lead', async () => {
      mockLeadService.deleteLead.mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/leads/non-existent', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: 'non-existent' } })
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('Lead not found')
    })
  })
})