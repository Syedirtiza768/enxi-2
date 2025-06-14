# Enhanced Error Handling System

This document describes the comprehensive error handling system implemented in the Enxi ERP application. The system provides user-friendly error messages, actionable guidance, retry mechanisms, and comprehensive error categorization.

## Overview

The error handling system consists of several components:

1. **Error Message Service** - Converts technical errors to user-friendly messages
2. **Error Components** - UI components for displaying errors
3. **Error Handling Hooks** - React hooks for managing error state
4. **Retry Mechanisms** - Automatic retry for transient failures
5. **Enhanced API Client** - Structured error responses

## Error Categories

Errors are automatically categorized into:

- `USER_ERROR` - User can fix this (e.g., invalid input)
- `VALIDATION_ERROR` - Form/input validation errors
- `NETWORK_ERROR` - Connection issues
- `PERMISSION_ERROR` - Access denied scenarios
- `BUSINESS_RULE_ERROR` - Business logic violations
- `SYSTEM_ERROR` - Internal system issues
- `MAINTENANCE_ERROR` - System maintenance
- `RATE_LIMIT_ERROR` - Rate limiting

## Error Severity Levels

- `LOW` - Minor inconvenience
- `MEDIUM` - Blocks current action
- `HIGH` - Prevents work completion
- `CRITICAL` - System-wide issue

## Components

### Error Boundary

Catches React errors and displays a user-friendly error page:

```tsx
import { ErrorBoundary } from '@/components/error'

function App() {
  return (
    <ErrorBoundary showDetails={true} onError={(error, errorInfo) => {
      // Log to error reporting service
    }}>
      <YourApp />
    </ErrorBoundary>
  )
}
```

### Enhanced Toast System

Displays non-blocking error notifications:

```tsx
import { useToast } from '@/components/ui/use-toast'

function MyComponent() {
  const { error, success, warning, info } = useToast()
  
  const handleError = async () => {
    try {
      await apiCall()
    } catch (err) {
      error(err, { operation: 'create_customer' })
    }
  }
  
  return <button onClick={handleError}>Create Customer</button>
}
```

### Error Modal

For critical errors that require user attention:

```tsx
import { ErrorModal } from '@/components/error'
import { useState } from 'react'

function MyComponent() {
  const [errorDetails, setErrorDetails] = useState(null)
  
  return (
    <ErrorModal
      isOpen={!!errorDetails}
      errorDetails={errorDetails}
      onClose={() => setErrorDetails(null)}
      onAction={(actionId) => {
        // Handle error actions
      }}
    />
  )
}
```

### Inline Error Components

For form validation and field-specific errors:

```tsx
import { FieldError, ValidationSummary } from '@/components/error'

function FormComponent() {
  return (
    <div>
      <input type="email" />
      <FieldError 
        error="Invalid email address" 
        touched={true}
        suggestions={["Check the format", "Ensure @ symbol is present"]}
      />
      
      <ValidationSummary 
        errors={{
          email: "Invalid email",
          name: "Name is required"
        }}
      />
    </div>
  )
}
```

## Hooks

### useErrorHandling

Comprehensive error handling for components:

```tsx
import { useErrorHandling } from '@/lib/hooks/use-error-handling'

function MyComponent() {
  const {
    error,
    isLoading,
    hasError,
    executeWithErrorHandling,
    clearError,
    retry
  } = useErrorHandling({
    showToast: true,
    context: { component: 'MyComponent' }
  })
  
  const handleApiCall = async () => {
    const result = await executeWithErrorHandling(
      () => apiClient('/api/data'),
      { retryStrategy: 'api' }
    )
    
    if (result) {
      // Success handling
    }
  }
}
```

### useFormErrorHandling

Specialized hook for form validation:

```tsx
import { useFormErrorHandling } from '@/lib/hooks/use-error-handling'

function FormComponent() {
  const {
    fieldErrors,
    setFieldError,
    validateField,
    getFieldError,
    isValid
  } = useFormErrorHandling()
  
  const validateEmail = (email) => {
    if (!email) return "Email is required"
    if (!email.includes('@')) return "Invalid email format"
    return null
  }
  
  const handleEmailChange = (email) => {
    validateField('email', email, validateEmail)
  }
}
```

### useApiOperation

Simplified API calls with automatic error handling:

```tsx
import { useApiOperation } from '@/lib/hooks/use-error-handling'

function DataComponent() {
  const { execute, isLoading, error } = useApiOperation()
  
  const createItem = async (data) => {
    const result = await execute(
      () => apiClient('/api/items', { method: 'POST', body: JSON.stringify(data) }),
      { successMessage: 'Item created successfully!' }
    )
    
    return result
  }
}
```

## Error Message Service

Converts technical errors to user-friendly messages:

```tsx
import { errorMessageService } from '@/lib/services/error-message.service'

// Process any error
const errorDetails = errorMessageService.processError(error, {
  context: { userId: 123, operation: 'create_order' }
})

// Get specific error by code
const errorDetails = errorMessageService.getErrorByCode('INSUFFICIENT_INVENTORY', {
  itemId: 'ABC123',
  requestedQuantity: 10,
  availableQuantity: 5
})

// Create business rule error
const errorDetails = errorMessageService.createBusinessRuleError(
  'Cannot delete customer with active orders',
  'Archive the customer instead or complete all orders first.'
)
```

