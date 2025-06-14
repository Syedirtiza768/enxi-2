'use client'

import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useScreenReaderAnnouncements } from '@/lib/accessibility/announce'

/**
 * Live region components for announcing dynamic content changes
 */

export type LiveRegionType = 'status' | 'alert' | 'log'
export type LiveRegionPoliteness = 'polite' | 'assertive' | 'off'

export interface LiveRegionProps {
  /**
   * Content to announce
   */
  children: React.ReactNode
  
  /**
   * How urgently the content should be announced
   */
  politeness?: LiveRegionPoliteness
  
  /**
   * Whether the entire region should be announced when changed
   */
  atomic?: boolean
  
  /**
   * What types of changes should be announced
   */
  relevant?: 'additions' | 'removals' | 'text' | 'all'
  
  /**
   * ARIA role for the live region
   */
  role?: LiveRegionType
  
  /**
   * Additional CSS classes
   */
  className?: string
  
  /**
   * Whether the live region should be visually hidden
   */
  visuallyHidden?: boolean
  
  /**
   * Unique identifier for the live region
   */
  id?: string
}

/**
 * Generic live region component
 */
export function LiveRegion({
  children,
  politeness = 'polite',
  atomic = true,
  relevant = 'all',
  role = 'status',
  className,
  visuallyHidden = false,
  id,
  ...props
}: LiveRegionProps): React.JSX.Element {
  return (
    <div
      id={id}
      role={role}
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={cn(
        visuallyHidden && 'sr-only',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Status live region for non-critical updates
 */
export interface StatusRegionProps extends Omit<LiveRegionProps, 'role' | 'politeness'> {
  politeness?: 'polite' | 'off'
}

export function StatusRegion({
  politeness = 'polite',
  visuallyHidden = true,
  ...props
}: StatusRegionProps): React.JSX.Element {
  return (
    <LiveRegion
      role="status"
      politeness={politeness}
      visuallyHidden={visuallyHidden}
      {...props}
    />
  )
}

/**
 * Alert live region for critical updates
 */
export interface AlertRegionProps extends Omit<LiveRegionProps, 'role' | 'politeness'> {
  politeness?: 'assertive'
}

export function AlertRegion({
  politeness = 'assertive',
  visuallyHidden = true,
  ...props
}: AlertRegionProps): React.JSX.Element {
  return (
    <LiveRegion
      role="alert"
      politeness={politeness}
      visuallyHidden={visuallyHidden}
      {...props}
    />
  )
}

/**
 * Log live region for sequential updates
 */
export interface LogRegionProps extends Omit<LiveRegionProps, 'role'> {
  /**
   * Maximum number of log entries to keep
   */
  maxEntries?: number
}

export function LogRegion({
  children,
  maxEntries = 10,
  visuallyHidden = true,
  ...props
}: LogRegionProps): React.JSX.Element {
  const [entries, setEntries] = React.useState<React.ReactNode[]>([])
  
  // Add new entries to the log
  React.useEffect(() => {
    if (children) {
      setEntries(prev => {
        const newEntries = [...prev, children]
        return newEntries.slice(-maxEntries)
      })
    }
  }, [children, maxEntries])
  
  return (
    <LiveRegion
      role="log"
      relevant="additions"
      visuallyHidden={visuallyHidden}
      {...props}
    >
      {entries.map((entry, index) => (
        <div key={index}>{entry}</div>
      ))}
    </LiveRegion>
  )
}

/**
 * Loading status component with live region
 */
export interface LoadingStatusProps {
  /**
   * Whether content is loading
   */
  loading: boolean
  
  /**
   * Loading message
   */
  loadingMessage?: string
  
  /**
   * Complete message
   */
  completeMessage?: string
  
  /**
   * Additional CSS classes
   */
  className?: string
  
  /**
   * Whether to show visual loading indicator
   */
  showVisual?: boolean
}

export function LoadingStatus({
  loading,
  loadingMessage = 'Loading',
  completeMessage = 'Loading complete',
  className,
  showVisual = false
}: LoadingStatusProps): React.JSX.Element {
  const [previousLoading, setPreviousLoading] = React.useState(loading)
  const [statusMessage, setStatusMessage] = React.useState('')
  
  // Update status message when loading state changes
  React.useEffect(() => {
    if (loading !== previousLoading) {
      if (loading) {
        setStatusMessage(loadingMessage)
      } else if (previousLoading) {
        setStatusMessage(completeMessage)
      }
      setPreviousLoading(loading)
    }
  }, [loading, previousLoading, loadingMessage, completeMessage])
  
  return (
    <>
      {/* Screen reader status */}
      <StatusRegion>
        {statusMessage}
      </StatusRegion>
      
      {/* Visual indicator */}
      {showVisual && loading && (
        <div
          className={cn('flex items-center space-x-2 text-sm text-gray-600', className)}
          aria-hidden="true"
        >
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
          <span>{loadingMessage}</span>
        </div>
      )}
    </>
  )
}

/**
 * Error status component with live region
 */
export interface ErrorStatusProps {
  /**
   * Error message
   */
  error?: string | null
  
  /**
   * Additional CSS classes
   */
  className?: string
  
  /**
   * Whether to show visual error indicator
   */
  showVisual?: boolean
  
  /**
   * Callback when error is dismissed
   */
  onDismiss?: () => void
}

export function ErrorStatus({
  error,
  className,
  showVisual = false,
  onDismiss
}: ErrorStatusProps): React.JSX.Element {
  // Clear error after announcement
  const errorRef = useRef<string | null>(null)
  
  React.useEffect(() => {
    if (error && error !== errorRef.current) {
      errorRef.current = error
    }
  }, [error])
  
  return (
    <>
      {/* Screen reader alert */}
      {error && (
        <AlertRegion>
          Error: {error}
        </AlertRegion>
      )}
      
      {/* Visual indicator */}
      {showVisual && error && (
        <div
          role="alert"
          className={cn(
            'flex items-start p-4 bg-red-50 border border-red-200 rounded-md',
            className
          )}
        >
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="ml-4 text-red-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-50 rounded"
              aria-label="Dismiss error"
            >
              <span className="sr-only">Dismiss</span>
              ×
            </button>
          )}
        </div>
      )}
    </>
  )
}

/**
 * Success status component with live region
 */
export interface SuccessStatusProps {
  /**
   * Success message
   */
  message?: string | null
  
  /**
   * Additional CSS classes
   */
  className?: string
  
  /**
   * Whether to show visual success indicator
   */
  showVisual?: boolean
  
  /**
   * Auto-dismiss timeout in milliseconds
   */
  autoDismiss?: number
  
  /**
   * Callback when success is dismissed
   */
  onDismiss?: () => void
}

export function SuccessStatus({
  message,
  className,
  showVisual = false,
  autoDismiss,
  onDismiss
}: SuccessStatusProps): React.JSX.Element {
  // Auto-dismiss after timeout
  React.useEffect(() => {
    if (message && autoDismiss && onDismiss) {
      const timer = setTimeout(onDismiss, autoDismiss)
      return (): void => clearTimeout(timer)
    }
  }, [message, autoDismiss, onDismiss])
  
  return (
    <>
      {/* Screen reader status */}
      {message && (
        <StatusRegion>
          Success: {message}
        </StatusRegion>
      )}
      
      {/* Visual indicator */}
      {showVisual && message && (
        <div
          role="status"
          className={cn(
            'flex items-start p-4 bg-green-50 border border-green-200 rounded-md',
            className
          )}
        >
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-800">Success</h3>
            <p className="mt-1 text-sm text-green-700">{message}</p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="ml-4 text-green-400 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-green-50 rounded"
              aria-label="Dismiss success message"
            >
              <span className="sr-only">Dismiss</span>
              ×
            </button>
          )}
        </div>
      )}
    </>
  )
}

