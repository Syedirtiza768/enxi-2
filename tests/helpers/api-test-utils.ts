import { NextRequest } from 'next/server'

/**
 * Create a mock NextRequest for testing API routes
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: any
    searchParams?: Record<string, string>
  } = {}
): NextRequest {
  const { method = 'GET', headers = {}, body, searchParams = {} } = options

  // Create URL with search params
  const requestUrl = new URL(url, 'http://localhost:3000')
  Object.entries(searchParams).forEach(([key, value]) => {
    requestUrl.searchParams.set(key, value)
  })

  // Create headers
  const requestHeaders = new Headers({
    'content-type': 'application/json',
    ...headers,
  })

  // Create request init
  const init: RequestInit = {
    method,
    headers: requestHeaders,
  }

  // Add body if provided
  if (body && method !== 'GET') {
    init.body = JSON.stringify(body)
  }

  // Create the request
  const request = new Request(requestUrl.toString(), init) as NextRequest

  // Add Next.js specific properties
  Object.defineProperty(request, 'nextUrl', {
    value: requestUrl,
    writable: false,
  })

  return request
}

/**
 * Parse response body based on content type
 */
export async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type')
  
  if (contentType?.includes('application/json')) {
    return response.json()
  }
  
  return response.text()
}

/**
 * Create authenticated request with user token
 */
export function createAuthenticatedRequest(
  url: string,
  token: string,
  options: Parameters<typeof createMockRequest>[1] = {}
): NextRequest {
  return createMockRequest(url, {
    ...options,
    headers: {
      ...options.headers,
      authorization: `Bearer ${token}`,
    },
  })
}

/**
 * Mock user for tests
 */
export const mockUser = {
  id: 'test-user-id',
  username: 'testuser',
  email: 'test@example.com',
  role: 'ADMIN',
  isActive: true,
}

/**
 * Mock JWT token
 */
export const mockToken = 'mock-jwt-token'