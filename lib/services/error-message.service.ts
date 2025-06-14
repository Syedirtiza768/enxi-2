/**
 * Error Message Service
 * 
 * Provides user-friendly error messages, categorization, and actionable guidance
 * Supports internationalization and context-aware suggestions
 */

export interface ErrorDetails {
  code: string
  title: string
  message: string
  category: ErrorCategory
  severity: ErrorSeverity
  actionable: boolean
  actions?: ErrorAction[]
  context?: Record<string, any>
  supportCode?: string
  retryable?: boolean
  technical?: string // Technical details for developers
}

export interface ErrorAction {
  id: string
  label: string
  type: 'button' | 'link' | 'info'
  action?: () => void
  url?: string
  icon?: string
}

export enum ErrorCategory {
  USER_ERROR = 'user_error',           // User can fix this
  VALIDATION_ERROR = 'validation_error', // Form/input validation
  NETWORK_ERROR = 'network_error',     // Connection issues
  PERMISSION_ERROR = 'permission_error', // Access denied
  BUSINESS_RULE_ERROR = 'business_rule_error', // Business logic violations
  SYSTEM_ERROR = 'system_error',       // Internal system issues
  MAINTENANCE_ERROR = 'maintenance_error', // System maintenance
  RATE_LIMIT_ERROR = 'rate_limit_error' // Rate limiting
}

export enum ErrorSeverity {
  LOW = 'low',       // Minor inconvenience
  MEDIUM = 'medium', // Blocks current action
  HIGH = 'high',     // Prevents work completion
  CRITICAL = 'critical' // System-wide issue
}

export class ErrorMessageService {
  private static instance: ErrorMessageService
  private language: string = 'en'
  
  private constructor() {}
  
  public static getInstance(): ErrorMessageService {
    if (!ErrorMessageService.instance) {
      ErrorMessageService.instance = new ErrorMessageService()
    }
    return ErrorMessageService.instance
  }
  
  public setLanguage(language: string): void {
    this.language = language
  }
  
  /**
   * Convert various error types to user-friendly ErrorDetails
   */
  public processError(error: unknown, context?: Record<string, any>): ErrorDetails {
    // Handle API errors (from our API client)
    if (this.isApiError(error)) {
      return this.handleApiError(error, context)
    }
    
    // Handle validation errors (Zod)
    if (this.isValidationError(error)) {
      return this.handleValidationError(error, context)
    }
    
    // Handle network errors
    if (this.isNetworkError(error)) {
      return this.handleNetworkError(error, context)
    }
    
    // Handle custom application errors
    if (this.isApplicationError(error)) {
      return this.handleApplicationError(error, context)
    }
    
    // Handle generic JavaScript errors
    if (error instanceof Error) {
      return this.handleGenericError(error, context)
    }
    
    // Handle unknown errors
    return this.handleUnknownError(error, context)
  }
  
  /**
   * Get error details by error code
   */
  public getErrorByCode(code: string, context?: Record<string, any>): ErrorDetails {
    const errorMap = this.getErrorCodeMap()
    const errorConfig = errorMap[code]
    
    if (!errorConfig) {
      return this.createGenericError(code, context)
    }
    
    return {
      ...errorConfig,
      context,
      supportCode: this.generateSupportCode(code),
      actions: this.enhanceActions(errorConfig.actions || [], context)
    }
  }
  
