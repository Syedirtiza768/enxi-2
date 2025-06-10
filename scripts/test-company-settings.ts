import fetch from 'node-fetch'

const API_URL = 'http://localhost:3001/api'

async function testCompanySettings() {
  console.log('Testing Company Settings API...\n')

  try {
    // Step 1: Login to get token
    console.log('1. Logging in as admin...')
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'password123'
      })
    })

    if (!loginResponse.ok) {
      const error = await loginResponse.text()
      throw new Error(`Login failed: ${error}`)
    }

    const { token, user } = await loginResponse.json()
    console.log('✅ Login successful:', { userId: user.id, email: user.email, role: user.role })

    // Step 2: Test GET company settings
    console.log('\n2. Getting company settings...')
    const getSettingsResponse = await fetch(`${API_URL}/settings/company`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!getSettingsResponse.ok) {
      const error = await getSettingsResponse.text()
      throw new Error(`Failed to get settings: ${error}`)
    }

    const settingsData = await getSettingsResponse.json()
    console.log('✅ Settings retrieved:', JSON.stringify(settingsData, null, 2))

    // Step 3: Test PUT company settings
    console.log('\n3. Updating company settings...')
    const updateResponse = await fetch(`${API_URL}/settings/company`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        companyName: 'Test Company Updated',
        defaultCurrency: 'EUR',
        address: '123 Test Street',
        phone: '+1234567890',
        email: 'test@company.com',
        website: 'https://testcompany.com'
      })
    })

    if (!updateResponse.ok) {
      const error = await updateResponse.text()
      throw new Error(`Failed to update settings: ${error}`)
    }

    const updatedSettings = await updateResponse.json()
    console.log('✅ Settings updated:', JSON.stringify(updatedSettings, null, 2))

    // Step 4: Verify the update
    console.log('\n4. Verifying the update...')
    const verifyResponse = await fetch(`${API_URL}/settings/company`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!verifyResponse.ok) {
      const error = await verifyResponse.text()
      throw new Error(`Failed to verify settings: ${error}`)
    }

    const verifiedData = await verifyResponse.json()
    console.log('✅ Settings verified:', JSON.stringify(verifiedData.settings, null, 2))

    console.log('\n✅ All company settings tests passed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testCompanySettings().catch(console.error)