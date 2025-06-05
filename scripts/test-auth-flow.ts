#!/usr/bin/env tsx

/**
 * Test script to verify authentication flow is working correctly
 * Run with: pnpm tsx scripts/test-auth-flow.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

const log = {
  success: (msg: string) => console.warn(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg: string) => console.warn(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg: string) => console.warn(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg: string) => console.warn(`${colors.yellow}⚠️  ${msg}${colors.reset}`)
}

interface TestResult {
  passed: boolean
  message: string
  details?: any
}

async function testLogin(): Promise<TestResult> {
  log.info('Testing login endpoint...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'demo123'
      })
    })
    
    const setCookieHeader = response.headers.get('set-cookie')
    const data = await response.json()
    
    if (!response.ok) {
      return {
        passed: false,
        message: `Login failed: ${data.error}`,
        details: data
      }
    }
    
    if (!setCookieHeader?.includes('auth-token')) {
      return {
        passed: false,
        message: 'No auth-token cookie set in response',
        details: { setCookieHeader }
      }
    }
    
    // Extract token from response
    const token = data.token
    if (!token) {
      return {
        passed: false,
        message: 'No token in response body',
        details: data
      }
    }
    
    return {
      passed: true,
      message: 'Login successful',
      details: { token: token.substring(0, 20) + '...', user: data.user }
    }
} catch {      details: error
    }
  }
}

async function testProtectedRoute(cookie: string): Promise<TestResult> {
  log.info('Testing protected route access...')
  
  try {
    const response = await fetch(`${BASE_URL}/dashboard`, {
      headers: {
        'Cookie': cookie
      },
      redirect: 'manual' // Don't follow redirects
    })
    
    if (response.status === 307 || response.status === 302) {
      const location = response.headers.get('location')
      return {
        passed: false,
        message: `Still redirecting to login: ${location}`,
        details: { status: response.status, location }
      }
    }
    
    if (response.ok) {
      return {
        passed: true,
        message: 'Protected route accessible',
        details: { status: response.status }
      }
    }
    
    return {
      passed: false,
      message: `Protected route returned ${response.status}`,
      details: { status: response.status }
    }
} catch {      details: error
    }
  }
}

async function testTokenValidation(cookie: string): Promise<TestResult> {
  log.info('Testing token validation endpoint...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/validate`, {
      headers: {
        'Cookie': cookie
      }
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return {
        passed: false,
        message: `Token validation failed: ${data.error}`,
        details: data
      }
    }
    
    if (data.valid && data.user) {
      return {
        passed: true,
        message: 'Token validation successful',
        details: { user: data.user }
      }
    }
    
    return {
      passed: false,
      message: 'Token validation returned invalid',
      details: data
    }
} catch {      details: error
    }
  }
}

async function testAPIAccess(cookie: string): Promise<TestResult> {
  log.info('Testing API route access...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/leads`, {
      headers: {
        'Cookie': cookie
      }
    })
    
    if (response.status === 401) {
      return {
        passed: false,
        message: 'API still returning 401 Unauthorized',
        details: await response.json()
      }
    }
    
    if (response.ok) {
      const data = await response.json()
      return {
        passed: true,
        message: 'API route accessible',
        details: { 
          status: response.status,
          dataReceived: !!data,
          recordCount: data.data?.length || 0
        }
      }
    }
    
    return {
      passed: false,
      message: `API route returned ${response.status}`,
      details: { status: response.status }
    }
} catch {      details: error
    }
  }
}

async function runTests() {
  console.warn('🔍 Testing Authentication Flow\n')
  
  let allPassed = true
  let authCookie = ''
  
  // Test 1: Login
  const loginResult = await testLogin()
  if (loginResult.passed) {
    log.success(loginResult.message)
    // Extract cookie for subsequent tests
    // In a real scenario, we'd parse the Set-Cookie header
    // For now, we'll construct it from the token
    const token = loginResult.details.token.replace('...', '') // This is simplified
    authCookie = `auth-token=${token}`
  } else {
    log.error(loginResult.message)
    console.warn('Details:', loginResult.details)
    allPassed = false
  }
  
  if (!authCookie) {
    log.error('Cannot continue tests without auth cookie')
    process.exit(1)
  }
  
  // Test 2: Token Validation
  const validationResult = await testTokenValidation(authCookie)
  if (validationResult.passed) {
    log.success(validationResult.message)
  } else {
    log.error(validationResult.message)
    console.warn('Details:', validationResult.details)
    allPassed = false
  }
  
  // Test 3: Protected Route
  const protectedResult = await testProtectedRoute(authCookie)
  if (protectedResult.passed) {
    log.success(protectedResult.message)
  } else {
    log.error(protectedResult.message)
    console.warn('Details:', protectedResult.details)
    allPassed = false
  }
  
  // Test 4: API Access
  const apiResult = await testAPIAccess(authCookie)
  if (apiResult.passed) {
    log.success(apiResult.message)
  } else {
    log.error(apiResult.message)
    console.warn('Details:', apiResult.details)
    allPassed = false
  }
  
  // Summary
  console.warn('\n' + '='.repeat(50))
  if (allPassed) {
    log.success('All authentication tests passed!')
  } else {
    log.error('Some authentication tests failed')
    log.warn('Check the middleware debug logs in the terminal running the dev server')
  }
}

// Run the tests
runTests().catch(console.error)