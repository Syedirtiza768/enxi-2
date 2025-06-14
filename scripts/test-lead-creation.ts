import { prisma } from '@/lib/db/prisma'
import { LeadService } from '@/lib/services/lead.service'

async function testLeadCreation(): Promise<void> {
  console.log('🧪 Testing lead creation...\n')
  
  try {
    // 1. First ensure we have a test user
    console.log('1. Checking for test user...')
    let testUser = await prisma.user.findFirst({
      where: { username: 'admin' }
    })
    
    if (!testUser) {
      console.log('Creating test user...')
      testUser = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@test.com',
          password: 'hashed_password', // In real app this should be hashed
          role: 'ADMIN'
        }
      })
    }
    console.log(`✅ Test user ready: ${testUser.username} (${testUser.id})\n`)
    
    // 2. Test lead service directly
    console.log('2. Testing LeadService directly...')
    const leadService = new LeadService()
    
    const testLeadData = {
      firstName: 'Test',
      lastName: 'Lead',
      email: `test.lead.${Date.now()}@example.com`,
      phone: '+1234567890',
      company: 'Test Company',
      jobTitle: 'Test Manager',
      source: 'WEBSITE' as const,
      notes: 'Created via test script'
    }
    
    console.log('Creating lead with data:', testLeadData)
    
    const lead = await leadService.createLead(testLeadData, testUser.id)
    
    console.log('✅ Lead created successfully!')
    console.log('Lead details:', {
      id: lead.id,
      name: `${lead.firstName} ${lead.lastName}`,
      email: lead.email,
      status: lead.status
    })
    
    // 3. Test duplicate email handling
    console.log('\n3. Testing duplicate email handling...')
    try {
      await leadService.createLead(testLeadData, testUser.id)
      console.log('❌ Duplicate email should have been rejected!')
    } catch (error) {
      console.log('✅ Duplicate email correctly rejected:', error instanceof Error ? error.message : error)
    }
    
    // 4. Test validation
    console.log('\n4. Testing validation...')
    try {
      await leadService.createLead({
        firstName: '',
        lastName: '',
        email: 'invalid-email',
        source: 'WEBSITE' as const
      }, testUser.id)
      console.log('❌ Invalid data should have been rejected!')
    } catch (error) {
      console.log('✅ Invalid data correctly rejected:', error instanceof Error ? error.message : error)
    }
    
    // 5. Check database state
    console.log('\n5. Checking database state...')
    const leadCount = await prisma.lead.count()
    console.log(`Total leads in database: ${leadCount}`)
    
    // 6. Test via API endpoint simulation
    console.log('\n6. Simulating API endpoint call...')
    const { POST } = await import('@/app/api/leads/route')
    
    // Create a mock NextRequest
    const mockRequest = {
      json: async () => ({
        firstName: 'API',
        lastName: 'Test',
        email: `api.test.${Date.now()}@example.com`,
        source: 'WEBSITE'
      }),
      headers: new Headers({
        'authorization': 'Bearer mock-token'
      }),
      cookies: {
        get: () => null
      }
    } as any
    
    try {
      // Mock getUserFromRequest to return our test user
      const originalGetUser = require('@/lib/utils/auth').getUserFromRequest
      require('@/lib/utils/auth').getUserFromRequest = async () => testUser
      
      const response = await POST(mockRequest)
      const responseData = await response.json()
      
      if (response.status === 201) {
        console.log('✅ API endpoint working correctly')
        console.log('Created lead:', responseData)
      } else {
        console.log('❌ API endpoint returned error:', responseData)
      }
      
      // Restore original function
      require('@/lib/utils/auth').getUserFromRequest = originalGetUser
    } catch (error) {
      console.error('❌ API endpoint error:', error)
    }
    
    console.log('\n✅ All tests completed!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      })
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testLeadCreation()