  /**
   * Create error details for common HTTP status codes
   */
  public getHttpError(status: number, statusText?: string, context?: Record<string, any>): ErrorDetails {
    const httpErrors: Record<number, Partial<ErrorDetails>> = {
      400: {
        code: 'HTTP_400',
        title: 'Invalid Request',
        message: 'The request could not be processed. Please check your input and try again.',
        category: ErrorCategory.USER_ERROR,
        severity: ErrorSeverity.MEDIUM,
        actionable: true,
        actions: [
          { id: 'review-input', label: 'Review Input', type: 'info' },
          { id: 'retry', label: 'Try Again', type: 'button' }
        ]
      },
      401: {
        code: 'HTTP_401',
        title: 'Authentication Required',
        message: 'You need to log in to access this resource.',
        category: ErrorCategory.PERMISSION_ERROR,
        severity: ErrorSeverity.HIGH,
        actionable: true,
        actions: [
          { id: 'login', label: 'Log In', type: 'button', url: '/auth/login' },
          { id: 'contact-admin', label: 'Contact Administrator', type: 'info' }
        ]
      },
      403: {
        code: 'HTTP_403',
        title: 'Access Denied',
        message: 'You don\'t have permission to access this resource. Contact your administrator if you believe this is an error.',
        category: ErrorCategory.PERMISSION_ERROR,
        severity: ErrorSeverity.HIGH,
        actionable: true,
        actions: [
          { id: 'contact-admin', label: 'Contact Administrator', type: 'info' },
          { id: 'view-permissions', label: 'View My Permissions', type: 'link', url: '/profile/permissions' }
        ]
      },
      404: {
        code: 'HTTP_404',
        title: 'Not Found',
        message: 'The requested resource could not be found. It may have been moved or deleted.',
        category: ErrorCategory.USER_ERROR,
        severity: ErrorSeverity.MEDIUM,
        actionable: true,
        actions: [
          { id: 'go-back', label: 'Go Back', type: 'button' },
          { id: 'home', label: 'Go to Home', type: 'link', url: '/' }
        ]
      },
      409: {
        code: 'HTTP_409',
        title: 'Conflict',
        message: 'This action conflicts with existing data. Please refresh the page and try again.',
        category: ErrorCategory.BUSINESS_RULE_ERROR,
        severity: ErrorSeverity.MEDIUM,
        actionable: true,
        retryable: true,
        actions: [
          { id: 'refresh', label: 'Refresh Page', type: 'button' },
          { id: 'retry', label: 'Try Again', type: 'button' }
        ]
      },
      422: {
        code: 'HTTP_422',
        title: 'Validation Error',
        message: 'The submitted data is invalid. Please correct the highlighted fields and try again.',
        category: ErrorCategory.VALIDATION_ERROR,
        severity: ErrorSeverity.MEDIUM,
        actionable: true,
        actions: [
          { id: 'review-form', label: 'Review Form', type: 'info' },
          { id: 'retry', label: 'Try Again', type: 'button' }
        ]
      },
      429: {
        code: 'HTTP_429',
        title: 'Too Many Requests',
        message: 'You\'re making too many requests. Please wait a moment before trying again.',
        category: ErrorCategory.RATE_LIMIT_ERROR,
        severity: ErrorSeverity.MEDIUM,
        actionable: true,
        retryable: true,
        actions: [
          { id: 'wait-retry', label: 'Wait and Retry', type: 'button' }
        ]
      },
      500: {
        code: 'HTTP_500',
        title: 'Server Error',
        message: 'An internal server error occurred. Our team has been notified. Please try again later.',
        category: ErrorCategory.SYSTEM_ERROR,
        severity: ErrorSeverity.HIGH,
        actionable: false,
        retryable: true,
        actions: [
          { id: 'retry-later', label: 'Try Again Later', type: 'button' },
          { id: 'contact-support', label: 'Contact Support', type: 'info' }
        ]
      },
      502: {
        code: 'HTTP_502',
        title: 'Service Unavailable',
        message: 'The service is temporarily unavailable. Please try again in a few minutes.',
        category: ErrorCategory.SYSTEM_ERROR,
        severity: ErrorSeverity.HIGH,
        actionable: false,
        retryable: true,
        actions: [
          { id: 'retry-later', label: 'Try Again Later', type: 'button' },
          { id: 'status-page', label: 'Check System Status', type: 'link', url: '/status' }
        ]
      },
      503: {
        code: 'HTTP_503',
        title: 'Maintenance Mode',
        message: 'The system is currently under maintenance. Please check back shortly.',
        category: ErrorCategory.MAINTENANCE_ERROR,
        severity: ErrorSeverity.HIGH,
        actionable: false,
        actions: [
          { id: 'status-page', label: 'Check Maintenance Status', type: 'link', url: '/status' },
          { id: 'retry-later', label: 'Try Again Later', type: 'button' }
        ]
      }
    }
    
    const baseError = httpErrors[status] || {
      code: `HTTP_${status}`,
      title: 'Request Failed',
      message: statusText || 'An unexpected error occurred. Please try again.',
      category: ErrorCategory.SYSTEM_ERROR,
      severity: ErrorSeverity.MEDIUM,
      actionable: true,
      retryable: true
    }
    
    return {
      ...baseError,
      context,
      supportCode: this.generateSupportCode(`HTTP_${status}`),
      technical: `HTTP ${status} ${statusText || ''}`,
      actions: this.enhanceActions(baseError.actions || [], context)
    } as ErrorDetails
  }
  
