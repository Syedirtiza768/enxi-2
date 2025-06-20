import { apiClient } from '../lib/api/client'

async function testCompanySettingsAPI() {
  try {
    console.log('Testing Company Settings API...\n')
    
    // Test auth token
    const authToken = 'test-admin-token' // You'll need to get a real token
    
    // 1. Get current settings
    console.log('1. Fetching current settings...')
    const getResponse = await fetch('http://localhost:3000/api/settings/company', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Cookie': `auth-token=${authToken}`
      }
    })
    
    if (!getResponse.ok) {
      console.error('Failed to fetch settings:', await getResponse.text())
      return
    }
    
    const currentData = await getResponse.json()
    console.log('Current settings:', JSON.stringify(currentData, null, 2))
    
    // 2. Get available accounts
    console.log('\n2. Fetching GL accounts...')
    const accountsResponse = await fetch('http://localhost:3000/api/accounting/accounts', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Cookie': `auth-token=${authToken}`
      }
    })
    
    if (!accountsResponse.ok) {
      console.error('Failed to fetch accounts:', await accountsResponse.text())
      return
    }
    
    const accountsData = await accountsResponse.json()
    const accounts = accountsData.data || []
    
    // Find suitable accounts
    const inventoryAccount = accounts.find((acc: any) => 
      acc.type === 'ASSET' && acc.code.startsWith('13')
    )
    const cogsAccount = accounts.find((acc: any) => 
      acc.type === 'EXPENSE' && acc.code.startsWith('51')
    )
    const salesAccount = accounts.find((acc: any) => 
      acc.type === 'INCOME' && acc.code.startsWith('41')
    )
    
    console.log('\nFound accounts:')
    console.log('- Inventory:', inventoryAccount ? `${inventoryAccount.code} - ${inventoryAccount.name}` : 'Not found')
    console.log('- COGS:', cogsAccount ? `${cogsAccount.code} - ${cogsAccount.name}` : 'Not found')
    console.log('- Sales:', salesAccount ? `${salesAccount.code} - ${salesAccount.name}` : 'Not found')
    
    if (!inventoryAccount || !cogsAccount || !salesAccount) {
      console.error('Not all required accounts found')
      return
    }
    
    // 3. Update settings with GL accounts
    console.log('\n3. Updating settings with GL accounts...')
    const updateData = {
      defaultInventoryAccountId: inventoryAccount.id,
      defaultCogsAccountId: cogsAccount.id,
      defaultSalesAccountId: salesAccount.id
    }
    
    console.log('Update payload:', JSON.stringify(updateData, null, 2))
    
    const updateResponse = await fetch('http://localhost:3000/api/settings/company', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Cookie': `auth-token=${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    })
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error('Failed to update settings:', errorText)
      return
    }
    
    const updatedData = await updateResponse.json()
    console.log('\n✅ Settings updated successfully!')
    console.log('Updated settings:', JSON.stringify(updatedData, null, 2))
    
  } catch (error: any) {
    console.error('Test failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Run the test
testCompanySettingsAPI()