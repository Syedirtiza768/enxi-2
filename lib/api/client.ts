/**
 * Centralized API Client with Authentication
 * 
 * All API calls should go through this client to ensure proper auth handling
 */

import { redirect } from 'next/navigation'

interface ApiError extends Error {
  status: number
  statusText: string
}

interface ApiOptions extends RequestInit {
  baseUrl?: string
  skipAuth?: boolean
}

/**
 * Enhanced API response type
 */
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  status: number
  ok: boolean
}

/**
 * Get auth token from localStorage or cookies
 */
function getAuthToken(): string | null {
  // Try reading from cookies first (most reliable)
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';')
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth-token='))
    if (authCookie) {
      return authCookie.split('=')[1]
    }
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    const localToken = localStorage.getItem('token')
    if (localToken) return localToken
  }

  return null
}

/**
 * Handle authentication errors
 */
function handleAuthError() {
  // Clear stored tokens
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token')
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  }

  // Redirect to login (client-side only)
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

/**
 * Create API error with enhanced information
 */
function createApiError(response: Response, message?: string): ApiError {
  const error = new Error(message || `API Error: ${response.status} ${response.statusText}`) as ApiError
  error.status = response.status
  error.statusText = response.statusText
  return error
}

/**
 * Main API client function
 */
export async function apiClient<T = any>(
  url: string, 
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const { 
    baseUrl = '', 
    skipAuth = false, 
    headers: customHeaders = {}, 
    ...fetchOptions 
  } = options

  // Track API call start
  const startTime = Date.now()
  const method = fetchOptions.method || 'GET'
  
  console.log(`API Request: ${method} ${url}`, {
    method,
    url,
    hasBody: !!fetchOptions.body
  })

  // Prepare headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  }

  // Add authentication if not skipped
  if (!skipAuth) {
    const token = getAuthToken()
    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`
    }
  }

  // Make the request
  try {
    const response = await fetch(`${baseUrl}${url}`, {
      ...fetchOptions,
      headers,
      credentials: 'include', // Important for cookies
    })

    const duration = Date.now() - startTime

    // Log response
    console.log(`API Response: ${response.status} ${method} ${url}`, {
      status: response.status,
      duration: `${duration}ms`,
      method,
      url
    })

    // Track slow requests
    if (duration > 1000) {
      console.warn(`Slow API request detected: ${url}`, {
        duration: `${duration}ms`,
        threshold: '1000ms'
      })
    }

    // Handle authentication errors - but don't auto-logout on every 401
    if (response.status === 401 && !skipAuth) {
      const errorData = await response.json().catch(() => ({}))
      console.warn('Authentication error', {
        status: 401,
        url,
        error: errorData
      })
      // Don't automatically logout - let the app handle it
      return {
        error: errorData.error || 'Unauthorized',
        status: 401,
        ok: false,
      }
    }

    // Handle other client errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`API Error: ${response.status} ${method} ${url}`, {
        status: response.status,
        statusText: response.statusText,
        errorData,
        duration: `${duration}ms`
      })
      return {
        error: errorData.error || `Request failed: ${response.statusText}`,
        status: response.status,
        ok: false,
      }
    }

    // Parse successful response
    const data = await response.json()
    return {
      data,
      status: response.status,
      ok: true,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`API Network Error: ${method} ${url}`, error, {
      duration: `${duration}ms`,
      networkError: true
    })
    return {
      error: error instanceof Error ? error.message : 'Network error occurred',
      status: 0,
      ok: false,
    }
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T = any>(url: string, options?: Omit<ApiOptions, 'method'>) =>
    apiClient<T>(url, { ...options, method: 'GET' }),

  post: <T = any>(url: string, data?: any, options?: Omit<ApiOptions, 'method' | 'body'>) =>
    apiClient<T>(url, { 
      ...options, 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    }),

  put: <T = any>(url: string, data?: any, options?: Omit<ApiOptions, 'method' | 'body'>) =>
    apiClient<T>(url, { 
      ...options, 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined 
    }),

  delete: <T = any>(url: string, options?: Omit<ApiOptions, 'method'>) =>
    apiClient<T>(url, { ...options, method: 'DELETE' }),
}

/**
 * React hook for API calls with automatic error handling
 */
export function useApi() {
  return {
    get: api.get,
    post: api.post,
    put: api.put,
    delete: api.delete,
  }
}