  private isApiError(error: any): boolean {
    return error && typeof error === 'object' && 'status' in error && 'error' in error
  }
  
  private isValidationError(error: any): boolean {
    return error && error.name === 'ZodError' || (error && error.errors && Array.isArray(error.errors))
  }
  
  private isNetworkError(error: any): boolean {
    if (!error) return false
    const message = error.message || ''
    return (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('NetworkError') ||
      message.includes('Failed to fetch') ||
      error.code === 'NETWORK_ERROR'
    )
  }
  
  private isApplicationError(error: any): boolean {
    return error && error.code && typeof error.code === 'string' && error.code.startsWith('APP_')
  }
  
  private handleApiError(error: any, context?: Record<string, any>): ErrorDetails {
    return this.getHttpError(error.status, error.error, {
      ...context,
      apiError: true,
      originalError: error
    })
  }
  
  private handleValidationError(error: any, context?: Record<string, any>): ErrorDetails {
    let message = 'Please correct the following errors:'
    let fieldErrors: Record<string, string> = {}
    
    if (error.name === 'ZodError' && error.errors) {
      fieldErrors = error.errors.reduce((acc: Record<string, string>, err: any) => {
        const field = err.path.join('.')
        acc[field] = err.message
        return acc
      }, {})
      
      message = `Please correct the following fields: ${Object.keys(fieldErrors).join(', ')}`
    }
    
    return {
      code: 'VALIDATION_ERROR',
      title: 'Invalid Input',
      message,
      category: ErrorCategory.VALIDATION_ERROR,
      severity: ErrorSeverity.MEDIUM,
      actionable: true,
      context: { ...context, fieldErrors },
      supportCode: this.generateSupportCode('VALIDATION_ERROR'),
      actions: [
        { id: 'review-fields', label: 'Review Fields', type: 'info' },
        { id: 'retry', label: 'Try Again', type: 'button' }
      ]
    }
  }
  
  private handleNetworkError(error: Error, context?: Record<string, any>): ErrorDetails {
    return {
      code: 'NETWORK_ERROR',
      title: 'Connection Problem',
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      category: ErrorCategory.NETWORK_ERROR,
      severity: ErrorSeverity.HIGH,
      actionable: true,
      retryable: true,
      context,
      supportCode: this.generateSupportCode('NETWORK_ERROR'),
      technical: error.message,
      actions: [
        { id: 'check-connection', label: 'Check Connection', type: 'info' },
        { id: 'retry', label: 'Try Again', type: 'button' },
        { id: 'offline-mode', label: 'Work Offline', type: 'button' }
      ]
    }
  }
  
  private handleApplicationError(error: any, context?: Record<string, any>): ErrorDetails {
    return this.getErrorByCode(error.code, {
      ...context,
      originalMessage: error.message
    })
  }
  
  private handleGenericError(error: Error, context?: Record<string, any>): ErrorDetails {
    return {
      code: 'GENERIC_ERROR',
      title: 'Unexpected Error',
      message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
      category: ErrorCategory.SYSTEM_ERROR,
      severity: ErrorSeverity.MEDIUM,
      actionable: true,
      retryable: true,
      context,
      supportCode: this.generateSupportCode('GENERIC_ERROR'),
      technical: error.message,
      actions: [
        { id: 'retry', label: 'Try Again', type: 'button' },
        { id: 'contact-support', label: 'Contact Support', type: 'info' }
      ]
    }
  }
  
