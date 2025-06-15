'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug, Copy, CheckCircle } from 'lucide-react'
import { errorMessageService, ErrorDetails } from '@/lib/services/error-message.service'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
}

interface State {
  hasError: boolean
  errorDetails: ErrorDetails | null
  errorInfo: ErrorInfo | null
  copied: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  private errorId: string

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      errorDetails: null,
      errorInfo: null,
      copied: false
    }
    this.errorId = ''
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorDetails = errorMessageService.processError(error, {
      boundaryError: true,
      timestamp: new Date().toISOString()
    })
    
    return {
      hasError: true,
      errorDetails
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    this.setState({ errorInfo })
    
    // Log error to console and external service
    console.error('Error Boundary caught an error:', error)
    console.error('Error Info:', errorInfo)
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
    
    // TODO: Send to error reporting service
    this.reportError(error, errorInfo)
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo): void => {
    try {
      // Here you would typically send to an error reporting service
      // like Sentry, LogRocket, etc.
      const errorReport = {
        id: this.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
      
      console.log('Error Report:', errorReport)
      // await apiClient('/api/errors/report', { method: 'POST', body: JSON.stringify(errorReport) })
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      errorDetails: null,
      errorInfo: null,
      copied: false
    })
  }

  private handleRefresh = (): void => {
    window.location.reload()
  }

  private handleGoHome = (): void => {
    window.location.href = '/'
  }

  private copyErrorDetails = async (): void => {
    if (!this.state.errorDetails || !this.state.errorInfo) return
    
    const errorText = `
Error ID: ${this.errorId}
Time: ${new Date().toISOString()}
Message: ${this.state.errorDetails.message}
Technical: ${this.state.errorDetails.technical || 'N/A'}
Component Stack: ${this.state.errorInfo.componentStack}
    `.trim()
    
    try {
      await navigator.clipboard.writeText(errorText)
      this.setState({ copied: true })
      setTimeout(() => this.setState({ copied: false }), 2000)
    } catch (err) {
      console.error('Failed to copy error details:', err)
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { errorDetails } = this.state
      if (!errorDetails) return null

      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
              {/* Error Icon */}
              <div className="flex justify-center mb-6">
                <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>

              {/* Error Title */}
              <div className="text-center mb-6">
                <h1 className="text-xl font-semibold text-gray-900 mb-2">
                  {errorDetails.title}
                </h1>
                <p className="text-gray-600">
                  {errorDetails.message}
                </p>
              </div>

              {/* Error Code */}
              {errorDetails.supportCode && (
                <div className="bg-gray-50 rounded-md p-3 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Error Reference</p>
                      <p className="text-sm text-gray-600 font-mono">{errorDetails.supportCode}</p>
                    </div>
                    <button
                      onClick={this.copyErrorDetails}
                      className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                      title="Copy error details"
                    >
                      {this.state.copied ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                {errorDetails.retryable && (
                  <button
                    onClick={this.handleRetry}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </button>
                )}
                
                <button
                  onClick={this.handleRefresh}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Page
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Home
                </button>
              </div>

              {/* Technical Details (Development Mode) */}
              {this.props.showDetails && process.env.NODE_ENV === 'development' && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-medium text-gray-900 flex items-center">
                    <Bug className="w-4 h-4 mr-2" />
                    Technical Details
                  </summary>
                  <div className="mt-3 p-3 bg-gray-100 rounded text-xs font-mono whitespace-pre-wrap overflow-auto max-h-32">
                    {this.state.errorInfo?.componentStack}
                  </div>
                </details>
              )}

              {/* Help Text */}
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  If this problem persists, please contact support with the error reference above.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// React Hook version for functional components
export function useErrorBoundary(): unknown {
  const [error, setError] = React.useState<Error | null>(null)
  
  const resetError = React.useCallback(() => {
    setError(null)
  }, [])
  
  const captureError = React.useCallback((error: Error) => {
    setError(error)
  }, [])
  
  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])
  
  return { captureError, resetError }
}