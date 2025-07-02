import fetch from 'node-fetch'

async function testLeadCreation(): Promise<void> {
  try {
    console.log('Testing Lead Creation via API...')
    
    // First, login to get a token
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    })
    
    if (!loginResponse.ok) {
      console.error('Login failed:', await loginResponse.text())
      return
    }
    
    const loginData = await loginResponse.json()
    const authToken = loginData.token
    console.log('✅ Login successful')
    
    // Create a lead
    const leadResponse = await fetch('http://localhost:3000/api/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${authToken}`
      },
      body: JSON.stringify({
        firstName: 'API',
        lastName: 'Test',
        email: 'api.test@example.com',
        phone: '+971501234567',
        company: 'API Test Company',
        source: 'WEBSITE',
        notes: 'Created via API test'
      })
    })
    
    if (!leadResponse.ok) {
      const errorText = await leadResponse.text()
      console.error('Lead creation failed:', errorText)
      return
    }
    
    const lead = await leadResponse.json()
    console.log('✅ Lead created successfully:', {
      id: lead.id,
      name: lead.name,
      email: lead.email
    })
    
    // Get leads list
    const listResponse = await fetch('http://localhost:3000/api/leads?limit=5', {
      headers: {
        'Cookie': `auth-token=${authToken}`
      }
    })
    
    if (!listResponse.ok) {
      console.error('Failed to fetch leads:', await listResponse.text())
      return
    }
    
    const leadsList = await listResponse.json()
    console.log(`✅ Fetched ${leadsList.data.length} leads from API`)
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testLeadCreation()