  private handleUnknownError(error: unknown, context?: Record<string, any>): ErrorDetails {
    return {
      code: 'UNKNOWN_ERROR',
      title: 'Unknown Error',
      message: 'Something unexpected happened. Please try again or contact support.',
      category: ErrorCategory.SYSTEM_ERROR,
      severity: ErrorSeverity.MEDIUM,
      actionable: true,
      retryable: true,
      context,
      supportCode: this.generateSupportCode('UNKNOWN_ERROR'),
      technical: String(error),
      actions: [
        { id: 'retry', label: 'Try Again', type: 'button' },
        { id: 'contact-support', label: 'Contact Support', type: 'info' }
      ]
    }
  }
  
  private getErrorCodeMap(): Record<string, Partial<ErrorDetails>> {
    return {
      // Business Logic Errors
      'INSUFFICIENT_INVENTORY': {
        code: 'INSUFFICIENT_INVENTORY',
        title: 'Insufficient Inventory',
        message: 'Not enough stock available to complete this request.',
        category: ErrorCategory.BUSINESS_RULE_ERROR,
        severity: ErrorSeverity.MEDIUM,
        actionable: true,
        actions: [
          { id: 'check-inventory', label: 'Check Inventory', type: 'link', url: '/inventory' },
          { id: 'adjust-quantity', label: 'Adjust Quantity', type: 'info' },
          { id: 'create-purchase-order', label: 'Create Purchase Order', type: 'button' }
        ]
      },
      
      'CUSTOMER_CREDIT_LIMIT_EXCEEDED': {
        code: 'CUSTOMER_CREDIT_LIMIT_EXCEEDED',
        title: 'Credit Limit Exceeded',
        message: 'This transaction would exceed the customer\'s credit limit.',
        category: ErrorCategory.BUSINESS_RULE_ERROR,
        severity: ErrorSeverity.HIGH,
        actionable: true,
        actions: [
          { id: 'view-customer-credit', label: 'View Customer Credit', type: 'link' },
          { id: 'request-approval', label: 'Request Manager Approval', type: 'button' },
          { id: 'collect-payment', label: 'Collect Payment First', type: 'info' }
        ]
      },
      
      'DUPLICATE_INVOICE_NUMBER': {
        code: 'DUPLICATE_INVOICE_NUMBER',
        title: 'Duplicate Invoice Number',
        message: 'An invoice with this number already exists.',
        category: ErrorCategory.BUSINESS_RULE_ERROR,
        severity: ErrorSeverity.MEDIUM,
        actionable: true,
        actions: [
          { id: 'generate-new-number', label: 'Generate New Number', type: 'button' },
          { id: 'view-existing', label: 'View Existing Invoice', type: 'link' }
        ]
      },
      
      // Permission Errors
      'INSUFFICIENT_PERMISSIONS': {
        code: 'INSUFFICIENT_PERMISSIONS',
        title: 'Access Denied',
        message: 'You don\'t have the required permissions to perform this action.',
        category: ErrorCategory.PERMISSION_ERROR,
        severity: ErrorSeverity.HIGH,
        actionable: true,
        actions: [
          { id: 'contact-admin', label: 'Contact Administrator', type: 'info' },
          { id: 'view-permissions', label: 'View My Permissions', type: 'link', url: '/profile/permissions' },
          { id: 'request-access', label: 'Request Access', type: 'button' }
        ]
      },
      
      // Data Integrity Errors
      'REFERENCED_RECORD_EXISTS': {
        code: 'REFERENCED_RECORD_EXISTS',
        title: 'Cannot Delete',
        message: 'This record cannot be deleted because it\'s referenced by other records.',
        category: ErrorCategory.BUSINESS_RULE_ERROR,
        severity: ErrorSeverity.MEDIUM,
        actionable: true,
        actions: [
          { id: 'view-references', label: 'View References', type: 'button' },
          { id: 'archive-instead', label: 'Archive Instead', type: 'button' }
        ]
      },
      
      // System Errors
      'DATABASE_CONNECTION_FAILED': {
        code: 'DATABASE_CONNECTION_FAILED',
        title: 'Database Error',
        message: 'Unable to connect to the database. Please try again in a moment.',
        category: ErrorCategory.SYSTEM_ERROR,
        severity: ErrorSeverity.CRITICAL,
        actionable: false,
        retryable: true,
        actions: [
          { id: 'retry-later', label: 'Try Again Later', type: 'button' },
          { id: 'contact-support', label: 'Contact Support', type: 'info' }
        ]
      }
    }
  }
  
