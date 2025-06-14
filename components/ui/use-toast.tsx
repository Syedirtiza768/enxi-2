'use client'

import * as React from 'react'
import { ToastContainer } from '@/components/error/error-toast'
import { errorMessageService, ErrorDetails } from '@/lib/services/error-message.service'

export interface Toast {
  id: string
  title?: string
  description?: string
  message?: string
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info' | 'error'
  duration?: number
  persistent?: boolean
  errorDetails?: ErrorDetails
  showActions?: boolean
}

interface ToastContextType {
  toasts: Toast[]
  toast: (toast: Omit<Toast, 'id'>) => string
  dismiss: (id: string) => void
  dismissAll: () => void
  error: (error: unknown, context?: Record<string, any>) => string
  success: (message: string, title?: string) => string
  warning: (message: string, title?: string) => string
  info: (message: string, title?: string) => string
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast = { ...toast, id }
    
    setToasts((prev) => {
      // Limit to 5 toasts maximum
      const updated = [...prev, newToast]
      return updated.slice(-5)
    })
    
    // Auto dismiss after specified duration or 5 seconds
    if (!toast.persistent) {
      const duration = toast.duration || 5000
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }
    
    return id
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const dismissAll = React.useCallback(() => {
    setToasts([])
  }, [])

  // Enhanced error toast with error message service integration
  const error = React.useCallback((error: unknown, context?: Record<string, any>) => {
    const errorDetails = errorMessageService.processError(error, context)
    
    return toast({
      variant: 'error',
      errorDetails,
      title: errorDetails.title,
      message: errorDetails.message,
      duration: errorDetails.severity === 'critical' ? 0 : 8000, // Critical errors are persistent
      persistent: errorDetails.severity === 'critical',
      showActions: true
    })
  }, [toast])

  const success = React.useCallback((message: string, title?: string) => {
    return toast({
      variant: 'success',
      title: title || 'Success',
      message,
      duration: 4000
    })
  }, [toast])

  const warning = React.useCallback((message: string, title?: string) => {
    return toast({
      variant: 'warning',
      title: title || 'Warning',
      message,
      duration: 6000
    })
  }, [toast])

  const info = React.useCallback((message: string, title?: string) => {
    return toast({
      variant: 'info',
      title: title || 'Information',
      message,
      duration: 5000
    })
  }, [toast])

  const handleAction = React.useCallback((actionId: string) => {
    console.log('Toast action triggered:', actionId)
    // Handle common actions
    switch (actionId) {
      case 'retry':
        // This would typically be handled by the component that created the toast
        break
      case 'dismiss':
        // Auto-handled by toast component
        break
      default:
        console.log('Unhandled toast action:', actionId)
    }
  }, [])

  const contextValue = React.useMemo(() => ({
    toasts,
    toast,
    dismiss,
    dismissAll,
    error,
    success,
    warning,
    info
  }), [toasts, toast, dismiss, dismissAll, error, success, warning, info])

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer 
        toasts={toasts.map(t => ({
          ...t,
          onDismiss: dismiss,
          onAction: handleAction
        }))}
        position="top-right"
        maxToasts={5}
      />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (context === undefined) {
    // Return a mock implementation when not within provider
    const mockToast = (toast: Omit<Toast, 'id'>) => {
      console.log('Toast (no provider):', toast)
      return 'mock-id'
    }
    
    return {
      toast: mockToast,
      dismiss: (id: string) => console.log('Dismiss toast (no provider):', id),
      dismissAll: () => console.log('Dismiss all toasts (no provider)'),
      error: (error: unknown) => {
        console.error('Error toast (no provider):', error)
        return 'mock-error-id'
      },
      success: (message: string, title?: string) => {
        console.log('Success toast (no provider):', title, message)
        return 'mock-success-id'
      },
      warning: (message: string, title?: string) => {
        console.log('Warning toast (no provider):', title, message)
        return 'mock-warning-id'
      },
      info: (message: string, title?: string) => {
        console.log('Info toast (no provider):', title, message)
        return 'mock-info-id'
      },
      toasts: []
    }
  }
  return context
}

// Helper function for className concatenation
function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ')
}

// Utility hook for handling async operations with toast feedback
export function useAsyncOperation() {
  const { error, success } = useToast()
  
  const execute = React.useCallback(async <T,>(
    operation: () => Promise<T>,
    options?: {
      successMessage?: string
      errorContext?: Record<string, any>
      onSuccess?: (result: T) => void
      onError?: (error: unknown) => void
    }
  ): Promise<T | null> => {
    try {
      const result = await operation()
      
      if (options?.successMessage) {
        success(options.successMessage)
      }
      
      options?.onSuccess?.(result)
      return result
    } catch (err) {
      error(err, options?.errorContext)
      options?.onError?.(err)
      return null
    }
  }, [error, success])
  
  return { execute }
}