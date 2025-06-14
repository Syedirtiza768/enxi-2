'use client'

import React from 'react'
import { X, AlertTriangle, AlertCircle, Bug, Copy, CheckCircle, RefreshCw, Home, ExternalLink } from 'lucide-react'
import { ErrorDetails } from '@/lib/services/error-message.service'

export interface ErrorModalProps {
  isOpen: boolean
  errorDetails: ErrorDetails
  onClose: () => void
  onAction?: (actionId: string) => void
  allowClose?: boolean
  showTechnicalDetails?: boolean
}

export function ErrorModal({
  isOpen,
  errorDetails,
  onClose,
  onAction,
  allowClose = true,
  showTechnicalDetails = false
}: ErrorModalProps): React.JSX.Element | null {
  const [copied, setCopied] = React.useState(false)
  const [showDetails, setShowDetails] = React.useState(false)

  const handleAction = React.useCallback((actionId: string) => {
    if (actionId === 'close') {
      onClose()
      return
    }
    
    if (actionId === 'refresh') {
      window.location.reload()
      return
    }
    
    if (actionId === 'home') {
      window.location.href = '/'
      return
    }
    
    onAction?.(actionId)
  }, [onAction, onClose])

  const copyErrorDetails = React.useCallback(async () => {
    const errorText = `
Error: ${errorDetails.title}
Message: ${errorDetails.message}
Code: ${errorDetails.code}
Support Code: ${errorDetails.supportCode || 'N/A'}
Timestamp: ${new Date().toISOString()}
${errorDetails.technical ? `Technical: ${errorDetails.technical}` : ''}
    `.trim()
    
    try {
      await navigator.clipboard.writeText(errorText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy error details:', err)
    }
  }, [errorDetails])

  if (!isOpen) return null

  const isCritical = errorDetails.severity === 'critical'
  const isSystemError = errorDetails.category === 'system_error'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={allowClose ? onClose : undefined}
      />

      {/* Modal */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          {/* Close button */}
          {allowClose && (
            <div className="absolute right-0 top-0 pr-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <span className="sr-only">Close</span>
                <X className="h-6 w-6" />
              </button>
            </div>
          )}

          {/* Icon */}
          <div className="sm:flex sm:items-start">
            <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
              isCritical ? 'bg-red-100' : 'bg-orange-100'
            }`}>
              {isCritical ? (
                <AlertCircle className="h-6 w-6 text-red-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              )}
            </div>

            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
              {/* Title */}
              <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                {errorDetails.title}
              </h3>

              {/* Message */}
              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  {errorDetails.message}
                </p>
              </div>

              {/* Support Code */}
              {errorDetails.supportCode && (
                <div className="mt-4 rounded-md bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Error Reference</h4>
                      <p className="text-sm text-gray-600 font-mono">{errorDetails.supportCode}</p>
                    </div>
                    <button
                      onClick={copyErrorDetails}
                      className="ml-3 inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Error Category Info */}
              <div className="mt-3 text-xs text-gray-500">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                  {errorDetails.category.replace('_', ' ').toUpperCase()}
                </span>
                {errorDetails.retryable && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    RETRYABLE
                  </span>
                )}
              </div>

              {/* Technical Details */}
              {(showTechnicalDetails || process.env.NODE_ENV === 'development') && errorDetails.technical && (
                <div className="mt-4">
                  <button
                    onClick={(): void => setShowDetails(!showDetails)}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                  >
                    <Bug className="h-4 w-4 mr-1" />
                    Technical Details
                  </button>
                  {showDetails && (
                    <div className="mt-2 rounded-md bg-gray-100 p-3">
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-32">
                        {errorDetails.technical}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <div className="flex flex-col-reverse sm:flex-row sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0">
              {/* Primary Actions */}
              {errorDetails.actions?.slice(0, 2).map((action) => (
                <button
                  key={action.id}
                  onClick={(): void => handleAction(action.id)}
                  className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold shadow-sm sm:w-auto ${
                    action.type === 'button' && action.id === 'retry'
                      ? 'bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-500'
                      : action.type === 'link'
                      ? 'bg-gray-600 text-white hover:bg-gray-500 focus:ring-gray-500'
                      : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:ring-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                >
                  {action.type === 'link' && <ExternalLink className="h-4 w-4 mr-1" />}
                  {action.id === 'retry' && <RefreshCw className="h-4 w-4 mr-1" />}
                  {action.label}
                </button>
              ))}

              {/* Common Actions */}
              {errorDetails.retryable && (
                <button
                  onClick={(): void => handleAction('refresh')}
                  className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:w-auto focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh Page
                </button>
              )}

              {!isCritical && (
                <button
                  onClick={(): void => handleAction('home')}
                  className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:w-auto focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Home className="h-4 w-4 mr-1" />
                  Go Home
                </button>
              )}

              {allowClose && (
                <button
                  onClick={onClose}
                  className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:w-auto focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
              )}
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              {isCritical 
                ? 'This is a critical error. Please contact support immediately.'
                : 'If this problem persists, please contact support with the error reference above.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}