  private createGenericError(code: string, context?: Record<string, any>): ErrorDetails {
    return {
      code,
      title: 'Error',
      message: 'An error occurred. Please try again or contact support.',
      category: ErrorCategory.SYSTEM_ERROR,
      severity: ErrorSeverity.MEDIUM,
      actionable: true,
      retryable: true,
      context,
      supportCode: this.generateSupportCode(code),
      actions: [
        { id: 'retry', label: 'Try Again', type: 'button' },
        { id: 'contact-support', label: 'Contact Support', type: 'info' }
      ]
    }
  }
  
  private enhanceActions(actions: ErrorAction[], context?: Record<string, any>): ErrorAction[] {
    return actions.map(action => {
      // Add context-specific enhancements
      if (action.id === 'contact-support' && context?.supportCode) {
        return {
          ...action,
          label: `Contact Support (Ref: ${context.supportCode})`
        }
      }
      
      if (action.id === 'view-customer-credit' && context?.customerId) {
        return {
          ...action,
          url: `/customers/${context.customerId}/credit`
        }
      }
      
      return action
    })
  }
  
  private generateSupportCode(errorCode: string): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 4)
    return `${errorCode}-${timestamp}-${random}`.toUpperCase()
  }
  
  /**
   * Utility methods for common error scenarios
   */
  public createValidationError(fieldErrors: Record<string, string>): ErrorDetails {
    const fieldNames = Object.keys(fieldErrors)
    return {
      code: 'FORM_VALIDATION_ERROR',
      title: 'Form Validation Error',
      message: `Please correct the following fields: ${fieldNames.join(', ')}`,
      category: ErrorCategory.VALIDATION_ERROR,
      severity: ErrorSeverity.MEDIUM,
      actionable: true,
      context: { fieldErrors },
      supportCode: this.generateSupportCode('FORM_VALIDATION_ERROR'),
      actions: [
        { id: 'review-fields', label: 'Review Highlighted Fields', type: 'info' },
        { id: 'retry', label: 'Try Again', type: 'button' }
      ]
    }
  }
  
  public createNetworkError(retryable: boolean = true): ErrorDetails {
    return {
      code: 'NETWORK_CONNECTION_ERROR',
      title: 'Connection Problem',
      message: 'Unable to connect to the server. Please check your internet connection.',
      category: ErrorCategory.NETWORK_ERROR,
      severity: ErrorSeverity.HIGH,
      actionable: true,
      retryable,
      supportCode: this.generateSupportCode('NETWORK_CONNECTION_ERROR'),
      actions: retryable ? [
        { id: 'check-connection', label: 'Check Your Connection', type: 'info' },
        { id: 'retry', label: 'Try Again', type: 'button' }
      ] : [
        { id: 'check-connection', label: 'Check Your Connection', type: 'info' },
        { id: 'contact-support', label: 'Contact Support', type: 'info' }
      ]
    }
  }
  
  public createBusinessRuleError(rule: string, suggestion?: string): ErrorDetails {
    return {
      code: 'BUSINESS_RULE_VIOLATION',
      title: 'Business Rule Violation',
      message: `${rule}${suggestion ? ` ${suggestion}` : ''}`,
      category: ErrorCategory.BUSINESS_RULE_ERROR,
      severity: ErrorSeverity.MEDIUM,
      actionable: true,
      supportCode: this.generateSupportCode('BUSINESS_RULE_VIOLATION'),
      actions: [
        { id: 'review-rules', label: 'Review Business Rules', type: 'info' },
        { id: 'contact-manager', label: 'Contact Manager', type: 'info' }
      ]
    }
  }
}

// Export singleton instance
export const errorMessageService = ErrorMessageService.getInstance()