// API ROUTE TEST FIXED
import { MockNextRequest, mockNextResponse, mockSession } from '@/tests/helpers/mock-utilities'
import { prisma } from '@/lib/db/prisma'
import { GET, POST } from '@/app/api/leads/route'
import { LeadService } from '@/lib/services/lead.service'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => Promise.resolve(mockSession()))
}))

// Mock NextResponse
const mockResponses = mockNextResponse()
jest.mock('next/server', () => ({
  NextRequest: MockNextRequest,
  NextResponse: mockResponses
}))

// Mock LeadService
jest.mock('@/lib/services/lead.service', () => ({
  LeadService: jest.fn().mockImplementation(() => ({
    createLead: jest.fn(),
    getLeads: jest.fn(),
    updateLead: jest.fn(),
    deleteLead: jest.fn()
  }))
}))

describe('Lead API Routes', () => {
  let mockLeadService: any
  
  beforeEach(() => {
    jest.clearAllMocks()
    mockLeadService = new LeadService()
  })
  
  describe('GET /api/leads', () => {
    it('should return leads successfully', async () => {
      const mockLeads = [
        { id: '1', firstName: 'John', lastName: 'Doe' }
      ]
      
      mockLeadService.getLeads.mockResolvedValue({
        data: mockLeads,
        total: 1
      })
      
      const request = new MockNextRequest('http://localhost:3000/api/leads')
      const result = await GET(request as any)
      
      expect(result).toEqual({
        type: 'json',
        data: { data: mockLeads, total: 1 },
        status: 200,
        headers: {}
      })
    })
  })
  
  describe('POST /api/leads', () => {
    it('should create lead successfully', async () => {
      const leadData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      }
      
      const mockCreatedLead = { id: '1', ...leadData }
      mockLeadService.createLead.mockResolvedValue(mockCreatedLead)
      
      const request = new MockNextRequest('http://localhost:3000/api/leads', {
        method: 'POST',
        body: leadData
      })
      
      const result = await POST(request as any)
      
      expect(result).toEqual({
        type: 'json',
        data: mockCreatedLead,
        status: 201,
        headers: {}
      })
    })
  })
})
