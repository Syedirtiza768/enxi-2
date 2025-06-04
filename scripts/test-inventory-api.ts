import axios from 'axios'

const API_URL = 'http://localhost:3000/api'

async function testInventoryAPIs() {
  console.log('🧪 Testing Inventory APIs...\n')

  try {
    // First, login to get the auth token
    console.log('1. Logging in...')
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    })
    
    const token = loginResponse.data.token
    console.log('✅ Login successful, got token\n')

    // Set up headers with auth token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }

    // Test categories endpoint
    console.log('2. Testing GET /api/inventory/categories...')
    try {
      const categoriesResponse = await axios.get(`${API_URL}/inventory/categories`, { headers })
      console.log(`✅ Categories endpoint returned ${categoriesResponse.data.data?.length || 0} categories`)
      if (categoriesResponse.data.data?.length > 0) {
        console.log('Sample category:', JSON.stringify(categoriesResponse.data.data[0], null, 2))
      }
    } catch (error: any) {
      console.error('❌ Categories endpoint error:', error.response?.data || error.message)
    }

    // Test items endpoint
    console.log('\n3. Testing GET /api/inventory/items...')
    try {
      const itemsResponse = await axios.get(`${API_URL}/inventory/items`, { headers })
      console.log(`✅ Items endpoint returned ${itemsResponse.data.data?.length || 0} items`)
      if (itemsResponse.data.data?.length > 0) {
        console.log('Sample item:', JSON.stringify(itemsResponse.data.data[0], null, 2))
      }
    } catch (error: any) {
      console.error('❌ Items endpoint error:', error.response?.data || error.message)
    }

    // Test units of measure endpoint
    console.log('\n4. Testing GET /api/inventory/units-of-measure...')
    try {
      const unitsResponse = await axios.get(`${API_URL}/inventory/units-of-measure`, { headers })
      console.log(`✅ Units endpoint returned ${unitsResponse.data.data?.length || 0} units`)
      if (unitsResponse.data.data?.length > 0) {
        console.log('Sample unit:', JSON.stringify(unitsResponse.data.data[0], null, 2))
      }
    } catch (error: any) {
      console.error('❌ Units endpoint error:', error.response?.data || error.message)
    }

    // Test category tree endpoint
    console.log('\n5. Testing GET /api/inventory/categories/tree...')
    try {
      const treeResponse = await axios.get(`${API_URL}/inventory/categories/tree`, { headers })
      console.log(`✅ Category tree endpoint returned ${treeResponse.data.data?.length || treeResponse.data.length || 0} root categories`)
      if ((treeResponse.data.data || treeResponse.data).length > 0) {
        console.log('Tree structure:', JSON.stringify(treeResponse.data.data || treeResponse.data, null, 2))
      }
    } catch (error: any) {
      console.error('❌ Category tree endpoint error:', error.response?.data || error.message)
    }

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message)
  }
}

// Make sure the server is running
console.log('⚠️  Make sure the Next.js server is running (npm run dev)\n')

testInventoryAPIs()
  .catch(console.error)