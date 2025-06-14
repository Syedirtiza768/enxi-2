/**
 * Error Handling Components
 * 
 * Comprehensive error handling components and utilities
 */

// Error Boundary
export { ErrorBoundary, useErrorBoundary } from './error-boundary'

// Error Modals
export { ErrorModal } from './error-modal'
export type { ErrorModalProps } from './error-modal'

// Toast Components
export { ErrorToast, ToastContainer } from './error-toast'
export type { ToastProps, ToastContainerProps } from './error-toast'

// Inline Error Components
export {
  InlineError,
  FieldError,
  ValidationSummary,
  LoadingError,
  EmptyStateError
} from './inline-error'
export type {
  InlineErrorProps,
  FieldErrorProps,
  ValidationSummaryProps,
  LoadingErrorProps,
  EmptyStateErrorProps
} from './inline-error'

// Error Message Service
export {
  errorMessageService,
  ErrorMessageService,
  ErrorCategory,
  ErrorSeverity
} from '@/lib/services/error-message.service'
export type {
  ErrorDetails,
  ErrorAction
} from '@/lib/services/error-message.service'

// Error Handling Hooks
export {
  useErrorHandling,
  useFormErrorHandling,
  useApiOperation,
  useNetworkStatus
} from '@/lib/hooks/use-error-handling'
export type {
  ErrorState,
  ErrorHandlingOptions
} from '@/lib/hooks/use-error-handling'

// Retry Utilities
export {
  withRetry,
  RetryStrategies,
  useRetry
} from '@/lib/utils/retry'
export type {
  RetryOptions,
  RetryResult
} from '@/lib/utils/retry'