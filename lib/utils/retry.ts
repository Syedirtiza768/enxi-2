/**
 * Retry Utilities
 * 
 * Provides retry mechanisms for transient failures with exponential backoff
 * and configurable retry strategies
 */

export interface RetryOptions {
  maxAttempts?: number
  initialDelay?: number
  maxDelay?: number
  backoffFactor?: number
  retryCondition?: (error: any, attempt: number) => boolean
  onRetry?: (error: any, attempt: number) => void
  abortSignal?: AbortSignal
}

export interface RetryResult<T> {
  success: boolean
  result?: T
  error?: any
  attempts: number
  totalDuration: number
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    retryCondition = defaultRetryCondition,
    onRetry,
    abortSignal
  } = options

  let lastError: any
  let attempts = 0
  const startTime = Date.now()

  while (attempts < maxAttempts) {
    attempts++

    // Check if operation was aborted
    if (abortSignal?.aborted) {
      return {
        success: false,
        error: new Error('Operation aborted'),
        attempts,
        totalDuration: Date.now() - startTime
      }
    }

    try {
      const result = await operation()
      return {
        success: true,
        result,
        attempts,
        totalDuration: Date.now() - startTime
      }
    } catch (error) {
      lastError = error
      
      // Check if we should retry this error
      if (attempts >= maxAttempts || !retryCondition(error, attempts)) {
        break
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempts - 1),
        maxDelay
      )

      // Call retry callback
      onRetry?.(error, attempts)

      // Wait before retrying
      await sleep(delay)
    }
  }

  return {
    success: false,
    error: lastError,
    attempts,
    totalDuration: Date.now() - startTime
  }
}

/**
 * Default retry condition - retries on network errors and 5xx server errors
 */
function defaultRetryCondition(error: any, attempt: number): boolean {
  // Don't retry on last attempt
  if (attempt >= 3) return false

  // Retry on network errors
  if (isNetworkError(error)) return true

  // Retry on API responses with 5xx status codes
  if (error?.status >= 500 && error?.status < 600) return true

  // Retry on rate limiting (429)
  if (error?.status === 429) return true

  // Retry on timeout errors
  if (error?.code === 'TIMEOUT' || error?.name === 'TimeoutError') return true

  return false
}

/**
 * Check if error is a network error
 */
function isNetworkError(error: any): boolean {
  if (!error) return false
  
  const message = error.message || ''
  return (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('NetworkError') ||
    message.includes('Failed to fetch') ||
    error.code === 'NETWORK_ERROR' ||
    error.name === 'NetworkError'
  )
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry strategies for different scenarios
 */
export const RetryStrategies = {
  // For API calls
  api: {
    maxAttempts: 3,
    initialDelay: 1000,
    backoffFactor: 2,
    retryCondition: (error: any) => {
      // Retry on network errors and server errors
      return isNetworkError(error) || 
             (error?.status >= 500) || 
             (error?.status === 429)
    }
  },

  // For critical operations
  critical: {
    maxAttempts: 5,
    initialDelay: 500,
    maxDelay: 10000,
    backoffFactor: 1.5,
    retryCondition: (error: any) => {
      // More aggressive retry for critical operations
      return isNetworkError(error) || 
             (error?.status >= 500) || 
             (error?.status === 429) ||
             (error?.status === 502) ||
             (error?.status === 503) ||
             (error?.status === 504)
    }
  },

  // For background operations
  background: {
    maxAttempts: 10,
    initialDelay: 2000,
    maxDelay: 60000,
    backoffFactor: 2,
    retryCondition: (error: any) => {
      // Very patient retry for background tasks
      return isNetworkError(error) || (error?.status >= 500)
    }
  },

  // For user-initiated actions
  user: {
    maxAttempts: 2,
    initialDelay: 500,
    maxDelay: 2000,
    backoffFactor: 2,
    retryCondition: (error: any) => {
      // Quick retry for user actions to maintain responsiveness
      return isNetworkError(error) && error?.status !== 400
    }
  }
}

/**
 * React hook for retry functionality
 */
export function useRetry() {
  const [isRetrying, setIsRetrying] = React.useState(false)
  const [retryCount, setRetryCount] = React.useState(0)
  
  const retry = React.useCallback(async <T>(
    operation: () => Promise<T>,
    options?: RetryOptions
  ): Promise<RetryResult<T>> => {
    setIsRetrying(true)
    setRetryCount(0)
    
    const result = await withRetry(operation, {
      ...options,
      onRetry: (error, attempt) => {
        setRetryCount(attempt)
        options?.onRetry?.(error, attempt)
      }
    })
    
    setIsRetrying(false)
    return result
  }, [])
  
  return { retry, isRetrying, retryCount }
}

// Import React for the hook
import React from 'react'