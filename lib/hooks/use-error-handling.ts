'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { errorMessageService, ErrorDetails, ErrorCategory } from '@/lib/services/error-message.service'
import { withRetry, RetryOptions, RetryStrategies } from '@/lib/utils/retry'

export interface ErrorState {
  error: ErrorDetails | null
  isLoading: boolean
  hasError: boolean
  retryCount: number
}

export interface ErrorHandlingOptions {
  showToast?: boolean
  showModal?: boolean
  retryOptions?: RetryOptions
  category?: ErrorCategory
  context?: Record<string, any>
  onError?: (error: ErrorDetails) => void
  onRetry?: (attempt: number) => void
  onSuccess?: () => void
}

/**
 * Comprehensive error handling hook
 */
export function useErrorHandling(options: ErrorHandlingOptions = {}) {
  const { error: showErrorToast } = useToast()
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isLoading: false,
    hasError: false,
    retryCount: 0
  })
  
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleError = useCallback((error: unknown, context?: Record<string, any>) => {
    const errorDetails = errorMessageService.processError(error, {
      ...options.context,
      ...context
    })

    setErrorState(prev => ({
      ...prev,
      error: errorDetails,
      hasError: true,
      isLoading: false
    }))

    // Show toast notification if enabled
    if (options.showToast !== false) {
      showErrorToast(error, { ...options.context, ...context })
    }

    // Call custom error handler
    options.onError?.(errorDetails)

    return errorDetails
  }, [options, showErrorToast])

  const clearError = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      error: null,
      hasError: false
    }))
  }, [])

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    operationOptions?: {
      retryStrategy?: keyof typeof RetryStrategies
      context?: Record<string, any>
      loadingState?: boolean
    }
  ): Promise<T | null> => {
    // Abort any previous operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    abortControllerRef.current = new AbortController()
    
    // Clear previous errors
    clearError()
    
    if (operationOptions?.loadingState !== false) {
      setErrorState(prev => ({ ...prev, isLoading: true }))
    }

    try {
      let result: T

      // Determine retry strategy
      const retryStrategy = operationOptions?.retryStrategy || 'api'
      const retryOptions = {
        ...RetryStrategies[retryStrategy],
        ...options.retryOptions,
        abortSignal: abortControllerRef.current.signal,
        onRetry: (error: any, attempt: number) => {
          setErrorState(prev => ({ ...prev, retryCount: attempt }))
          options.onRetry?.(attempt)
        }
      }

      // Execute with retry
      const retryResult = await withRetry(operation, retryOptions)

      if (!retryResult.success) {
        handleError(retryResult.error, operationOptions?.context)
        return null
      }

      result = retryResult.result as T
      
      setErrorState(prev => ({
        ...prev,
        isLoading: false,
        retryCount: 0
      }))

      options.onSuccess?.()
      return result

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Operation was aborted, don't show error
        return null
      }
      
      handleError(error, operationOptions?.context)
      return null
    } finally {
      setErrorState(prev => ({ ...prev, isLoading: false }))
    }
  }, [handleError, clearError, options])

  const retry = useCallback(async () => {
    if (!errorState.error?.retryable) return null
    
    // This would typically re-execute the last operation
    // Implementation depends on how you want to track the last operation
    console.log('Retry requested for:', errorState.error.code)
    return null
  }, [errorState.error])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    ...errorState,
    handleError,
    clearError,
    executeWithErrorHandling,
    retry,
    canRetry: errorState.error?.retryable || false
  }
}

/**
 * Form validation error handling hook
 */
export function useFormErrorHandling() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())
  const [isValid, setIsValid] = useState(true)

  const setFieldError = useCallback((field: string, error: string | null) => {
    setFieldErrors(prev => {
      const updated = { ...prev }
      if (error) {
        updated[field] = error
      } else {
        delete updated[field]
      }
      return updated
    })
  }, [])

  const clearFieldError = useCallback((field: string) => {
    setFieldError(field, null)
  }, [setFieldError])

  const setFieldTouched = useCallback((field: string, touched = true) => {
    setTouchedFields(prev => {
      const updated = new Set(prev)
      if (touched) {
        updated.add(field)
      } else {
        updated.delete(field)
      }
      return updated
    })
  }, [])

  const validateField = useCallback((
    field: string, 
    value: any, 
    validator: (value: any) => string | null
  ) => {
    const error = validator(value)
    setFieldError(field, error)
    return !error
  }, [setFieldError])

  const clearAllErrors = useCallback(() => {
    setFieldErrors({})
    setTouchedFields(new Set())
  }, [])

  const getFieldError = useCallback((field: string, showOnlyWhenTouched = true) => {
    const hasError = fieldErrors[field]
    const isTouched = touchedFields.has(field)
    
    if (showOnlyWhenTouched && !isTouched) {
      return null
    }
    
    return hasError || null
  }, [fieldErrors, touchedFields])

  const hasFieldError = useCallback((field: string) => {
    return Boolean(fieldErrors[field])
  }, [fieldErrors])

  // Calculate form validity
  useEffect(() => {
    setIsValid(Object.keys(fieldErrors).length === 0)
  }, [fieldErrors])

  return {
    fieldErrors,
    touchedFields,
    isValid,
    setFieldError,
    clearFieldError,
    setFieldTouched,
    validateField,
    clearAllErrors,
    getFieldError,
    hasFieldError,
    hasErrors: Object.keys(fieldErrors).length > 0
  }
}

/**
 * API operation hook with comprehensive error handling
 */
export function useApiOperation<T = any>(options?: ErrorHandlingOptions) {
  const errorHandling = useErrorHandling(options)
  
  const execute = useCallback(async (
    apiCall: () => Promise<T>,
    operationOptions?: {
      successMessage?: string
      context?: Record<string, any>
    }
  ): Promise<T | null> => {
    return errorHandling.executeWithErrorHandling(apiCall, {
      context: operationOptions?.context
    })
  }, [errorHandling])

  return {
    ...errorHandling,
    execute
  }
}

/**
 * Network status hook
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [networkError, setNetworkError] = useState<ErrorDetails | null>(null)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setNetworkError(null)
    }

    const handleOffline = () => {
      setIsOnline(false)
      const error = errorMessageService.createNetworkError(false)
      setNetworkError(error)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, networkError }
}