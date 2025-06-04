import { LeadService } from '@/lib/services/lead.service'
import { AuthService } from '@/lib/services/auth.service'
import { LeadSource, LeadStatus } from '@/lib/generated/prisma'
import { prisma } from '@/lib/db/prisma'

describe('Lead API Integration', () => {
  let leadService: LeadService
  let authService: AuthService
  let testUserId: string

  beforeAll(async () => {
    leadService = new LeadService()
    authService = new AuthService()
    
    // Create a test user
    const testUser = await authService.createUser({
      username: 'testleaduser',
      email: 'testlead@example.com',
      password: 'testpass123',
      role: 'USER'
    })
    testUserId = testUser.id
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.lead.deleteMany({
      where: { createdBy: testUserId }
    })
    await prisma.user.delete({
      where: { id: testUserId }
    })
  })

  beforeEach(async () => {
    // Clean up leads before each test
    await prisma.lead.deleteMany({
      where: { createdBy: testUserId }
    })
  })

  describe('Lead CRUD Operations', () => {
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

      const result = await leadService.createLead(leadData, testUserId)

      expect(result.id).toBeDefined()
      expect(result.firstName).toBe(leadData.firstName)
      expect(result.lastName).toBe(leadData.lastName)
      expect(result.email).toBe(leadData.email)
      expect(result.status).toBe(LeadStatus.NEW)
      expect(result.createdBy).toBe(testUserId)
    })

    it('should retrieve leads with pagination', async () => {
      // Create test leads
      const leadData1 = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        source: LeadSource.WEBSITE,
      }
      const leadData2 = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        source: LeadSource.REFERRAL,
      }

      await leadService.createLead(leadData1, testUserId)
      await leadService.createLead(leadData2, testUserId)

      const result = await leadService.getLeads({ page: 1, limit: 10 })

      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
    })

    it('should filter leads by status', async () => {
      // Create leads with different statuses
      const lead1 = await leadService.createLead({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        source: LeadSource.WEBSITE,
      }, testUserId)

      // Update one lead to CONTACTED status
      await leadService.updateLead(lead1.id, { status: LeadStatus.CONTACTED }, testUserId)

      await leadService.createLead({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        source: LeadSource.WEBSITE,
      }, testUserId)

      // Filter by NEW status
      const newLeads = await leadService.getLeads({ 
        page: 1, 
        limit: 10, 
        status: LeadStatus.NEW 
      })

      // Filter by CONTACTED status
      const contactedLeads = await leadService.getLeads({ 
        page: 1, 
        limit: 10, 
        status: LeadStatus.CONTACTED 
      })

      expect(newLeads.data).toHaveLength(1)
      expect(newLeads.data[0].status).toBe(LeadStatus.NEW)
      expect(contactedLeads.data).toHaveLength(1)
      expect(contactedLeads.data[0].status).toBe(LeadStatus.CONTACTED)
    })

    it('should search leads by name and email', async () => {
      await leadService.createLead({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        source: LeadSource.WEBSITE,
      }, testUserId)

      await leadService.createLead({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        source: LeadSource.WEBSITE,
      }, testUserId)

      // Search by first name
      const johnResults = await leadService.getLeads({ 
        page: 1, 
        limit: 10, 
        search: 'john' 
      })

      // Search by email
      const emailResults = await leadService.getLeads({ 
        page: 1, 
        limit: 10, 
        search: 'jane.smith' 
      })

      expect(johnResults.data).toHaveLength(1)
      expect(johnResults.data[0].firstName).toBe('John')
      expect(emailResults.data).toHaveLength(1)
      expect(emailResults.data[0].email).toBe('jane.smith@example.com')
    })

    it('should update a lead successfully', async () => {
      const lead = await leadService.createLead({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        source: LeadSource.WEBSITE,
      }, testUserId)

      const updateData = {
        status: LeadStatus.CONTACTED,
        notes: 'Initial contact made',
        phone: '+1234567890',
      }

      const updatedLead = await leadService.updateLead(lead.id, updateData, testUserId)

      expect(updatedLead.status).toBe(LeadStatus.CONTACTED)
      expect(updatedLead.notes).toBe('Initial contact made')
      expect(updatedLead.phone).toBe('+1234567890')
      expect(updatedLead.updatedBy).toBe(testUserId)
    })

    it('should delete a lead successfully', async () => {
      const lead = await leadService.createLead({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        source: LeadSource.WEBSITE,
      }, testUserId)

      const deleteResult = await leadService.deleteLead(lead.id)
      expect(deleteResult).toBe(true)

      const retrievedLead = await leadService.getLeadById(lead.id)
      expect(retrievedLead).toBeNull()
    })

    it('should get lead statistics', async () => {
      // Create leads with different statuses
      const lead1 = await leadService.createLead({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        source: LeadSource.WEBSITE,
      }, testUserId)

      const lead2 = await leadService.createLead({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        source: LeadSource.WEBSITE,
      }, testUserId)

      // Update statuses
      await leadService.updateLead(lead1.id, { status: LeadStatus.CONTACTED }, testUserId)
      await leadService.updateLead(lead2.id, { status: LeadStatus.QUALIFIED }, testUserId)

      const stats = await leadService.getLeadStats()

      expect(stats.CONTACTED).toBeGreaterThanOrEqual(1)
      expect(stats.QUALIFIED).toBeGreaterThanOrEqual(1)
      expect(typeof stats.NEW).toBe('number')
    })
  })
})