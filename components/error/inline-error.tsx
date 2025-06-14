'use client'

import React from 'react'
import { AlertCircle, AlertTriangle, Info, CheckCircle, X } from 'lucide-react'

export interface InlineErrorProps {
  error?: string | null
  type?: 'error' | 'warning' | 'info' | 'success'
  showIcon?: boolean
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function InlineError({
  error,
  type = 'error',
  showIcon = true,
  dismissible = false,
  onDismiss,
  className = '',
  size = 'sm'
}: InlineErrorProps): React.JSX.Element | null {
  if (!error) return null

  const icons = {
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
    success: CheckCircle
  }

  const styles = {
    error: 'text-red-600 bg-red-50 border-red-200',
    warning: 'text-orange-600 bg-orange-50 border-orange-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200',
    success: 'text-green-600 bg-green-50 border-green-200'
  }

  const iconStyles = {
    error: 'text-red-400',
    warning: 'text-orange-400',
    info: 'text-blue-400',
    success: 'text-green-400'
  }

  const sizes = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  const Icon = icons[type]

  return (
    <div className={`
      flex items-start space-x-2 rounded-md border ${styles[type]} ${sizes[size]} ${className}
    `}>
      {showIcon && (
        <Icon className={`${iconSizes[size]} ${iconStyles[type]} flex-shrink-0 mt-0.5`} />
      )}
      <div className="flex-1 min-w-0">
        <p className="break-words">{error}</p>
      </div>
      {dismissible && (
        <button
          onClick={onDismiss}
          className={`flex-shrink-0 ${iconStyles[type]} hover:opacity-70 transition-opacity`}
          aria-label="Dismiss"
        >
          <X className={iconSizes[size]} />
        </button>
      )}
    </div>
  )
}

// Field validation error component with enhanced features
export interface FieldErrorProps {
  error?: string | null
  touched?: boolean
  showOnlyWhenTouched?: boolean
  fieldName?: string
  suggestions?: string[]
  className?: string
}

export function FieldError({
  error,
  touched = false,
  showOnlyWhenTouched = true,
  fieldName,
  suggestions = [],
  className = ''
}: FieldErrorProps): React.JSX.Element | null {
  const shouldShow = error && (!showOnlyWhenTouched || touched)

  if (!shouldShow) return null

  return (
    <div className={`mt-1 ${className}`}>
      <InlineError 
        error={error} 
        type="error" 
        size="sm"
        className="mb-1"
      />
      
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mt-1 space-y-1">
          {suggestions.map((suggestion, index) => (
            <InlineError
              key={index}
              error={suggestion}
              type="info"
              size="sm"
              showIcon={false}
              className="border-0 bg-transparent text-blue-600 px-0 py-0"
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Validation summary component
export interface ValidationSummaryProps {
  errors: Record<string, string>
  title?: string
  showFieldNames?: boolean
  maxErrors?: number
  className?: string
}

export function ValidationSummary({
  errors,
  title = 'Please correct the following errors:',
  showFieldNames = true,
  maxErrors = 5,
  className = ''
}: ValidationSummaryProps): React.JSX.Element | null {
  const errorEntries = Object.entries(errors)
  
  if (errorEntries.length === 0) return null

  const displayedErrors = errorEntries.slice(0, maxErrors)
  const remainingCount = errorEntries.length - maxErrors

  return (
    <div className={`rounded-md bg-red-50 border border-red-200 p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          <div className="mt-2 text-sm text-red-700">
            <ul className="list-disc pl-5 space-y-1">
              {displayedErrors.map(([field, error]) => (
                <li key={field}>
                  {showFieldNames && (
                    <span className="font-medium capitalize">
                      {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                    </span>
                  )} {error}
                </li>
              ))}
            </ul>
            {remainingCount > 0 && (
              <p className="mt-2 text-xs text-red-600">
                And {remainingCount} more error{remainingCount > 1 ? 's' : ''}...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading error state component
export interface LoadingErrorProps {
  error: string
  onRetry?: () => void
  retryLabel?: string
  showRetry?: boolean
  className?: string
}

export function LoadingError({
  error,
  onRetry,
  retryLabel = 'Try Again',
  showRetry = true,
  className = ''
}: LoadingErrorProps): React.JSX.Element {
  return (
    <div className={`text-center py-8 ${className}`}>
      <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
        <AlertCircle className="w-6 h-6 text-red-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load</h3>
      <p className="text-gray-600 mb-4 max-w-sm mx-auto">{error}</p>
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {retryLabel}
        </button>
      )}
    </div>
  )
}

// Empty state with error context
export interface EmptyStateErrorProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}

export function EmptyStateError({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = AlertCircle,
  className = ''
}: EmptyStateErrorProps): React.JSX.Element {
  return (
    <div className={`text-center py-12 ${className}`}>
      <Icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-sm mx-auto">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}