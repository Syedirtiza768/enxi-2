'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  isChunkError: boolean
}

export class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isChunkError: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if this is a chunk loading error
    const isChunkError = 
      error.name === 'ChunkLoadError' ||
      error.message.includes('Loading chunk') ||
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Unable to preload CSS') ||
      error.message.includes('Failed to import')

    return {
      hasError: true,
      error,
      isChunkError
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ChunkErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      errorInfo
    })

    // Log to error monitoring service
    if (typeof window !== 'undefined') {
      console.error('Chunk loading error details:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        isChunkError: this.state.isChunkError,
        url: window.location.href,
        timestamp: new Date().toISOString()
      })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isChunkError: false
    })
  }

  handleHardRefresh = () => {
    // Clear cache and reload
    if (typeof window !== 'undefined') {
      // Clear service worker cache if available
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => registration.unregister())
        })
      }
      
      // Force reload with cache bypass
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        // Special handling for chunk loading errors
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-8 w-8 text-yellow-500 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Loading Error
                </h2>
              </div>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                We encountered an issue loading some application resources. This can happen after updates or due to network issues.
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={this.handleHardRefresh}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
                
                <Button
                  onClick={this.handleReset}
                  className="w-full"
                  variant="outline"
                >
                  Try Again
                </Button>
              </div>
              
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4">
                  <summary className="text-sm text-gray-500 cursor-pointer">
                    Error Details
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
                    {this.state.error?.message}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )
      }

      // Fallback for other errors
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-500 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Something went wrong
              </h2>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              An unexpected error occurred. Please try again or contact support if the issue persists.
            </p>
            
            <Button
              onClick={this.handleReset}
              className="w-full"
              variant="default"
            >
              Try Again
            </Button>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="text-sm text-gray-500 cursor-pointer">
                  Error Details
                </summary>
                <div className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
                  <p className="font-semibold">{this.state.error.name}:</p>
                  <p>{this.state.error.message}</p>
                  {this.state.errorInfo && (
                    <pre className="mt-2">{this.state.errorInfo.componentStack}</pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for functional components
export function useChunkErrorHandler() {
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (
        event.error?.name === 'ChunkLoadError' ||
        event.error?.message?.includes('Loading chunk') ||
        event.error?.message?.includes('Failed to fetch dynamically imported module')
      ) {
        console.error('Chunk loading error detected:', event.error)
        
        // Optionally show a notification
        if (typeof window !== 'undefined') {
          const shouldReload = window.confirm(
            'The application needs to reload to get the latest version. Reload now?'
          )
          if (shouldReload) {
            window.location.reload()
          }
        }
      }
    }

    window.addEventListener('error', handleError)
    
    return () => {
      window.removeEventListener('error', handleError)
    }
  }, [])
}