## Retry Mechanisms

Automatic retry for transient failures:

```tsx
import { withRetry, RetryStrategies } from '@/lib/utils/retry'

// Use predefined strategy
const result = await withRetry(
  () => apiClient('/api/data'),
  RetryStrategies.api
)

// Custom retry configuration
const result = await withRetry(
  () => apiClient('/api/critical-operation'),
  {
    maxAttempts: 5,
    initialDelay: 1000,
    backoffFactor: 2,
    retryCondition: (error) => error.status >= 500,
    onRetry: (error, attempt) => console.log(`Retry ${attempt}`)
  }
)
```

## Best Practices

### 1. Always Use Error Boundaries

Wrap your application in error boundaries to catch unexpected errors:

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
```

### 2. Provide Context

Always provide context when handling errors:

```tsx
const { error } = useToast()

try {
  await apiCall()
} catch (err) {
  error(err, {
    operation: 'create_customer',
    userId: user.id,
    formData: customerData
  })
}
```

### 3. Use Appropriate Error Components

- **Toast** - Non-blocking notifications
- **Inline** - Form validation errors
- **Modal** - Critical errors requiring attention
- **Boundary** - Unexpected React errors

### 4. Implement Proper Validation

Use real-time validation with proper user feedback:

```tsx
const handleFieldChange = (field, value) => {
  setFormData(prev => ({ ...prev, [field]: value }))
  
  // Validate if field has been touched
  if (touchedFields.has(field)) {
    validateField(field, value, validators[field])
  }
}

const handleFieldBlur = (field) => {
  setFieldTouched(field)
  validateField(field, formData[field], validators[field])
}
```

### 5. Handle Network Status

Monitor network connectivity and provide appropriate feedback:

```tsx
import { useNetworkStatus } from '@/lib/hooks/use-error-handling'

function MyComponent() {
  const { isOnline, networkError } = useNetworkStatus()
  
  if (!isOnline) {
    return <div>You're offline. Please check your connection.</div>
  }
}
```

### 6. Provide Actionable Guidance

Always include actionable steps in error messages:

```tsx
const errorDetails = {
  title: 'Insufficient Inventory',
  message: 'Not enough stock available to complete this request.',
  actions: [
    { id: 'check-inventory', label: 'Check Inventory', type: 'link', url: '/inventory' },
    { id: 'adjust-quantity', label: 'Adjust Quantity', type: 'info' },
    { id: 'create-purchase-order', label: 'Create Purchase Order', type: 'button' }
  ]
}
```

## Testing Error Handling

### Unit Tests

Test error scenarios in your components:

```tsx
import { render, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '@/components/error'

test('handles component errors gracefully', () => {
  const ThrowError = () => {
    throw new Error('Test error')
  }
  
  const { getByText } = render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  )
  
  expect(getByText('Unexpected Error')).toBeInTheDocument()
})
```

### Integration Tests

Test API error handling:

```tsx
import { server } from '../mocks/server'
import { rest } from 'msw'

test('handles API errors', async () => {
  server.use(
    rest.post('/api/customers', (req, res, ctx) => {
      return res(ctx.status(500), ctx.json({ error: 'Server error' }))
    })
  )
  
  // Test component behavior with server error
})
```

## Error Codes Reference

### Common HTTP Errors

- `HTTP_400` - Bad Request
- `HTTP_401` - Unauthorized
- `HTTP_403` - Forbidden
- `HTTP_404` - Not Found
- `HTTP_409` - Conflict
- `HTTP_422` - Validation Error
- `HTTP_429` - Rate Limited
- `HTTP_500` - Server Error
- `HTTP_502` - Bad Gateway
- `HTTP_503` - Service Unavailable

### Business Logic Errors

- `INSUFFICIENT_INVENTORY` - Not enough stock
- `CUSTOMER_CREDIT_LIMIT_EXCEEDED` - Credit limit exceeded
- `DUPLICATE_INVOICE_NUMBER` - Invoice number already exists
- `REFERENCED_RECORD_EXISTS` - Cannot delete referenced record

### System Errors

- `NETWORK_ERROR` - Network connectivity issues
- `DATABASE_CONNECTION_FAILED` - Database connection problems
- `VALIDATION_ERROR` - Form validation failures

## Migration Guide

### From Basic Error Handling

Replace basic try-catch with enhanced error handling:

```tsx
// Before
try {
  const result = await apiCall()
} catch (error) {
  alert(error.message)
}

// After
const { executeWithErrorHandling } = useErrorHandling()

const result = await executeWithErrorHandling(
  () => apiCall(),
  { retryStrategy: 'api' }
)
```

### From Simple Validation

Replace basic validation with comprehensive form error handling:

```tsx
// Before
const [errors, setErrors] = useState({})

// After
const {
  validateField,
  getFieldError,
  isValid
} = useFormErrorHandling()
```

## Support

For questions or issues with the error handling system:

1. Check this documentation
2. Review existing error patterns in the codebase
3. Add new error codes to the error message service
4. Follow the established patterns for consistency

Remember: Good error handling is about helping users understand what went wrong and what they can do about it.