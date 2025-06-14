'use client'

import React from 'react'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react'
import { ErrorDetails, ErrorAction } from '@/lib/services/error-message.service'

export interface ToastProps {
  id: string
  errorDetails?: ErrorDetails
  title?: string
  message?: string
  variant?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  persistent?: boolean
  onDismiss?: (id: string) => void
  onAction?: (actionId: string) => void
  showActions?: boolean
}

export function ErrorToast({
  id,
  errorDetails,
  title,
  message,
  variant = 'info',
  duration = 5000,
  persistent = false,
  onDismiss,
  onAction,
  showActions = true
}: ToastProps): React.JSX.Element | null {
  const [isVisible, setIsVisible] = React.useState(true)
  const [timeLeft, setTimeLeft] = React.useState(duration)
  const [isPaused, setIsPaused] = React.useState(false)

  // Auto dismiss timer
  React.useEffect(() => {
    if (persistent || isPaused) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          handleDismiss()
          return 0
        }
        return prev - 100
      })
    }, 100)

    return (): void => clearInterval(timer)
  }, [persistent, isPaused, duration])

  const handleDismiss = React.useCallback(() => {
    setIsVisible(false)
    setTimeout(() => onDismiss?.(id), 300) // Allow fade out animation
  }, [id, onDismiss])

  const handleAction = React.useCallback((action: ErrorAction) => {
    if (action.type === 'link' && action.url) {
      window.open(action.url, '_blank')
    } else if (action.action) {
      action.action()
    }
    onAction?.(action.id)
  }, [onAction])

  // Determine variant from error details if provided
  const effectiveVariant = errorDetails ? 
    errorDetails.severity === 'critical' || errorDetails.severity === 'high' ? 'error' :
    errorDetails.severity === 'medium' ? 'warning' :
    'info' : variant

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  }

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-orange-50 border-orange-200 text-orange-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  }

  const iconStyles = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-orange-400',
    info: 'text-blue-400'
  }

  const Icon = icons[effectiveVariant]
  const displayTitle = title || errorDetails?.title || 'Notification'
  const displayMessage = message || errorDetails?.message || ''
  const actions = errorDetails?.actions || []

  if (!isVisible) return null

  return (
    <div
      className={`
        relative w-96 max-w-sm mx-auto bg-white rounded-lg shadow-lg border transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${styles[effectiveVariant]}
      `}
      onMouseEnter={(): void => setIsPaused(true)}
      onMouseLeave={(): void => setIsPaused(false)}
      role="alert"
      aria-live="assertive"
    >
      {/* Progress bar */}
      {!persistent && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-t-lg overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ease-linear ${
              effectiveVariant === 'error' ? 'bg-red-500' :
              effectiveVariant === 'warning' ? 'bg-orange-500' :
              effectiveVariant === 'success' ? 'bg-green-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${(timeLeft / duration) * 100}%` }}
          />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`h-5 w-5 ${iconStyles[effectiveVariant]}`} />
          </div>
          
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium">
              {displayTitle}
            </h3>
            {displayMessage && (
              <div className="mt-1 text-sm opacity-90">
                {displayMessage}
              </div>
            )}
          </div>
          
          <div className="flex-shrink-0 ml-4">
            <button
              onClick={handleDismiss}
              className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Support Code */}
        {errorDetails?.supportCode && (
          <div className="mt-3 p-2 bg-white bg-opacity-50 rounded text-xs font-mono">
            <span className="text-gray-600">Ref: </span>
            <span className="font-semibold">{errorDetails.supportCode}</span>
          </div>
        )}

        {/* Actions */}
        {showActions && actions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {actions.slice(0, 2).map((action) => (
              <button
                key={action.id}
                onClick={(): void => handleAction(action)}
                className={`
                  inline-flex items-center px-3 py-1 rounded text-xs font-medium transition-colors
                  ${effectiveVariant === 'error' 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                    effectiveVariant === 'warning'
                    ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' :
                    effectiveVariant === 'success'
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                    'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }
                `}
              >
                {action.type === 'link' && <ExternalLink className="w-3 h-3 mr-1" />}
                {action.id === 'retry' && <RefreshCw className="w-3 h-3 mr-1" />}
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Additional context for development */}
        {process.env.NODE_ENV === 'development' && errorDetails?.technical && (
          <details className="mt-3">
            <summary className="text-xs cursor-pointer text-gray-600 hover:text-gray-800">
              Technical Details
            </summary>
            <div className="mt-1 p-2 bg-gray-100 rounded text-xs font-mono whitespace-pre-wrap max-h-20 overflow-auto">
              {errorDetails.technical}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

// Toast Container Component
export interface ToastContainerProps {
  toasts: ToastProps[]
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  maxToasts?: number
}

export function ToastContainer({ 
  toasts, 
  position = 'top-right',
  maxToasts = 5 
}: ToastContainerProps): React.JSX.Element {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  }

  const visibleToasts = toasts.slice(0, maxToasts)

  return (
    <div className={`fixed z-50 ${positionClasses[position]}`}>
      <div className="space-y-3">
        {visibleToasts.map((toast) => (
          <ErrorToast key={toast.id} {...toast} />
        ))}
      </div>
      
      {/* Show count of hidden toasts */}
      {toasts.length > maxToasts && (
        <div className="mt-2 text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-800 text-white text-xs">
            +{toasts.length - maxToasts} more notifications
          </div>
        </div>
      )}
    </div>
  )
}