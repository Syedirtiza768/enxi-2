/**
 * Centralized API Client with Authentication
 * 
 * All API calls should go through this client to ensure proper auth handling
 */


// API Error interface for enhanced error handling
export interface ApiError extends Error {
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
// Import ApiClientResponse for return type
import type { ApiClientResponse } from '@/lib/types/common.types'

// Export for backwards compatibility
export type ApiResponse<T> = ApiClientResponse<T>

/**
 * Get auth token from localStorage or cookies
 */
function getAuthToken(): string | null {
  // Check cookies first
  if (typeof document !== 'undefined') {
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-token='))
      ?.split('=')[1]
    
    if (cookieValue) return cookieValue
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    const localToken = localStorage.getItem('auth-token')
    if (localToken) return localToken
  }

  return null
}



/**
 * Main API client function
 */
export async function apiClient<T = unknown>(
  url: string, 
  options: ApiOptions = {}
): Promise<ApiClientResponse<T>> {
  const { 
    baseUrl = '', 
    skipAuth = false, 
    headers: customHeaders = {}, 
    ...fetchOptions 
  } = options

  // Track API call start
  const startTime = Date.now()
  const method = fetchOptions.method || 'GET'
  
  console.warn(`API Request: ${method} ${url}`, {
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
    console.warn(`API Response: ${response.status} ${method} ${url}`, {
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
      
      // Enhanced error response with structured error details
      return {
        error: errorData.error || errorData.message || `Request failed: ${response.statusText}`,
        status: response.status,
        ok: false,
        errorDetails: {
          code: errorData.code || `HTTP_${response.status}`,
          message: errorData.message || errorData.error || response.statusText,
          field: errorData.field,
          context: {
            url,
            method,
            status: response.status,
            statusText: response.statusText,
            duration: `${duration}ms`,
            ...errorData.context
          }
        }
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
    console.error(`API Network Error: ${method} ${url}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      networkError: true
    })
    return {
      error: error instanceof Error ? error.message : 'Network error occurred',
      status: 0,
      ok: false,
      errorDetails: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error occurred',
        context: {
          url,
          method,
          duration: `${duration}ms`,
          networkError: true
        }
      }
    }
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T = unknown>(url: string, options?: Omit<ApiOptions, 'method'>): Promise<ApiClientResponse<T>> =>
    apiClient<T>(url, { ...options, method: 'GET' }),

  post: <T = unknown>(url: string, data?: unknown, options?: Omit<ApiOptions, 'method' | 'body'>): Promise<ApiClientResponse<T>> =>
    apiClient<T>(url, { 
      ...options, 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    }),

  put: <T = unknown>(url: string, data?: unknown, options?: Omit<ApiOptions, 'method' | 'body'>): Promise<ApiClientResponse<T>> =>
    apiClient<T>(url, { 
      ...options, 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined 
    }),

  delete: <T = unknown>(url: string, options?: Omit<ApiOptions, 'method'>): Promise<ApiClientResponse<T>> =>
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