import fetch from 'node-fetch'

const BASE_URL = 'http://localhost:3000'

interface TestResult {
  test: string
  status: 'PASS' | 'FAIL'
  message?: string
  response?: any
}

const results: TestResult[] = []

async function makeRequest(
  method: string,
  endpoint: string,
  body?: any,
  headers?: Record<string, string>
) {
  try {
    const options: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options)
    const data = await response.json()

    return {
      status: response.status,
      data,
      ok: response.ok
    }
  } catch (error) {
    return {
      status: 0,
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
      ok: false
    }
  }
}

async function testAPI() {
  console.log('🧪 Testing Categories API Endpoints\n')
  console.log(`Base URL: ${BASE_URL}\n`)

  // Store created IDs for cleanup
  let parentCategoryId: string | null = null
  let childCategoryId: string | null = null

  // Test 1: GET all categories
  console.log('📋 Test 1: GET /api/inventory/categories')
  const test1 = await makeRequest('GET', '/api/inventory/categories')
  results.push({
    test: 'GET all categories',
    status: test1.ok ? 'PASS' : 'FAIL',
    message: `Status: ${test1.status}`,
    response: test1.data
  })
  console.log(`Response (${test1.status}):`, JSON.stringify(test1.data, null, 2))

  // Test 2: GET categories with filters
  console.log('\n📋 Test 2: GET /api/inventory/categories with filters')
  const test2 = await makeRequest('GET', '/api/inventory/categories?isActive=true&limit=5')
  results.push({
    test: 'GET categories with filters',
    status: test2.ok ? 'PASS' : 'FAIL',
    message: `Status: ${test2.status}`,
    response: test2.data
  })
  console.log(`Response (${test2.status}):`, JSON.stringify(test2.data, null, 2))

  // Test 3: POST create parent category
  console.log('\n📋 Test 3: POST /api/inventory/categories - Create parent')
  const parentData = {
    code: 'API-TEST-PARENT',
    name: 'API Test Parent Category',
    description: 'Parent category created via API test'
  }
  const test3 = await makeRequest('POST', '/api/inventory/categories', parentData)
  results.push({
    test: 'Create parent category',
    status: test3.ok ? 'PASS' : 'FAIL',
    message: `Status: ${test3.status}`,
    response: test3.data
  })
  console.log(`Response (${test3.status}):`, JSON.stringify(test3.data, null, 2))
  
  if (test3.ok && test3.data.id) {
    parentCategoryId = test3.data.id
    console.log(`✅ Parent category created with ID: ${parentCategoryId}`)
  }

  // Test 4: POST create child category
  if (parentCategoryId) {
    console.log('\n📋 Test 4: POST /api/inventory/categories - Create child')
    const childData = {
      code: 'API-TEST-CHILD',
      name: 'API Test Child Category',
      description: 'Child category created via API test',
      parentId: parentCategoryId
    }
    const test4 = await makeRequest('POST', '/api/inventory/categories', childData)
    results.push({
      test: 'Create child category',
      status: test4.ok ? 'PASS' : 'FAIL',
      message: `Status: ${test4.status}`,
      response: test4.data
    })
    console.log(`Response (${test4.status}):`, JSON.stringify(test4.data, null, 2))
    
    if (test4.ok && test4.data.id) {
      childCategoryId = test4.data.id
      console.log(`✅ Child category created with ID: ${childCategoryId}`)
    }
  }

  // Test 5: GET specific category
  if (parentCategoryId) {
    console.log('\n📋 Test 5: GET /api/inventory/categories/[id]')
    const test5 = await makeRequest('GET', `/api/inventory/categories/${parentCategoryId}`)
    results.push({
      test: 'GET specific category',
      status: test5.ok ? 'PASS' : 'FAIL',
      message: `Status: ${test5.status}`,
      response: test5.data
    })
    console.log(`Response (${test5.status}):`, JSON.stringify(test5.data, null, 2))
  }

  // Test 6: PUT update category
  if (parentCategoryId) {
    console.log('\n📋 Test 6: PUT /api/inventory/categories/[id]')
    const updateData = {
      name: 'Updated API Test Parent',
      description: 'This category was updated via API test'
    }
    const test6 = await makeRequest('PUT', `/api/inventory/categories/${parentCategoryId}`, updateData)
    results.push({
      test: 'Update category',
      status: test6.ok ? 'PASS' : 'FAIL',
      message: `Status: ${test6.status}`,
      response: test6.data
    })
    console.log(`Response (${test6.status}):`, JSON.stringify(test6.data, null, 2))
  }

  // Test 7: GET category tree
  console.log('\n📋 Test 7: GET /api/inventory/categories/tree')
  const test7 = await makeRequest('GET', '/api/inventory/categories/tree')
  results.push({
    test: 'GET category tree',
    status: test7.ok ? 'PASS' : 'FAIL',
    message: `Status: ${test7.status}`,
    response: test7.data
  })
  console.log(`Response (${test7.status}):`, JSON.stringify(test7.data, null, 2))

  // Test 8: DELETE child category
  if (childCategoryId) {
    console.log('\n📋 Test 8: DELETE /api/inventory/categories/[id] - Delete child')
    const test8 = await makeRequest('DELETE', `/api/inventory/categories/${childCategoryId}`)
    results.push({
      test: 'Delete child category',
      status: test8.ok ? 'PASS' : 'FAIL',
      message: `Status: ${test8.status}`,
      response: test8.data
    })
    console.log(`Response (${test8.status}):`, JSON.stringify(test8.data, null, 2))
  }

  // Test 9: DELETE parent category
  if (parentCategoryId) {
    console.log('\n📋 Test 9: DELETE /api/inventory/categories/[id] - Delete parent')
    const test9 = await makeRequest('DELETE', `/api/inventory/categories/${parentCategoryId}`)
    results.push({
      test: 'Delete parent category',
      status: test9.ok ? 'PASS' : 'FAIL',
      message: `Status: ${test9.status}`,
      response: test9.data
    })
    console.log(`Response (${test9.status}):`, JSON.stringify(test9.data, null, 2))
  }

  // Test 10: Error handling - missing required fields
  console.log('\n📋 Test 10: POST with missing required fields')
  const test10 = await makeRequest('POST', '/api/inventory/categories', { description: 'No code or name' })
  results.push({
    test: 'Error handling - missing fields',
    status: test10.status === 400 ? 'PASS' : 'FAIL',
    message: `Status: ${test10.status}`,
    response: test10.data
  })
  console.log(`Response (${test10.status}):`, JSON.stringify(test10.data, null, 2))

  // Print summary
  console.log('\n\n📊 TEST SUMMARY')
  console.log('================')
  
  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  
  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : '❌'
    console.log(`${icon} Test ${index + 1}: ${result.test} - ${result.message}`)
  })

  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`)
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`)
}

// Run the tests
testAPI().catch(console.error)