/**
 * Form validation status component
 */
export interface ValidationStatusProps {
  /**
   * Form validation errors
   */
  errors?: string[]
  
  /**
   * Form submission success
   */
  success?: string
  
  /**
   * Whether form is being submitted
   */
  submitting?: boolean
  
  /**
   * Additional CSS classes
   */
  className?: string
}

export function ValidationStatus({
  errors = [],
  success,
  submitting,
  className
}: ValidationStatusProps): React.JSX.Element {
  const { announceErrors, announceSuccess } = useScreenReaderAnnouncements()
  
  // Announce validation changes
  React.useEffect(() => {
    if (errors.length > 0) {
      announceErrors(errors)
    }
  }, [errors, announceErrors])
  
  React.useEffect(() => {
    if (success) {
      announceSuccess(success)
    }
  }, [success, announceSuccess])
  
  return (
    <div className={className}>
      {/* Loading status */}
      <LoadingStatus
        loading={submitting}
        loadingMessage="Submitting form"
        completeMessage="Form submitted"
      />
      
      {/* Error status */}
      {errors.length > 0 && (
        <AlertRegion>
          Form has {errors.length} error{errors.length > 1 ? 's' : ''}: {errors.join(', ')}
        </AlertRegion>
      )}
      
      {/* Success status */}
      {success && (
        <StatusRegion>
          Form submitted successfully: {success}
        </StatusRegion>
      )}
    </div>
  )
}

/**
 * Navigation status component for route changes
 */
export interface NavigationStatusProps {
  /**
   * Current page/route name
   */
  currentPage?: string
  
  /**
   * Whether navigation is in progress
   */
  navigating?: boolean
}

export function NavigationStatus({
  currentPage,
  navigating
}: NavigationStatusProps): React.JSX.Element {
  const { announceNavigation } = useScreenReaderAnnouncements()
  
  // Announce navigation changes
  React.useEffect(() => {
    if (currentPage && !navigating) {
      announceNavigation(currentPage)
    }
  }, [currentPage, navigating, announceNavigation])
  
  return (
    <>
      <LoadingStatus
        loading={navigating}
        loadingMessage="Navigating"
        completeMessage="Navigation complete"
      />
      
      {currentPage && !navigating && (
        <StatusRegion>
          Navigated to {currentPage}
        </StatusRegion>
      )}
    </>
  )
}