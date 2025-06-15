/**
 * Runtime Error Monitor
 * Tracks TypeErrors and other runtime errors in production
 */

import React from 'react'

interface ErrorReport {
  type: 'TypeError' | 'ReferenceError' | 'NetworkError' | 'Other'
  message: string
  stack?: string
  url?: string
  line?: number
  column?: number
  userAgent?: string
  timestamp: string
  context?: Record<string, any>
}

class RuntimeErrorMonitor {
  private errorQueue: ErrorReport[] = []
  private flushInterval: NodeJS.Timeout | null = null
  private maxQueueSize = 50
  private flushIntervalMs = 30000 // 30 seconds

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupBrowserMonitoring()
    }
  }

  private setupBrowserMonitoring() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError({
        type: event.error.name === 'TypeError' ? 'TypeError' : 'Other',
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        line: event.lineno,
        column: event.colno,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      })
    })

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        type: 'Other',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        timestamp: new Date().toISOString(),
      })
    })

    // Start flush interval
    this.startFlushInterval()
  }

  captureError(error: ErrorReport) {
    // Don't capture in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Runtime Error:', error)
      return
    }

    // Add to queue
    this.errorQueue.push(error)

    // Flush if queue is full
    if (this.errorQueue.length >= this.maxQueueSize) {
      this.flush()
    }
  }

  private async flush() {
    if (this.errorQueue.length === 0) return

    const errors = [...this.errorQueue]
    this.errorQueue = []

    try {
      await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors }),
      })
    } catch (error) {
      console.error('Failed to send error reports:', error)
      // Re-add errors to queue
      this.errorQueue.unshift(...errors)
    }
  }

  private startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flush()
    }, this.flushIntervalMs)
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    this.flush()
  }

  // Utility to check if errors increased after deployment
  async checkErrorRate(): Promise<{
    typeErrors: number
    totalErrors: number
    errorRate: number
  }> {
    try {
      const response = await fetch('/api/monitoring/error-stats')
      return await response.json()
    } catch {
      return { typeErrors: 0, totalErrors: 0, errorRate: 0 }
    }
  }
}

// Export singleton instance
export const errorMonitor = new RuntimeErrorMonitor()

// React error boundary component
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = React.useState(false)

  React.useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      setHasError(true)
      errorMonitor.captureError({
        type: error.error.name === 'TypeError' ? 'TypeError' : 'Other',
        message: error.message,
        stack: error.error?.stack,
        timestamp: new Date().toISOString(),
        context: { component: 'ErrorBoundary' }
      })
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  if (hasError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <h2 className="text-red-800 font-bold">Something went wrong</h2>
        <p className="text-red-600">We've been notified and are working on a fix.</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
        >
          Reload Page
        </button>
      </div>
    )
  }

  return <>{children}</>
}

// Hook for monitoring specific operations
export function useErrorMonitoring(operationName: string) {
  return {
    captureError: (error: Error) => {
      errorMonitor.captureError({
        type: error.name === 'TypeError' ? 'TypeError' : 'Other',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        context: { operation: operationName }
      })
    }
  }
}